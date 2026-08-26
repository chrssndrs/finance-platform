import duckdb
from fastapi import APIRouter, Depends, HTTPException, Response

from src.api.deps import get_db, get_write_db
from src.api.queries_overzicht import (
    SQL_WIDGET_BIJWERKEN,
    SQL_WIDGET_INVOEGEN,
    SQL_WIDGET_OPHALEN,
    SQL_WIDGET_VERWIJDEREN,
    SQL_WIDGETS,
)
from src.api.schemas_overzicht import (
    VermogenOnderdeel,
    VermogenPerMaandPunt,
    VermogenPerMaandResponse,
    VermogenResponse,
    Widget,
    WidgetenResponse,
    WidgetInvoer,
)
from src.api.vermogen_berekening import bereken_overzicht, bereken_totaal, bereken_vermogen_per_maand

router = APIRouter(prefix="/api/overzicht")


def _naar_widget(id_, titel, categorie, subcategorie, afzender, granulariteit, periode_modus,
                  periode_aantal, periode_eenheid, periode_vanaf, periode_tot, weergave, volgorde) -> Widget:
    return Widget(
        id=id_, titel=titel, categorie=categorie, subcategorie=subcategorie, afzender=afzender,
        granulariteit=granulariteit, periode_modus=periode_modus, periode_aantal=periode_aantal,
        periode_eenheid=periode_eenheid, periode_vanaf=periode_vanaf, periode_tot=periode_tot,
        weergave=weergave, volgorde=volgorde,
    )


@router.get("/vermogen", response_model=VermogenResponse)
def get_vermogen(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> VermogenResponse:
    onderdelen = bereken_overzicht(con)
    return VermogenResponse(
        totaal=round(bereken_totaal(onderdelen), 2),
        onderdelen=[VermogenOnderdeel(**{**o, "bedrag": round(o["bedrag"], 2)}) for o in onderdelen],
    )


@router.get("/vermogen-per-maand", response_model=VermogenPerMaandResponse)
def get_vermogen_per_maand(
    maanden: int = 12, con: duckdb.DuckDBPyConnection = Depends(get_db)
) -> VermogenPerMaandResponse:
    if maanden <= 0:
        raise HTTPException(status_code=400, detail="maanden moet groter dan 0 zijn.")
    return VermogenPerMaandResponse(
        maanden=[VermogenPerMaandPunt(**p) for p in bereken_vermogen_per_maand(con, maanden)]
    )


@router.get("/widgets", response_model=WidgetenResponse)
def get_widgets(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> WidgetenResponse:
    rijen = con.execute(SQL_WIDGETS).fetchall()
    return WidgetenResponse(widgets=[_naar_widget(*rij) for rij in rijen])


@router.post("/widgets", response_model=Widget)
def post_widget(
    widget: WidgetInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Widget:
    nieuw_id = con.execute(SQL_WIDGET_INVOEGEN, widget.model_dump()).fetchone()[0]
    rij = con.execute(SQL_WIDGET_OPHALEN, {"id": nieuw_id}).fetchone()
    return _naar_widget(*rij)


@router.put("/widgets/{widget_id}", response_model=Widget)
def put_widget(
    widget_id: int,
    widget: WidgetInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Widget:
    resultaat = con.execute(SQL_WIDGET_BIJWERKEN, {**widget.model_dump(), "id": widget_id}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Widget niet gevonden.")
    rij = con.execute(SQL_WIDGET_OPHALEN, {"id": widget_id}).fetchone()
    return _naar_widget(*rij)


@router.delete("/widgets/{widget_id}", status_code=204)
def delete_widget(
    widget_id: int,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Response:
    resultaat = con.execute(SQL_WIDGET_VERWIJDEREN, {"id": widget_id}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Widget niet gevonden.")
    return Response(status_code=204)
