import logging
from datetime import date

import duckdb
import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from src.api.beleggingen_berekening import bereken_portfolio_reeks, bereken_posities
from src.api.deps import get_db, get_write_db
from src.api.queries_beleggingen import (
    SQL_PORTEFEUILLE_BIJWERKEN,
    SQL_PORTEFEUILLE_INVOEGEN,
    SQL_PORTEFEUILLE_OPHALEN,
    SQL_PORTEFEUILLE_VERWIJDEREN,
    SQL_PORTEFEUILLES,
    SQL_TRANSACTIE_BIJWERKEN,
    SQL_TRANSACTIE_INVOEGEN,
    SQL_TRANSACTIE_OPHALEN,
    SQL_TRANSACTIE_VERWIJDEREN,
    SQL_TRANSACTIES,
    SQL_TRANSACTIES_VERWIJDEREN_VOOR_PORTEFEUILLE,
)
from src.api.schemas_beleggingen import (
    Portefeuille,
    PortefeuilleInvoer,
    PortefeuillesResponse,
    PortfolioPunt,
    PortfolioResponse,
    Positie,
    PositiesResponse,
    Transactie,
    TransactieInvoer,
    TransactiesResponse,
    ZoekResponse,
    ZoekResultaat,
)
from src.pipeline.beleggingen.koersen import USER_AGENT, ververs_koersen_voor_code

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/beleggingen")

ZOEK_URL = "https://query1.finance.yahoo.com/v1/finance/search"
# Alleen aandelen/ETF's/fondsen tonen — geen opties, valuta's, indices e.d.
TOEGESTANE_QUOTE_TYPES = {"EQUITY", "ETF", "MUTUALFUND", "INDEX"}


def _naar_transactie(id_, portefeuille_id, datum, type_, code, naam, aantal, prijs_per_stuk, valuta, kosten) -> Transactie:
    return Transactie(
        id=id_, portefeuille_id=portefeuille_id, datum=datum, type=type_, code=code, naam=naam, aantal=aantal,
        prijs_per_stuk=prijs_per_stuk, valuta=valuta, kosten=kosten,
    )


