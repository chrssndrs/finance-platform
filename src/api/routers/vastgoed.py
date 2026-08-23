import duckdb
from fastapi import APIRouter, Depends, HTTPException, Response

from src.api.deps import get_db, get_write_db
from src.api.queries_vastgoed import (
    SQL_WAARDE_BIJWERKEN,
    SQL_WAARDE_INVOEGEN,
    SQL_WAARDE_VERWIJDEREN,
    SQL_WAARDES,
    SQL_WONING_BIJWERKEN,
    SQL_WONING_OPHALEN,
)
from src.api.schemas_vastgoed import Waarde, WaardeInvoer, WaardenResponse, Woning, WoningInvoer

router = APIRouter(prefix="/api/vastgoed")


@router.get("/woning", response_model=Woning)
def get_woning(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> Woning:
    (adres,) = con.execute(SQL_WONING_OPHALEN).fetchone()
    return Woning(adres=adres)


@router.put("/woning", response_model=Woning)
def put_woning(
    woning: WoningInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Woning:
    if not woning.adres.strip():
        raise HTTPException(status_code=400, detail="Adres mag niet leeg zijn.")
    con.execute(SQL_WONING_BIJWERKEN, {"adres": woning.adres.strip()})
    return Woning(adres=woning.adres.strip())


@router.get("/waardes", response_model=WaardenResponse)
def get_waardes(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> WaardenResponse:
    rijen = con.execute(SQL_WAARDES).fetchall()
    return WaardenResponse(
        waardes=[Waarde(id=id_, datum=datum, waarde=waarde, bron=bron, opmerking=opmerking)
                 for id_, datum, waarde, bron, opmerking in rijen]
    )


@router.post("/waardes", response_model=Waarde)
def post_waarde(
    waarde: WaardeInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Waarde:
    nieuw_id = con.execute(
        SQL_WAARDE_INVOEGEN,
        {"datum": waarde.datum, "waarde": waarde.waarde, "bron": waarde.bron, "opmerking": waarde.opmerking},
    ).fetchone()[0]
    return Waarde(id=nieuw_id, datum=waarde.datum, waarde=waarde.waarde, bron=waarde.bron, opmerking=waarde.opmerking)


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
    return Waarde(id=waarde_id, datum=waarde.datum, waarde=waarde.waarde, bron=waarde.bron, opmerking=waarde.opmerking)


@router.delete("/waardes/{waarde_id}", status_code=204)
def delete_waarde(
    waarde_id: int,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Response:
    resultaat = con.execute(SQL_WAARDE_VERWIJDEREN, {"id": waarde_id}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Waarde niet gevonden.")
    return Response(status_code=204)
