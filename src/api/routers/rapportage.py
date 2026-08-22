from itertools import groupby

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Query

from src.api.deps import get_db
from src.api.queries import SQL_CATEGORIEEN, SQL_MAANDTOTALEN, maand_starts
from src.api.schemas import (
    CategorieenResponse,
    CategorieGroep,
    MaandTotaal,
    MaandTotalenResponse,
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


@router.get("/maandtotalen", response_model=MaandTotalenResponse)
def get_maandtotalen(
    categorie: str | None = None,
    subcategorie: str | None = None,
    maanden: int = Query(default=6, ge=1, le=60),
    con: duckdb.DuckDBPyConnection = Depends(get_db),
) -> MaandTotalenResponse:
    if subcategorie is not None and categorie is None:
        raise HTTPException(
            status_code=400,
            detail="subcategorie vereist dat categorie ook is opgegeven.",
        )

    starts = maand_starts(maanden)
    rijen = con.execute(
        SQL_MAANDTOTALEN,
        {"maand_starts": starts, "categorie": categorie, "subcategorie": subcategorie},
    ).fetchall()

    return MaandTotalenResponse(
        categorie=categorie,
        subcategorie=subcategorie,
        periode_maanden=maanden,
        reeks=[
            MaandTotaal(maand=maand, inkomsten=inkomsten, uitgaven=uitgaven, totaal=totaal)
            for maand, inkomsten, uitgaven, totaal in rijen
        ],
    )
