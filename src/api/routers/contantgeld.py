import duckdb
from fastapi import APIRouter, Depends, HTTPException, Response

from src.api.deps import get_db, get_write_db
from src.api.queries_contantgeld import (
    SQL_LOCATIE_BIJWERKEN,
    SQL_LOCATIE_INVOEGEN,
    SQL_LOCATIE_OPHALEN,
    SQL_LOCATIE_VERWIJDEREN,
    SQL_LOCATIES,
    SQL_TELLING_UPSERT,
    SQL_TELLINGEN,
    SQL_TELLINGEN_VERWIJDEREN_VOOR_LOCATIE,
)
from src.api.schemas_contantgeld import (
    COUPURES,
    ContantGeldResponse,
    Locatie,
    LocatieInvoer,
    Telling,
    TellingenInvoer,
)

router = APIRouter(prefix="/api/contantgeld")


def _naar_locatie(id_: int, naam: str, aantallen: dict[float, int]) -> Locatie:
    tellingen = [Telling(coupure=c, aantal=aantallen.get(c, 0)) for c in COUPURES]
    totaal = round(sum(t.coupure * t.aantal for t in tellingen), 2)
    return Locatie(id=id_, naam=naam, tellingen=tellingen, totaal=totaal)


@router.get("", response_model=ContantGeldResponse)
def get_contantgeld(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> ContantGeldResponse:
    locatie_rijen = con.execute(SQL_LOCATIES).fetchall()
    telling_rijen = con.execute(SQL_TELLINGEN).fetchall()

    aantallen_per_locatie: dict[int, dict[float, int]] = {}
    for locatie_id, coupure, aantal in telling_rijen:
        aantallen_per_locatie.setdefault(locatie_id, {})[coupure] = aantal

    locaties = [
        _naar_locatie(id_, naam, aantallen_per_locatie.get(id_, {}))
        for id_, naam in locatie_rijen
    ]
    totaal_algemeen = round(sum(l.totaal for l in locaties), 2)
    return ContantGeldResponse(coupures=COUPURES, locaties=locaties, totaal_algemeen=totaal_algemeen)


@router.post("/locaties", response_model=Locatie)
def post_locatie(
    invoer: LocatieInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Locatie:
    if not invoer.naam.strip():
        raise HTTPException(status_code=400, detail="Naam is verplicht.")
    nieuw_id = con.execute(SQL_LOCATIE_INVOEGEN, {"naam": invoer.naam.strip()}).fetchone()[0]
    return _naar_locatie(nieuw_id, invoer.naam.strip(), {})


@router.put("/locaties/{locatie_id}", response_model=Locatie)
def put_locatie(
    locatie_id: int,
    invoer: LocatieInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Locatie:
    if not invoer.naam.strip():
        raise HTTPException(status_code=400, detail="Naam is verplicht.")
    resultaat = con.execute(SQL_LOCATIE_BIJWERKEN, {"id": locatie_id, "naam": invoer.naam.strip()}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Locatie niet gevonden.")
    aantallen = dict(con.execute(
        "SELECT coupure::DOUBLE, aantal FROM contantgeld.tellingen WHERE locatie_id = $id", {"id": locatie_id}
    ).fetchall())
    return _naar_locatie(locatie_id, invoer.naam.strip(), aantallen)


@router.delete("/locaties/{locatie_id}", status_code=204)
def delete_locatie(
    locatie_id: int,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Response:
    con.execute(SQL_TELLINGEN_VERWIJDEREN_VOOR_LOCATIE, {"locatie_id": locatie_id})
    resultaat = con.execute(SQL_LOCATIE_VERWIJDEREN, {"id": locatie_id}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Locatie niet gevonden.")
    return Response(status_code=204)


@router.put("/locaties/{locatie_id}/tellingen", response_model=Locatie)
def put_tellingen(
    locatie_id: int,
    invoer: TellingenInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Locatie:
    rij = con.execute(SQL_LOCATIE_OPHALEN, {"id": locatie_id}).fetchone()
    if rij is None:
        raise HTTPException(status_code=404, detail="Locatie niet gevonden.")
    naam = rij[1]
    for telling in invoer.tellingen:
        if telling.coupure not in COUPURES:
            raise HTTPException(status_code=400, detail=f"Onbekende coupure: {telling.coupure}")
        if telling.aantal < 0:
            raise HTTPException(status_code=400, detail="Aantal mag niet negatief zijn.")
        con.execute(SQL_TELLING_UPSERT, {
            "locatie_id": locatie_id, "coupure": telling.coupure, "aantal": telling.aantal,
        })
    aantallen = dict(con.execute(
        "SELECT coupure::DOUBLE, aantal FROM contantgeld.tellingen WHERE locatie_id = $id", {"id": locatie_id}
    ).fetchall())
    return _naar_locatie(locatie_id, naam, aantallen)
