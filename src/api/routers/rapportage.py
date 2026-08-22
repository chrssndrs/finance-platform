from itertools import groupby

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Query

from src.api.deps import get_db
from src.api.queries import (
    GRANULARITEIT_NAAR_DUCKDB_EENHEID,
    SQL_CATEGORIEEN,
    SQL_STATUS,
    SQL_TOTALEN,
    SQL_WINKELS,
    periode_starts,
)
from src.api.schemas import (
    CategorieenResponse,
    CategorieGroep,
    PeriodeTotaal,
    StatusResponse,
    TotalenResponse,
    WinkelsResponse,
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


@router.get("/winkels", response_model=WinkelsResponse)
def get_winkels(
    categorie: str | None = None,
    subcategorie: str | None = None,
    con: duckdb.DuckDBPyConnection = Depends(get_db),
) -> WinkelsResponse:
    rijen = con.execute(SQL_WINKELS, {"categorie": categorie, "subcategorie": subcategorie}).fetchall()
    return WinkelsResponse(winkels=[r[0] for r in rijen])


@router.get("/status", response_model=StatusResponse)
def get_status(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> StatusResponse:
    laatste_refresh, laatste_transactie = con.execute(SQL_STATUS).fetchone()
    return StatusResponse(laatste_refresh=laatste_refresh, laatste_transactie=laatste_transactie)


@router.get("/totalen", response_model=TotalenResponse)
def get_totalen(
    categorie: str | None = None,
    subcategorie: str | None = None,
    winkel: str | None = None,
    granulariteit: str = Query(default="maand"),
    aantal: int = Query(default=6, ge=1, le=100),
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

    starts = periode_starts(granulariteit, aantal)
    rijen = con.execute(
        SQL_TOTALEN,
        {
            "periode_starts": starts,
            "duckdb_eenheid": GRANULARITEIT_NAAR_DUCKDB_EENHEID[granulariteit],
            "categorie": categorie,
            "subcategorie": subcategorie,
            "winkel": winkel,
        },
    ).fetchall()

    return TotalenResponse(
        categorie=categorie,
        subcategorie=subcategorie,
        winkel=winkel,
        granulariteit=granulariteit,
        aantal=aantal,
        reeks=[
            PeriodeTotaal(periode_start=periode_start, inkomsten=inkomsten, uitgaven=uitgaven, totaal=totaal)
            for periode_start, inkomsten, uitgaven, totaal in rijen
        ],
    )
