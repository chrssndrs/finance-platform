import duckdb
from fastapi import APIRouter, Depends, HTTPException, Response

from src.api.deps import get_db, get_write_db
from src.api.queries_vastgoed import (
    SQL_LOCATIE_BIJWERKEN,
    SQL_LOCATIE_INVOEGEN,
    SQL_LOCATIE_OPHALEN,
    SQL_LOCATIE_VERWIJDEREN,
    SQL_LOCATIES,
    SQL_WAARDE_BIJWERKEN,
    SQL_WAARDE_INVOEGEN,
    SQL_WAARDE_VERWIJDEREN,
    SQL_WAARDES,
    SQL_WAARDES_VERWIJDEREN_VOOR_LOCATIE,
)
from src.api.schemas_vastgoed import Locatie, LocatieInvoer, LocatiesResponse, Waarde, WaardeInvoer, WaardenResponse

router = APIRouter(prefix="/api/vastgoed")


@router.get("/locaties", response_model=LocatiesResponse)
def get_locaties(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> LocatiesResponse:
    rijen = con.execute(SQL_LOCATIES).fetchall()
    return LocatiesResponse(locaties=[Locatie(id=id_, adres=adres) for id_, adres in rijen])


@router.post("/locaties", response_model=Locatie)
def post_locatie(
    locatie: LocatieInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Locatie:
    if not locatie.adres.strip():
        raise HTTPException(status_code=400, detail="Adres mag niet leeg zijn.")
    nieuw_id = con.execute(SQL_LOCATIE_INVOEGEN, {"adres": locatie.adres.strip()}).fetchone()[0]
    return Locatie(id=nieuw_id, adres=locatie.adres.strip())


@router.put("/locaties/{locatie_id}", response_model=Locatie)
def put_locatie(
    locatie_id: int,
    locatie: LocatieInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Locatie:
    if not locatie.adres.strip():
        raise HTTPException(status_code=400, detail="Adres mag niet leeg zijn.")
    resultaat = con.execute(SQL_LOCATIE_BIJWERKEN, {"id": locatie_id, "adres": locatie.adres.strip()}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Locatie niet gevonden.")
    return Locatie(id=locatie_id, adres=locatie.adres.strip())


@router.delete("/locaties/{locatie_id}", status_code=204)
def delete_locatie(locatie_id: int, con: duckdb.DuckDBPyConnection = Depends(get_write_db)) -> Response:
    if con.execute(SQL_LOCATIE_OPHALEN, {"id": locatie_id}).fetchone() is None:
        raise HTTPException(status_code=404, detail="Locatie niet gevonden.")
    con.execute(SQL_WAARDES_VERWIJDEREN_VOOR_LOCATIE, {"locatie_id": locatie_id})
    con.execute(SQL_LOCATIE_VERWIJDEREN, {"id": locatie_id})
    return Response(status_code=204)


@router.get("/waardes", response_model=WaardenResponse)
def get_waardes(locatie_id: int, con: duckdb.DuckDBPyConnection = Depends(get_db)) -> WaardenResponse:
    rijen = con.execute(SQL_WAARDES, {"locatie_id": locatie_id}).fetchall()
    return WaardenResponse(
        waardes=[
            Waarde(id=id_, locatie_id=loc_id, datum=datum, waarde=waarde, bron=bron, opmerking=opmerking)
            for id_, loc_id, datum, waarde, bron, opmerking in rijen
        ]
    )


@router.post("/waardes", response_model=Waarde)
def post_waarde(
    waarde: WaardeInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Waarde:
    if con.execute(SQL_LOCATIE_OPHALEN, {"id": waarde.locatie_id}).fetchone() is None:
        raise HTTPException(status_code=404, detail="Locatie niet gevonden.")
    nieuw_id = con.execute(
        SQL_WAARDE_INVOEGEN,
        {
            "locatie_id": waarde.locatie_id, "datum": waarde.datum, "waarde": waarde.waarde,
            "bron": waarde.bron, "opmerking": waarde.opmerking,
        },
    ).fetchone()[0]
    return Waarde(
        id=nieuw_id, locatie_id=waarde.locatie_id, datum=waarde.datum, waarde=waarde.waarde,
        bron=waarde.bron, opmerking=waarde.opmerking,
    )


@router.put("/waardes/{waarde_id}", response_model=Waarde)
def put_waarde(
    waarde_id: int,
    waarde: WaardeInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Waarde:
    resultaat = con.execute(
        SQL_WAARDE_BIJWERKEN,
        {
            "id": waarde_id, "datum": waarde.datum, "waarde": waarde.waarde,
            "bron": waarde.bron, "opmerking": waarde.opmerking,
        },
    ).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Waarde niet gevonden.")
    locatie_id = resultaat[1]
    return Waarde(
        id=waarde_id, locatie_id=locatie_id, datum=waarde.datum, waarde=waarde.waarde,
        bron=waarde.bron, opmerking=waarde.opmerking,
    )


@router.delete("/waardes/{waarde_id}", status_code=204)
def delete_waarde(
    waarde_id: int,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Response:
    resultaat = con.execute(SQL_WAARDE_VERWIJDEREN, {"id": waarde_id}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Waarde niet gevonden.")
    return Response(status_code=204)
