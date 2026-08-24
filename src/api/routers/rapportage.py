from datetime import date
from itertools import groupby

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Query

from src.api.banksaldo_berekening import bereken_banksaldo
from src.api.deps import get_db
from src.api.planning_berekening import bereken_planning_items
from src.api.queries import (
    GRANULARITEIT_NAAR_DUCKDB_EENHEID,
    SQL_AFZENDERS,
    SQL_CATEGORIEEN,
    SQL_DATUM_BEREIK,
    SQL_STATUS,
    SQL_TOTALEN,
    SQL_TRANSACTIES,
    periode_start,
    periode_starts_tussen,
)
from src.api.schemas import (
    AfzendersResponse,
    Banksaldo,
    CategorieenResponse,
    CategorieGroep,
    PeriodeTotaal,
    StatusResponse,
    Transactie,
    TransactiesResponse,
    TotalenResponse,
)

router = APIRouter(prefix="/api/rapportage")


@router.get("/categorieen", response_model=CategorieenResponse)
def get_categorieen(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> CategorieenResponse:
    rijen = con.execute(SQL_CATEGORIEEN).fetchall()
    groepen = [
        CategorieGroep(categorie=categorie, subcategorieen=[s for _, s in groep])
        for categorie, groep in groupby(rijen, key=lambda r: r[0])
    ]
    return CategorieenResponse(categorieen=groepen)


@router.get("/afzenders", response_model=AfzendersResponse)
def get_afzenders(
    categorie: str | None = None,
    subcategorie: str | None = None,
    con: duckdb.DuckDBPyConnection = Depends(get_db),
) -> AfzendersResponse:
    rijen = con.execute(SQL_AFZENDERS, {"categorie": categorie, "subcategorie": subcategorie}).fetchall()
    return AfzendersResponse(afzenders=[r[0] for r in rijen])


@router.get("/status", response_model=StatusResponse)
def get_status(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> StatusResponse:
    laatste_refresh, laatste_transactie = con.execute(SQL_STATUS).fetchone()
    return StatusResponse(laatste_refresh=laatste_refresh, laatste_transactie=laatste_transactie)


@router.get("/banksaldo", response_model=Banksaldo)
def get_banksaldo(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> Banksaldo:
    return Banksaldo(**bereken_banksaldo(con))


@router.get("/totalen", response_model=TotalenResponse)
def get_totalen(
    categorie: str | None = None,
    subcategorie: str | None = None,
    afzenders: list[str] = Query(default=[]),
    granulariteit: str = Query(default="maand"),
    vanaf: date | None = None,
    tot: date | None = None,
    con: duckdb.DuckDBPyConnection = Depends(get_db),
) -> TotalenResponse:
    if subcategorie is not None and categorie is None:
        raise HTTPException(
            status_code=400,
            detail="subcategorie vereist dat categorie ook is opgegeven.",
        )
    if granulariteit not in GRANULARITEIT_NAAR_DUCKDB_EENHEID:
        raise HTTPException(
            status_code=400,
            detail="granulariteit moet dag, week, maand of jaar zijn.",
        )
    if vanaf is not None and tot is not None and vanaf > tot:
        raise HTTPException(status_code=400, detail="vanaf moet voor of gelijk aan tot liggen.")

    if vanaf is None or tot is None:
        min_datum, max_datum = con.execute(SQL_DATUM_BEREIK).fetchone()
        if min_datum is None:
            return TotalenResponse(
                categorie=categorie,
                subcategorie=subcategorie,
                afzenders=afzenders,
                granulariteit=granulariteit,
                vanaf=vanaf,
                tot=tot,
                reeks=[],
            )
        vanaf_effectief = vanaf or min_datum
        tot_effectief = tot or max_datum
    else:
        vanaf_effectief, tot_effectief = vanaf, tot

    starts = periode_starts_tussen(granulariteit, vanaf_effectief, tot_effectief)
    rijen = con.execute(
        SQL_TOTALEN,
        {
            "periode_starts": starts,
            "duckdb_eenheid": GRANULARITEIT_NAAR_DUCKDB_EENHEID[granulariteit],
            "categorie": categorie,
            "subcategorie": subcategorie,
            "afzenders": afzenders,
        },
    ).fetchall()

    # Geplande in-/uitgaven (handmatig + bijna-afgeschreven inboedel) horen
    # niet bij categorie/subcategorie/afzender — ze zijn geen bank-transactie
    # — maar tellen wel mee als eigen laag, gebucket op dezelfde perioden.
    # Filteren op periode-bucket (niet op het rauwe vanaf/tot-bereik): een
    # geplande post een paar dagen na "vandaag" hoort nog steeds bij de
    # lopende maand-bucket, ook al ligt tot_effectief (vaak "vandaag" of de
    # laatste transactiedatum) daar net vóór.
    zichtbare_buckets = set(starts)
    verwacht_per_periode: dict[date, dict[str, float]] = {}
    for post in bereken_planning_items(con):
        bucket = periode_start(post["datum"], granulariteit)
        if bucket not in zichtbare_buckets:
            continue
        slot = verwacht_per_periode.setdefault(bucket, {"inkomsten": 0.0, "uitgaven": 0.0})
        if post["bedrag"] >= 0:
            slot["inkomsten"] += post["bedrag"]
        else:
            slot["uitgaven"] += -post["bedrag"]

    return TotalenResponse(
        categorie=categorie,
        subcategorie=subcategorie,
        afzenders=afzenders,
        granulariteit=granulariteit,
        vanaf=vanaf,
        tot=tot,
        reeks=[
            PeriodeTotaal(
                periode_start=rij_periode_start,
                inkomsten=inkomsten,
                uitgaven=uitgaven,
                totaal=totaal,
                verwachte_inkomsten=round(verwacht_per_periode.get(rij_periode_start, {}).get("inkomsten", 0.0), 2),
                verwachte_uitgaven=round(verwacht_per_periode.get(rij_periode_start, {}).get("uitgaven", 0.0), 2),
            )
            for rij_periode_start, inkomsten, uitgaven, totaal in rijen
        ],
    )


@router.get("/transacties", response_model=TransactiesResponse)
def get_transacties(
    categorie: str | None = None,
    subcategorie: str | None = None,
    afzenders: list[str] = Query(default=[]),
    vanaf: date | None = None,
    tot: date | None = None,
    con: duckdb.DuckDBPyConnection = Depends(get_db),
) -> TransactiesResponse:
    if subcategorie is not None and categorie is None:
        raise HTTPException(
            status_code=400,
            detail="subcategorie vereist dat categorie ook is opgegeven.",
        )
    if vanaf is not None and tot is not None and vanaf > tot:
        raise HTTPException(status_code=400, detail="vanaf moet voor of gelijk aan tot liggen.")

    rijen = con.execute(
        SQL_TRANSACTIES,
        {
            "categorie": categorie,
            "subcategorie": subcategorie,
            "afzenders": afzenders,
            "vanaf": vanaf,
            "tot": tot,
        },
    ).fetchall()

    return TransactiesResponse(
        transacties=[
            Transactie(
                transactie_id=transactie_id,
                datum=datum,
                afzender=afzender_naam,
                bedrag_eur=bedrag_eur,
                mededelingen=mededelingen,
            )
            for transactie_id, datum, afzender_naam, bedrag_eur, mededelingen in rijen
        ]
    )
