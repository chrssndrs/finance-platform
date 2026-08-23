from datetime import date

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Response

from src.api.deps import get_db, get_write_db
from src.api.queries_inboedel import (
    DAGEN_PER_MAAND,
    SQL_ARTIKEL_BIJWERKEN,
    SQL_ARTIKEL_INVOEGEN,
    SQL_ARTIKEL_VERWIJDEREN,
    SQL_ARTIKELEN,
    SQL_MERKEN,
    SQL_WINKELS,
)
from src.api.schemas_inboedel import (
    InboedelArtikel,
    InboedelArtikelenResponse,
    InboedelArtikelInvoer,
    InboedelOptiesResponse,
)

router = APIRouter(prefix="/api/inboedel")


def _naar_artikel(
    id_: int,
    omschrijving: str,
    merk: str | None,
    model: str | None,
    winkel: str | None,
    bedrag: float | None,
    datum: date | None,
    levensduur_maanden: int | None,
    serienummer: str | None,
    vandaag: date,
) -> InboedelArtikel:
    leeftijd_maanden = None
    percentage_leven = None
    restwaarde = None
    is_afgeschreven = False
    maanden_tot_afschrijving = None

    if datum is not None and levensduur_maanden is not None and levensduur_maanden > 0:
        leeftijd_dagen = (vandaag - datum).days
        levensduur_dagen = levensduur_maanden * DAGEN_PER_MAAND
        leeftijd_maanden = leeftijd_dagen / DAGEN_PER_MAAND
        percentage_leven = min(1.0, max(0.0, leeftijd_dagen / levensduur_dagen))
        is_afgeschreven = leeftijd_dagen >= levensduur_dagen
        maanden_tot_afschrijving = levensduur_maanden - leeftijd_maanden
        if bedrag is not None:
            restwaarde = round(bedrag * (1 - percentage_leven), 2)

    return InboedelArtikel(
        id=id_,
        omschrijving=omschrijving,
        merk=merk,
        model=model,
        winkel=winkel,
        bedrag=bedrag,
        datum=datum,
        levensduur_maanden=levensduur_maanden,
        serienummer=serienummer,
        leeftijd_maanden=leeftijd_maanden,
        percentage_leven=percentage_leven,
        restwaarde=restwaarde,
        is_afgeschreven=is_afgeschreven,
        maanden_tot_afschrijving=maanden_tot_afschrijving,
    )


@router.get("/artikelen", response_model=InboedelArtikelenResponse)
def get_artikelen(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> InboedelArtikelenResponse:
    rijen = con.execute(SQL_ARTIKELEN).fetchall()
    vandaag = date.today()
    return InboedelArtikelenResponse(
        artikelen=[_naar_artikel(*rij, vandaag=vandaag) for rij in rijen]
    )


@router.get("/opties", response_model=InboedelOptiesResponse)
def get_opties(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> InboedelOptiesResponse:
    merken = [r[0] for r in con.execute(SQL_MERKEN).fetchall()]
    winkels = [r[0] for r in con.execute(SQL_WINKELS).fetchall()]
    return InboedelOptiesResponse(merken=merken, winkels=winkels)


@router.post("/artikelen", response_model=InboedelArtikel)
def post_artikel(
    artikel: InboedelArtikelInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> InboedelArtikel:
    nieuw_id = con.execute(
        SQL_ARTIKEL_INVOEGEN,
        {
            "omschrijving": artikel.omschrijving,
            "merk": artikel.merk,
            "model": artikel.model,
            "winkel": artikel.winkel,
            "bedrag": artikel.bedrag,
            "datum": artikel.datum,
            "levensduur_maanden": artikel.levensduur_maanden,
            "serienummer": artikel.serienummer,
        },
    ).fetchone()[0]

    return _naar_artikel(
        nieuw_id,
        artikel.omschrijving,
        artikel.merk,
        artikel.model,
        artikel.winkel,
        artikel.bedrag,
        artikel.datum,
        artikel.levensduur_maanden,
        artikel.serienummer,
        vandaag=date.today(),
    )


@router.put("/artikelen/{artikel_id}", response_model=InboedelArtikel)
def put_artikel(
    artikel_id: int,
    artikel: InboedelArtikelInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> InboedelArtikel:
    resultaat = con.execute(
        SQL_ARTIKEL_BIJWERKEN,
        {
            "id": artikel_id,
            "omschrijving": artikel.omschrijving,
            "merk": artikel.merk,
            "model": artikel.model,
            "winkel": artikel.winkel,
            "bedrag": artikel.bedrag,
            "datum": artikel.datum,
            "levensduur_maanden": artikel.levensduur_maanden,
            "serienummer": artikel.serienummer,
        },
    ).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Artikel niet gevonden.")

    return _naar_artikel(
        artikel_id,
        artikel.omschrijving,
        artikel.merk,
        artikel.model,
        artikel.winkel,
        artikel.bedrag,
        artikel.datum,
        artikel.levensduur_maanden,
        artikel.serienummer,
        vandaag=date.today(),
    )


@router.delete("/artikelen/{artikel_id}", status_code=204)
def delete_artikel(
    artikel_id: int,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Response:
    resultaat = con.execute(SQL_ARTIKEL_VERWIJDEREN, {"id": artikel_id}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Artikel niet gevonden.")
    return Response(status_code=204)
