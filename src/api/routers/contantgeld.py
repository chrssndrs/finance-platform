from datetime import date

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Response

from src.api.deps import get_db, get_write_db
from src.api.queries_contantgeld import (
    SQL_HISTORIE,
    SQL_HISTORIE_REGELS,
    SQL_LOCATIE_BIJWERKEN,
    SQL_LOCATIE_INVOEGEN,
    SQL_LOCATIE_OPHALEN,
    SQL_LOCATIE_VERWIJDEREN,
    SQL_LOCATIES,
    SQL_MUTATIE_INVOEGEN,
    SQL_MUTATIE_REGEL_INVOEGEN,
    SQL_VOORRAAD,
    SQL_VOORRAAD_TOTAAL_VOOR_LOCATIE,
    SQL_VOORRAAD_VOOR_COUPURE,
)
from src.api.schemas_contantgeld import (
    COUPURES,
    ContantGeldResponse,
    HistorieResponse,
    Locatie,
    LocatieInvoer,
    Mutatie,
    MutatieRegelUit,
    Telling,
    TellingCorrectie,
    UitgaveInvoer,
    VerplaatsingInvoer,
)
from src.pipeline.transacties import gold

router = APIRouter(prefix="/api/contantgeld")


def _voorraad_response(con: duckdb.DuckDBPyConnection) -> ContantGeldResponse:
    locatie_rijen = con.execute(SQL_LOCATIES).fetchall()
    voorraad_rijen = con.execute(SQL_VOORRAAD).fetchall()

    per_locatie: dict[int, dict[float, int]] = {}
    for locatie_id, coupure, aantal in voorraad_rijen:
        per_locatie.setdefault(locatie_id, {})[coupure] = aantal

    locaties = []
    for id_, naam in locatie_rijen:
        aantallen = per_locatie.get(id_, {})
        tellingen = [Telling(coupure=c, aantal=aantallen.get(c, 0)) for c in COUPURES]
        totaal = round(sum(t.coupure * t.aantal for t in tellingen), 2)
        locaties.append(Locatie(id=id_, naam=naam, tellingen=tellingen, totaal=totaal))

    totaal_algemeen = round(sum(l.totaal for l in locaties), 2)
    return ContantGeldResponse(coupures=COUPURES, locaties=locaties, totaal_algemeen=totaal_algemeen)


def _beschikbaar(con: duckdb.DuckDBPyConnection, locatie_id: int, coupure: float) -> int:
    rij = con.execute(SQL_VOORRAAD_VOOR_COUPURE, {"locatie_id": locatie_id, "coupure": coupure}).fetchone()
    return rij[0] if rij else 0


