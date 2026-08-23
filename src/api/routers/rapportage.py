from datetime import date
from itertools import groupby

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Query

from src.api.deps import get_db
from src.api.queries import (
    GRANULARITEIT_NAAR_DUCKDB_EENHEID,
    INTERVAL_NAAR_MAAND_FACTOR,
    SQL_ABONNEMENTEN,
    SQL_AFZENDERS,
    SQL_CATEGORIEEN,
    SQL_DATUM_BEREIK,
    SQL_STATUS,
    SQL_TOTALEN,
    SQL_TRANSACTIES,
    periode_starts_tussen,
)
from src.api.schemas import (
    Abonnement,
    AbonnementenResponse,
    AfzendersResponse,
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


@router.get("/totalen", response_model=TotalenResponse)
def get_totalen(
    categorie: str | None = None,
    subcategorie: str | None = None,
    afzender: str | None = None,
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
                afzender=afzender,
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
            "afzender": afzender,
        },
    ).fetchall()

    return TotalenResponse(
        categorie=categorie,
        subcategorie=subcategorie,
        afzender=afzender,
        granulariteit=granulariteit,
        vanaf=vanaf,
        tot=tot,
        reeks=[
            PeriodeTotaal(periode_start=periode_start, inkomsten=inkomsten, uitgaven=uitgaven, totaal=totaal)
            for periode_start, inkomsten, uitgaven, totaal in rijen
        ],
    )


@router.get("/transacties", response_model=TransactiesResponse)
def get_transacties(
    categorie: str | None = None,
    subcategorie: str | None = None,
    afzender: str | None = None,
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
            "afzender": afzender,
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


@router.get("/abonnementen", response_model=AbonnementenResponse)
def get_abonnementen(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> AbonnementenResponse:
    rijen = con.execute(SQL_ABONNEMENTEN).fetchall()
    vandaag = date.today()

    abonnementen = [
        Abonnement(
            naam=naam,
            logo_url=f"/logos/{logo_bestand}" if logo_bestand else None,
            bedrag=bedrag,
            interval=interval,
            eerstvolgende_afschrijving=eerstvolgende_afschrijving,
            dagen_tot_afschrijving=(eerstvolgende_afschrijving - vandaag).days,
        )
        for naam, bedrag, interval, eerstvolgende_afschrijving, logo_bestand in rijen
    ]
    totaal_per_maand = sum(a.bedrag * INTERVAL_NAAR_MAAND_FACTOR[a.interval] for a in abonnementen)

    return AbonnementenResponse(abonnementen=abonnementen, totaal_per_maand=round(totaal_per_maand, 2))
