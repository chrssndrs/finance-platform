from datetime import date, timedelta

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Response

from src.api.deps import get_db, get_write_db
from src.api.queries_abonnementen import (
    INTERVAL_DAGEN,
    INTERVAL_NAAR_MAAND_FACTOR,
    SQL_AANBEVELING_AFHANDELEN,
    SQL_AANBEVELING_OPHALEN,
    SQL_AANBEVELINGEN,
    SQL_ABONNEMENT_BIJWERKEN,
    SQL_ABONNEMENT_INVOEGEN,
    SQL_ABONNEMENT_INVOEGEN_VAN_AANBEVELING,
    SQL_ABONNEMENT_OPHALEN,
    SQL_ABONNEMENT_PRIJS_BIJWERKEN,
    SQL_ABONNEMENT_VERWIJDEREN,
    SQL_ABONNEMENTEN,
)
from src.api.schemas_abonnementen import (
    Aanbeveling,
    AanbevelingenResponse,
    Abonnement,
    AbonnementenResponse,
    AbonnementInvoer,
)

router = APIRouter(prefix="/api/abonnementen")


def _naar_abonnement(
    id_: int, naam: str, afzender: str | None, categorie: str | None, subcategorie: str | None,
    bedrag: float, interval: str, logo_bestand: str | None, eerstvolgende_afschrijving: date,
    bron: str, vandaag: date,
) -> Abonnement:
    return Abonnement(
        id=id_,
        naam=naam,
        afzender=afzender,
        categorie=categorie,
        subcategorie=subcategorie,
        bedrag=bedrag,
        interval=interval,
        logo_url=f"/logos/{logo_bestand}" if logo_bestand else None,
        eerstvolgende_afschrijving=eerstvolgende_afschrijving,
        dagen_tot_afschrijving=(eerstvolgende_afschrijving - vandaag).days,
        bron=bron,
    )


@router.get("", response_model=AbonnementenResponse)
def get_abonnementen(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> AbonnementenResponse:
    rijen = con.execute(SQL_ABONNEMENTEN).fetchall()
    vandaag = date.today()
    abonnementen = [_naar_abonnement(*rij, vandaag=vandaag) for rij in rijen]
    totaal_per_maand = sum(a.bedrag * INTERVAL_NAAR_MAAND_FACTOR[a.interval] for a in abonnementen)
    return AbonnementenResponse(abonnementen=abonnementen, totaal_per_maand=round(totaal_per_maand, 2))


@router.post("", response_model=Abonnement)
def post_abonnement(
    abonnement: AbonnementInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Abonnement:
    nieuw_id = con.execute(
        SQL_ABONNEMENT_INVOEGEN,
        {
            "naam": abonnement.naam,
            "afzender": abonnement.afzender,
            "categorie": abonnement.categorie,
            "subcategorie": abonnement.subcategorie,
            "bedrag": abonnement.bedrag,
            "interval": abonnement.interval,
            "eerstvolgende_afschrijving": abonnement.eerstvolgende_afschrijving,
            "domein": abonnement.domein,
        },
    ).fetchone()[0]
    rij = con.execute(SQL_ABONNEMENT_OPHALEN, {"id": nieuw_id}).fetchone()
    return _naar_abonnement(*rij, vandaag=date.today())


@router.put("/{abonnement_id}", response_model=Abonnement)
def put_abonnement(
    abonnement_id: int,
    abonnement: AbonnementInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Abonnement:
    resultaat = con.execute(
        SQL_ABONNEMENT_BIJWERKEN,
        {
            "id": abonnement_id,
            "naam": abonnement.naam,
            "afzender": abonnement.afzender,
            "categorie": abonnement.categorie,
            "subcategorie": abonnement.subcategorie,
            "bedrag": abonnement.bedrag,
            "interval": abonnement.interval,
            "eerstvolgende_afschrijving": abonnement.eerstvolgende_afschrijving,
            "domein": abonnement.domein,
        },
    ).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Abonnement niet gevonden.")
    rij = con.execute(SQL_ABONNEMENT_OPHALEN, {"id": abonnement_id}).fetchone()
    return _naar_abonnement(*rij, vandaag=date.today())


@router.delete("/{abonnement_id}", status_code=204)
def delete_abonnement(
    abonnement_id: int,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Response:
    resultaat = con.execute(SQL_ABONNEMENT_VERWIJDEREN, {"id": abonnement_id}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Abonnement niet gevonden.")
    return Response(status_code=204)


@router.get("/aanbevelingen", response_model=AanbevelingenResponse)
def get_aanbevelingen(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> AanbevelingenResponse:
    rijen = con.execute(SQL_AANBEVELINGEN).fetchall()
    return AanbevelingenResponse(aanbevelingen=[
        Aanbeveling(
            id=id_, type=type_, afzender=afzender, naam=naam, categorie=categorie, subcategorie=subcategorie,
            logo_url=f"/logos/{logo_bestand}" if logo_bestand else None,
            huidig_bedrag=huidig_bedrag, voorgesteld_bedrag=voorgesteld_bedrag, interval=interval,
            eerstvolgende_afschrijving=eerstvolgende_afschrijving, aantal_transacties=aantal_transacties,
        )
        for (id_, type_, afzender, naam, categorie, subcategorie, logo_bestand, huidig_bedrag,
             voorgesteld_bedrag, interval, eerstvolgende_afschrijving, aantal_transacties) in rijen
    ])


@router.post("/aanbevelingen/{aanbeveling_id}/accepteren", status_code=204)
def post_aanbeveling_accepteren(
    aanbeveling_id: int,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Response:
    aanbeveling = con.execute(SQL_AANBEVELING_OPHALEN, {"id": aanbeveling_id}).fetchone()
    if aanbeveling is None:
        raise HTTPException(status_code=404, detail="Aanbeveling niet gevonden of al afgehandeld.")
    (_, type_, _afzender, abonnement_id, _naam, _categorie, _subcategorie,
     voorgesteld_bedrag, _interval, _eerste, laatste_afschrijving, _eerstvolgende, _aantal) = aanbeveling

    if type_ == "nieuw":
        con.execute(SQL_ABONNEMENT_INVOEGEN_VAN_AANBEVELING, {"id": aanbeveling_id})
    else:
        bestaand = con.execute(SQL_ABONNEMENT_OPHALEN, {"id": abonnement_id}).fetchone()
        if bestaand is None:
            raise HTTPException(status_code=404, detail="Gekoppeld abonnement bestaat niet meer.")
        interval = bestaand[6]
        eerstvolgende = laatste_afschrijving + timedelta(days=round(INTERVAL_DAGEN[interval]))
        con.execute(SQL_ABONNEMENT_PRIJS_BIJWERKEN, {
            "id": abonnement_id, "bedrag": voorgesteld_bedrag,
            "laatste_afschrijving": laatste_afschrijving, "eerstvolgende_afschrijving": eerstvolgende,
        })

    con.execute(SQL_AANBEVELING_AFHANDELEN, {"id": aanbeveling_id, "status": "geaccepteerd"})
    return Response(status_code=204)


@router.post("/aanbevelingen/{aanbeveling_id}/weigeren", status_code=204)
def post_aanbeveling_weigeren(
    aanbeveling_id: int,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Response:
    resultaat = con.execute(SQL_AANBEVELING_AFHANDELEN, {"id": aanbeveling_id, "status": "geweigerd"}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Aanbeveling niet gevonden of al afgehandeld.")
    return Response(status_code=204)