@router.get("", response_model=ContantGeldResponse)
def get_contantgeld(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> ContantGeldResponse:
    return _voorraad_response(con)


@router.get("/historie", response_model=HistorieResponse)
def get_historie(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> HistorieResponse:
    rijen = con.execute(SQL_HISTORIE).fetchall()
    regel_rijen = con.execute(SQL_HISTORIE_REGELS).fetchall()

    regels_per_mutatie: dict[int, list[MutatieRegelUit]] = {}
    for mutatie_id, coupure, aantal in regel_rijen:
        regels_per_mutatie.setdefault(mutatie_id, []).append(MutatieRegelUit(coupure=coupure, aantal=aantal))

    mutaties = [
        Mutatie(
            id=id_, type=type_, datum=datum, locatie_naam=locatie_naam,
            van_locatie_naam=van_naam, naar_locatie_naam=naar_naam,
            omschrijving=omschrijving, categorie=categorie, subcategorie=subcategorie,
            bedrag=bedrag, aangemaakt_op=aangemaakt_op, regels=regels_per_mutatie.get(id_, []),
        )
        for id_, type_, datum, locatie_naam, van_naam, naar_naam, omschrijving, categorie, subcategorie, bedrag, aangemaakt_op
        in rijen
    ]
    return HistorieResponse(mutaties=mutaties)


@router.post("/locaties", response_model=ContantGeldResponse)
def post_locatie(invoer: LocatieInvoer, con: duckdb.DuckDBPyConnection = Depends(get_write_db)) -> ContantGeldResponse:
    if not invoer.naam.strip():
        raise HTTPException(status_code=400, detail="Naam is verplicht.")
    con.execute(SQL_LOCATIE_INVOEGEN, {"naam": invoer.naam.strip()})
    return _voorraad_response(con)


@router.put("/locaties/{locatie_id}", response_model=ContantGeldResponse)
def put_locatie(
    locatie_id: int, invoer: LocatieInvoer, con: duckdb.DuckDBPyConnection = Depends(get_write_db)
) -> ContantGeldResponse:
    if not invoer.naam.strip():
        raise HTTPException(status_code=400, detail="Naam is verplicht.")
    resultaat = con.execute(SQL_LOCATIE_BIJWERKEN, {"id": locatie_id, "naam": invoer.naam.strip()}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Locatie niet gevonden.")
    return _voorraad_response(con)


@router.delete("/locaties/{locatie_id}", status_code=204)
def delete_locatie(locatie_id: int, con: duckdb.DuckDBPyConnection = Depends(get_write_db)) -> Response:
    if con.execute(SQL_LOCATIE_OPHALEN, {"id": locatie_id}).fetchone() is None:
        raise HTTPException(status_code=404, detail="Locatie niet gevonden.")
    totaal = con.execute(SQL_VOORRAAD_TOTAAL_VOOR_LOCATIE, {"locatie_id": locatie_id}).fetchone()[0]
    if abs(totaal) > 0.001:
        raise HTTPException(
            status_code=400,
            detail=f"Locatie bevat nog €{totaal:.2f} — verplaats of geef dit eerst uit voordat je de locatie verwijdert.",
        )
    con.execute(SQL_LOCATIE_VERWIJDEREN, {"id": locatie_id})
    return Response(status_code=204)


@router.put("/locaties/{locatie_id}/telling", response_model=ContantGeldResponse)
def put_telling(
    locatie_id: int, invoer: TellingCorrectie, con: duckdb.DuckDBPyConnection = Depends(get_write_db)
) -> ContantGeldResponse:
    rij = con.execute(SQL_LOCATIE_OPHALEN, {"id": locatie_id}).fetchone()
    if rij is None:
        raise HTTPException(status_code=404, detail="Locatie niet gevonden.")
    if invoer.coupure not in COUPURES:
        raise HTTPException(status_code=400, detail=f"Onbekende coupure: {invoer.coupure}")
    if invoer.aantal < 0:
        raise HTTPException(status_code=400, detail="Aantal mag niet negatief zijn.")

    naam = rij[1]
    delta = invoer.aantal - _beschikbaar(con, locatie_id, invoer.coupure)
    if delta != 0:
        mutatie_id = con.execute(SQL_MUTATIE_INVOEGEN, {
            "type": "telling", "datum": date.today(), "locatie_id": locatie_id, "locatie_naam": naam,
            "van_locatie_id": None, "van_locatie_naam": None, "naar_locatie_id": None, "naar_locatie_naam": None,
            "omschrijving": "Correctie", "categorie": None, "subcategorie": None,
            "bedrag": round(abs(delta) * invoer.coupure, 2),
        }).fetchone()[0]
        con.execute(SQL_MUTATIE_REGEL_INVOEGEN, {"mutatie_id": mutatie_id, "coupure": invoer.coupure, "aantal": delta})
    return _voorraad_response(con)


@router.post("/verplaatsen", response_model=ContantGeldResponse)
def post_verplaatsen(
    invoer: VerplaatsingInvoer, con: duckdb.DuckDBPyConnection = Depends(get_write_db)
) -> ContantGeldResponse:
    if invoer.van_locatie_id == invoer.naar_locatie_id:
        raise HTTPException(status_code=400, detail="Bron- en doellocatie moeten verschillen.")
    van = con.execute(SQL_LOCATIE_OPHALEN, {"id": invoer.van_locatie_id}).fetchone()
    naar = con.execute(SQL_LOCATIE_OPHALEN, {"id": invoer.naar_locatie_id}).fetchone()
    if van is None or naar is None:
        raise HTTPException(status_code=404, detail="Locatie niet gevonden.")

    regels = [r for r in invoer.regels if r.aantal > 0]
    if not regels:
        raise HTTPException(status_code=400, detail="Geen coupures opgegeven om te verplaatsen.")
    for regel in regels:
        if regel.coupure not in COUPURES:
            raise HTTPException(status_code=400, detail=f"Onbekende coupure: {regel.coupure}")
        beschikbaar = _beschikbaar(con, invoer.van_locatie_id, regel.coupure)
        if regel.aantal > beschikbaar:
            raise HTTPException(
                status_code=400,
                detail=f"Niet genoeg coupures van €{regel.coupure} op {van[1]} (beschikbaar: {beschikbaar}).",
            )

    bedrag = round(sum(r.coupure * r.aantal for r in regels), 2)
    mutatie_id = con.execute(SQL_MUTATIE_INVOEGEN, {
        "type": "verplaatsing", "datum": invoer.datum, "locatie_id": None, "locatie_naam": None,
        "van_locatie_id": invoer.van_locatie_id, "van_locatie_naam": van[1],
        "naar_locatie_id": invoer.naar_locatie_id, "naar_locatie_naam": naar[1],
        "omschrijving": invoer.omschrijving, "categorie": None, "subcategorie": None, "bedrag": bedrag,
    }).fetchone()[0]
    for regel in regels:
        con.execute(SQL_MUTATIE_REGEL_INVOEGEN, {"mutatie_id": mutatie_id, "coupure": regel.coupure, "aantal": regel.aantal})
    return _voorraad_response(con)


@router.post("/uitgeven", response_model=ContantGeldResponse)
def post_uitgeven(invoer: UitgaveInvoer, con: duckdb.DuckDBPyConnection = Depends(get_write_db)) -> ContantGeldResponse:
    if not invoer.omschrijving.strip():
        raise HTTPException(status_code=400, detail="Omschrijving is verplicht.")
    locatie = con.execute(SQL_LOCATIE_OPHALEN, {"id": invoer.locatie_id}).fetchone()
    if locatie is None:
        raise HTTPException(status_code=404, detail="Locatie niet gevonden.")

    regels = [r for r in invoer.regels if r.aantal > 0]
    if not regels:
        raise HTTPException(status_code=400, detail="Geen coupures opgegeven.")
    for regel in regels:
        if regel.coupure not in COUPURES:
            raise HTTPException(status_code=400, detail=f"Onbekende coupure: {regel.coupure}")
        beschikbaar = _beschikbaar(con, invoer.locatie_id, regel.coupure)
        if regel.aantal > beschikbaar:
            raise HTTPException(
                status_code=400,
                detail=f"Niet genoeg coupures van €{regel.coupure} op {locatie[1]} (beschikbaar: {beschikbaar}).",
            )

    bedrag = round(sum(r.coupure * r.aantal for r in regels), 2)
    mutatie_id = con.execute(SQL_MUTATIE_INVOEGEN, {
        "type": "uitgave", "datum": invoer.datum, "locatie_id": invoer.locatie_id, "locatie_naam": locatie[1],
        "van_locatie_id": None, "van_locatie_naam": None, "naar_locatie_id": None, "naar_locatie_naam": None,
        "omschrijving": invoer.omschrijving.strip(), "categorie": invoer.categorie, "subcategorie": invoer.subcategorie,
        "bedrag": bedrag,
    }).fetchone()[0]
    for regel in regels:
        con.execute(SQL_MUTATIE_REGEL_INVOEGEN, {"mutatie_id": mutatie_id, "coupure": regel.coupure, "aantal": regel.aantal})

    # Een uitgave telt mee in Uitgaven/rapportage (via gold.transacties_effectief,
    # zie gold.py) — die view wordt alleen tijdens een pipeline-run herbouwd, dus
    # zonder deze aanroep zou de uitgave pas na de nachtelijke cron zichtbaar
    # worden. Alleen de gold-stap is nodig (geen bronze/silver/koersen): die leest
    # rechtstreeks uit contantgeld.mutaties, niet uit een bankexport.
    gold.run_gold(con)

    return _voorraad_response(con)