@router.get("/portefeuilles", response_model=PortefeuillesResponse)
def get_portefeuilles(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> PortefeuillesResponse:
    rijen = con.execute(SQL_PORTEFEUILLES).fetchall()
    return PortefeuillesResponse(portefeuilles=[Portefeuille(id=id_, naam=naam) for id_, naam in rijen])


@router.post("/portefeuilles", response_model=Portefeuille)
def post_portefeuille(
    portefeuille: PortefeuilleInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Portefeuille:
    if not portefeuille.naam.strip():
        raise HTTPException(status_code=400, detail="Naam mag niet leeg zijn.")
    nieuw_id = con.execute(SQL_PORTEFEUILLE_INVOEGEN, {"naam": portefeuille.naam.strip()}).fetchone()[0]
    return Portefeuille(id=nieuw_id, naam=portefeuille.naam.strip())


@router.put("/portefeuilles/{portefeuille_id}", response_model=Portefeuille)
def put_portefeuille(
    portefeuille_id: int,
    portefeuille: PortefeuilleInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Portefeuille:
    if not portefeuille.naam.strip():
        raise HTTPException(status_code=400, detail="Naam mag niet leeg zijn.")
    resultaat = con.execute(
        SQL_PORTEFEUILLE_BIJWERKEN, {"id": portefeuille_id, "naam": portefeuille.naam.strip()}
    ).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Portefeuille niet gevonden.")
    return Portefeuille(id=portefeuille_id, naam=portefeuille.naam.strip())


@router.delete("/portefeuilles/{portefeuille_id}", status_code=204)
def delete_portefeuille(portefeuille_id: int, con: duckdb.DuckDBPyConnection = Depends(get_write_db)) -> Response:
    if con.execute(SQL_PORTEFEUILLE_OPHALEN, {"id": portefeuille_id}).fetchone() is None:
        raise HTTPException(status_code=404, detail="Portefeuille niet gevonden.")
    con.execute(SQL_TRANSACTIES_VERWIJDEREN_VOOR_PORTEFEUILLE, {"portefeuille_id": portefeuille_id})
    con.execute(SQL_PORTEFEUILLE_VERWIJDEREN, {"id": portefeuille_id})
    return Response(status_code=204)


@router.get("/transacties", response_model=TransactiesResponse)
def get_transacties(
    portefeuille_id: int, con: duckdb.DuckDBPyConnection = Depends(get_db)
) -> TransactiesResponse:
    rijen = con.execute(SQL_TRANSACTIES, {"portefeuille_id": portefeuille_id}).fetchall()
    return TransactiesResponse(transacties=[_naar_transactie(*rij) for rij in rijen])


@router.post("/transacties", response_model=Transactie)
def post_transactie(
    transactie: TransactieInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Transactie:
    if transactie.type not in ("koop", "verkoop"):
        raise HTTPException(status_code=400, detail="type moet 'koop' of 'verkoop' zijn.")
    if con.execute(SQL_PORTEFEUILLE_OPHALEN, {"id": transactie.portefeuille_id}).fetchone() is None:
        raise HTTPException(status_code=404, detail="Portefeuille niet gevonden.")

    nieuw_id = con.execute(
        SQL_TRANSACTIE_INVOEGEN,
        {
            "portefeuille_id": transactie.portefeuille_id,
            "datum": transactie.datum, "type": transactie.type, "code": transactie.code,
            "naam": transactie.naam, "aantal": transactie.aantal, "prijs_per_stuk": transactie.prijs_per_stuk,
            "valuta": transactie.valuta, "kosten": transactie.kosten,
        },
    ).fetchone()[0]

    try:
        ververs_koersen_voor_code(con, transactie.code)
    except Exception:
        logger.warning("Koersen ophalen na nieuwe transactie mislukt voor %s", transactie.code, exc_info=True)

    rij = con.execute(SQL_TRANSACTIE_OPHALEN, {"id": nieuw_id}).fetchone()
    return _naar_transactie(*rij)


@router.put("/transacties/{transactie_id}", response_model=Transactie)
def put_transactie(
    transactie_id: int,
    transactie: TransactieInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Transactie:
    if transactie.type not in ("koop", "verkoop"):
        raise HTTPException(status_code=400, detail="type moet 'koop' of 'verkoop' zijn.")
    resultaat = con.execute(
        SQL_TRANSACTIE_BIJWERKEN,
        {
            "id": transactie_id, "datum": transactie.datum, "type": transactie.type, "code": transactie.code,
            "naam": transactie.naam, "aantal": transactie.aantal, "prijs_per_stuk": transactie.prijs_per_stuk,
            "valuta": transactie.valuta, "kosten": transactie.kosten,
        },
    ).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Transactie niet gevonden.")
    rij = con.execute(SQL_TRANSACTIE_OPHALEN, {"id": transactie_id}).fetchone()
    return _naar_transactie(*rij)


@router.delete("/transacties/{transactie_id}", status_code=204)
def delete_transactie(
    transactie_id: int,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Response:
    resultaat = con.execute(SQL_TRANSACTIE_VERWIJDEREN, {"id": transactie_id}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Transactie niet gevonden.")
    return Response(status_code=204)


@router.get("/zoek", response_model=ZoekResponse)
def get_zoek(q: str = Query(min_length=1)) -> ZoekResponse:
    try:
        response = requests.get(
            ZOEK_URL, params={"q": q, "quotesCount": 8, "newsCount": 0},
            headers={"User-Agent": USER_AGENT}, timeout=8,
        )
        response.raise_for_status()
        quotes = response.json().get("quotes", [])
    except requests.RequestException:
        logger.warning("Ticker-zoekopdracht mislukt voor %r", q, exc_info=True)
        return ZoekResponse(resultaten=[])

    resultaten = [
        ZoekResultaat(
            symbol=item["symbol"],
            naam=item.get("longname") or item.get("shortname") or item["symbol"],
            beurs=item.get("exchDisp") or item.get("exchange") or "",
        )
        for item in quotes
        if item.get("quoteType") in TOEGESTANE_QUOTE_TYPES and item.get("symbol")
    ]
    return ZoekResponse(resultaten=resultaten)


@router.get("/portfolio", response_model=PortfolioResponse)
def get_portfolio(
    portefeuille_id: int,
    code: str | None = None,
    vanaf: date | None = None,
    tot: date | None = None,
    con: duckdb.DuckDBPyConnection = Depends(get_db),
) -> PortfolioResponse:
    reeks = bereken_portfolio_reeks(con, portefeuille_id, code_filter=code, vanaf=vanaf, tot=tot)
    return PortfolioResponse(
        code=code,
        reeks=[PortfolioPunt(datum=datum, waarde=round(waarde, 2)) for datum, waarde in reeks],
    )


@router.get("/posities", response_model=PositiesResponse)
def get_posities(
    portefeuille_id: int | None = None, con: duckdb.DuckDBPyConnection = Depends(get_db)
) -> PositiesResponse:
    # Geen portefeuille_id: over alle portefeuilles samen (Overzicht-pagina
    # / totaal-vermogen) — de Beleggingen-pagina geeft altijd een specifieke
    # portefeuille_id mee, portefeuilles worden daar nooit samengevoegd.
    posities = bereken_posities(con, portefeuille_id)
    return PositiesResponse(posities=[Positie(**p) for p in posities])
