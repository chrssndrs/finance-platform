from datetime import date

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Response

from src.api.deps import get_db, get_write_db
from src.api.planning_berekening import bereken_inboedel_kosten_per_maand, bereken_planning_items
from src.api.planning_magic_berekening import bereken_magic_datum
from src.api.queries_planning import SQL_ITEM_BIJWERKEN, SQL_ITEM_INVOEGEN, SQL_ITEM_VERWIJDEREN
from src.api.schemas_planning import (
    InboedelKostenPerMaandPunt,
    InboedelKostenPerMaandResponse,
    MagicDatumResponse,
    PlanningItem,
    PlanningItemInvoer,
    PlanningResponse,
)

router = APIRouter(prefix="/api/planning")


@router.get("/items", response_model=PlanningResponse)
def get_items(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> PlanningResponse:
    return PlanningResponse(items=[PlanningItem(**post) for post in bereken_planning_items(con)])


@router.post("/items", response_model=PlanningItem)
def post_item(
    item: PlanningItemInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> PlanningItem:
    nieuw_id = con.execute(SQL_ITEM_INVOEGEN, item.model_dump()).fetchone()[0]
    return PlanningItem(
        **{**item.model_dump(), "id": nieuw_id, "bron": "handmatig", "artikel_id": None}
    )


@router.put("/items/{item_id}", response_model=PlanningItem)
def put_item(
    item_id: int,
    item: PlanningItemInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> PlanningItem:
    resultaat = con.execute(SQL_ITEM_BIJWERKEN, {**item.model_dump(), "id": item_id}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Planningspost niet gevonden.")
    return PlanningItem(
        **{**item.model_dump(), "id": item_id, "bron": "handmatig", "artikel_id": None}
    )


@router.get("/inboedel-per-maand", response_model=InboedelKostenPerMaandResponse)
def get_inboedel_per_maand(
    maanden_vooruit: int = 12, con: duckdb.DuckDBPyConnection = Depends(get_db)
) -> InboedelKostenPerMaandResponse:
    if maanden_vooruit <= 0:
        raise HTTPException(status_code=400, detail="maanden_vooruit moet groter dan 0 zijn.")
    resultaat = bereken_inboedel_kosten_per_maand(con, date.today(), maanden_vooruit)
    return InboedelKostenPerMaandResponse(maanden=[InboedelKostenPerMaandPunt(**p) for p in resultaat])


@router.get("/items/{item_id}/magic-datum", response_model=MagicDatumResponse)
def get_magic_datum(item_id: int, con: duckdb.DuckDBPyConnection = Depends(get_db)) -> MagicDatumResponse:
    resultaat = bereken_magic_datum(con, item_id)
    if not resultaat["gevonden"]:
        raise HTTPException(status_code=404, detail="Planningspost niet gevonden.")
    if not resultaat["is_uitgave"]:
        raise HTTPException(status_code=400, detail="Alleen voor uitgaven (negatief bedrag) te berekenen.")
    return MagicDatumResponse(
        haalbaar_op=resultaat["haalbaar_op"],
        nu_al_haalbaar=resultaat["nu_al_haalbaar"],
        huidig_liquide_vermogen=resultaat["huidig_liquide_vermogen"],
        gemiddeld_netto_maandelijks=resultaat["gemiddeld_netto_maandelijks"],
    )


@router.delete("/items/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Response:
    resultaat = con.execute(SQL_ITEM_VERWIJDEREN, {"id": item_id}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Planningspost niet gevonden.")
    return Response(status_code=204)
