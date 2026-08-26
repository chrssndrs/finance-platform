from datetime import date

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Response

from src.api.deps import get_db, get_write_db
from src.api.hypotheek_berekening import Leningdeel as LeningdeelBerekening
from src.api.hypotheek_berekening import actuele_schuld_totaal, bereken_verloop, resterende_schuld
from src.api.queries_hypotheek import (
    SQL_LENINGDEEL_BIJWERKEN,
    SQL_LENINGDEEL_INVOEGEN,
    SQL_LENINGDEEL_OPHALEN,
    SQL_LENINGDEEL_VERWIJDEREN,
    SQL_LENINGDELEN,
)
from src.api.schemas_hypotheek import Leningdeel, LeningdelenResponse, LeningdeelInvoer, SchuldPunt, SchuldResponse

router = APIRouter(prefix="/api/hypotheek")

GELDIGE_TYPES = {"annuiteit", "lineair", "aflossingsvrij"}


def _naar_leningdeel(id_, locatie_id, naam, type_, hoofdsom, rente_percentage, startdatum, looptijd_maanden, rentevast_tot) -> Leningdeel:
    berekening = LeningdeelBerekening(
        id=id_, naam=naam, type=type_, hoofdsom=hoofdsom, rente_percentage=rente_percentage,
        startdatum=startdatum, looptijd_maanden=looptijd_maanden, rentevast_tot=rentevast_tot,
    )
    return Leningdeel(
        id=id_, locatie_id=locatie_id, naam=naam, type=type_, hoofdsom=hoofdsom, rente_percentage=rente_percentage,
        startdatum=startdatum, looptijd_maanden=looptijd_maanden, rentevast_tot=rentevast_tot,
        actuele_schuld=round(resterende_schuld(berekening, date.today()), 2),
    )


def _valideer(leningdeel: LeningdeelInvoer) -> None:
    if leningdeel.type not in GELDIGE_TYPES:
        raise HTTPException(status_code=400, detail=f"type moet één van {sorted(GELDIGE_TYPES)} zijn.")
    if leningdeel.hoofdsom <= 0:
        raise HTTPException(status_code=400, detail="Hoofdsom moet groter dan 0 zijn.")
    if leningdeel.looptijd_maanden <= 0:
        raise HTTPException(status_code=400, detail="Looptijd moet groter dan 0 zijn.")


@router.get("/leningdelen", response_model=LeningdelenResponse)
def get_leningdelen(
    locatie_id: int | None = None, con: duckdb.DuckDBPyConnection = Depends(get_db)
) -> LeningdelenResponse:
    rijen = con.execute(SQL_LENINGDELEN, {"locatie_id": locatie_id}).fetchall()
    return LeningdelenResponse(leningdelen=[_naar_leningdeel(*rij) for rij in rijen])


@router.post("/leningdelen", response_model=Leningdeel)
def post_leningdeel(
    leningdeel: LeningdeelInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Leningdeel:
    _valideer(leningdeel)
    nieuw_id = con.execute(
        SQL_LENINGDEEL_INVOEGEN,
        {
            "locatie_id": leningdeel.locatie_id,
            "naam": leningdeel.naam, "type": leningdeel.type, "hoofdsom": leningdeel.hoofdsom,
            "rente_percentage": leningdeel.rente_percentage, "startdatum": leningdeel.startdatum,
            "looptijd_maanden": leningdeel.looptijd_maanden, "rentevast_tot": leningdeel.rentevast_tot,
        },
    ).fetchone()[0]
    rij = con.execute(SQL_LENINGDEEL_OPHALEN, {"id": nieuw_id}).fetchone()
    return _naar_leningdeel(*rij)


@router.put("/leningdelen/{leningdeel_id}", response_model=Leningdeel)
def put_leningdeel(
    leningdeel_id: int,
    leningdeel: LeningdeelInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Leningdeel:
    _valideer(leningdeel)
    resultaat = con.execute(
        SQL_LENINGDEEL_BIJWERKEN,
        {
            "id": leningdeel_id, "locatie_id": leningdeel.locatie_id,
            "naam": leningdeel.naam, "type": leningdeel.type, "hoofdsom": leningdeel.hoofdsom,
            "rente_percentage": leningdeel.rente_percentage, "startdatum": leningdeel.startdatum,
            "looptijd_maanden": leningdeel.looptijd_maanden, "rentevast_tot": leningdeel.rentevast_tot,
        },
    ).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Leningdeel niet gevonden.")
    rij = con.execute(SQL_LENINGDEEL_OPHALEN, {"id": leningdeel_id}).fetchone()
    return _naar_leningdeel(*rij)


@router.delete("/leningdelen/{leningdeel_id}", status_code=204)
def delete_leningdeel(
    leningdeel_id: int,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Response:
    resultaat = con.execute(SQL_LENINGDEEL_VERWIJDEREN, {"id": leningdeel_id}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Leningdeel niet gevonden.")
    return Response(status_code=204)


@router.get("/verloop", response_model=SchuldResponse)
def get_verloop(
    locatie_id: int | None = None, con: duckdb.DuckDBPyConnection = Depends(get_db)
) -> SchuldResponse:
    reeks = bereken_verloop(con, locatie_id)
    return SchuldResponse(
        reeks=[SchuldPunt(datum=datum, schuld=round(schuld, 2)) for datum, schuld in reeks],
        actuele_schuld_totaal=round(actuele_schuld_totaal(con, locatie_id=locatie_id), 2),
    )
