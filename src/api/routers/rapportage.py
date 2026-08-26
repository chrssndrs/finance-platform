import json
from datetime import date
from itertools import groupby

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Query

from src.api.banksaldo_berekening import bereken_banksaldo
from src.api.deps import get_db, get_write_db
from src.pipeline.transacties.gold import zet_override
from src.api.queries import (
    GRANULARITEIT_NAAR_DUCKDB_EENHEID,
    SQL_AFZENDER_CATEGORIE_TOEPASSEN,
    SQL_AFZENDER_CATEGORIE_UPSERT,
    SQL_AFZENDERS,
    SQL_CATEGORIEEN,
    SQL_DATUM_BEREIK,
    SQL_ONGECATEGORISEERD,
    SQL_STATUS,
    SQL_TOTALEN,
    SQL_TRANSACTIE_CATEGORIE_TOEPASSEN,
    SQL_TRANSACTIE_DETAIL,
    SQL_TRANSACTIES,
    periode_starts_tussen,
)
from src.api.schemas import (
    AfzenderCategorieInvoer,
    AfzendersResponse,
    Banksaldo,
    CategorieenResponse,
    CategorieGroep,
    OngecategoriseerdAfzender,
    OngecategoriseerdResponse,
    PeriodeTotaal,
    StatusResponse,
    Transactie,
    TransactieDetail,
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

    return TotalenResponse(
        categorie=categorie,
        subcategorie=subcategorie,
        afzenders=afzenders,
        granulariteit=granulariteit,
        vanaf=vanaf,
        tot=tot,
        reeks=[
            PeriodeTotaal(periode_start=rij_periode_start, inkomsten=inkomsten, uitgaven=uitgaven, totaal=totaal)
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


@router.get("/transacties/{transactie_id}/detail", response_model=TransactieDetail)
def get_transactie_detail(
    transactie_id: str,
    con: duckdb.DuckDBPyConnection = Depends(get_db),
) -> TransactieDetail:
    rij = con.execute(SQL_TRANSACTIE_DETAIL, {"transactie_id": transactie_id}).fetchone()
    if rij is None:
        raise HTTPException(status_code=404, detail="Transactie niet gevonden.")
    (
        t_id, datum, naam_omschrijving, afzender, winkel, rekening, tegenrekening,
        mededelingen, bedrag_eur, saldo_na_mutatie, categorie, subcategorie,
        handmatig_overschreven, bronbestand, ruwe_rij_json,
    ) = rij
    return TransactieDetail(
        transactie_id=t_id,
        datum=datum,
        naam_omschrijving=naam_omschrijving,
        afzender=afzender,
        winkel=winkel,
        rekening=rekening,
        tegenrekening=tegenrekening,
        mededelingen=mededelingen,
        bedrag_eur=bedrag_eur,
        saldo_na_mutatie=saldo_na_mutatie,
        categorie=categorie,
        subcategorie=subcategorie,
        handmatig_overschreven=handmatig_overschreven,
        bronbestand=bronbestand,
        ruwe_rij=json.loads(ruwe_rij_json) if ruwe_rij_json else None,
    )


@router.put("/transacties/{transactie_id}/categorie", status_code=204)
def put_transactie_categorie(
    transactie_id: str,
    invoer: AfzenderCategorieInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> None:
    # transactie_id kan drie vormen hebben, afhankelijk van waar de rij
    # vandaan komt in gold.transacties_effectief (zie gold.py):
    #   - 'cash-<mutatie_id>'      -> synthetische rij uit contantgeld.mutaties
    #   - '<origineel>-regel-<id>' -> synthetische rij uit verzamelfacturen.regels
    #   - alles anders             -> een echte bankregel in gold.transacties
    # De eerste twee zijn géén rij in gold.transacties (dus zet_override/
    # UPDATE gold.transacties zou daar geruisloos niets doen) — de view leest
    # bij elke query live uit hun bron-tabel, dus die rechtstreeks bijwerken
    # is genoeg, geen pipeline-rerun nodig.
    if transactie_id.startswith("cash-"):
        mutatie_id = int(transactie_id.removeprefix("cash-"))
        resultaat = con.execute(
            "UPDATE contantgeld.mutaties SET categorie = $categorie, subcategorie = $subcategorie "
            "WHERE id = $id AND type = 'uitgave' RETURNING id",
            {"id": mutatie_id, "categorie": invoer.categorie, "subcategorie": invoer.subcategorie},
        ).fetchone()
    elif "-regel-" in transactie_id:
        regel_id = int(transactie_id.rsplit("-regel-", 1)[1])
        resultaat = con.execute(
            "UPDATE verzamelfacturen.regels SET categorie = $categorie, subcategorie = $subcategorie "
            "WHERE id = $id RETURNING id",
            {"id": regel_id, "categorie": invoer.categorie, "subcategorie": invoer.subcategorie},
        ).fetchone()
    else:
        resultaat = con.execute(
            SQL_TRANSACTIE_CATEGORIE_TOEPASSEN,
            {"transactie_id": transactie_id, "categorie": invoer.categorie, "subcategorie": invoer.subcategorie},
        ).fetchone()
        if resultaat is not None:
            zet_override(con, transactie_id, invoer.categorie, invoer.subcategorie, reden="handmatig via transactiedetail")

    if resultaat is None:
        raise HTTPException(status_code=404, detail="Transactie niet gevonden.")


@router.get("/ongecategoriseerd", response_model=OngecategoriseerdResponse)
def get_ongecategoriseerd(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> OngecategoriseerdResponse:
    rijen = con.execute(SQL_ONGECATEGORISEERD).fetchall()
    return OngecategoriseerdResponse(
        afzenders=[
            OngecategoriseerdAfzender(afzender=afzender, aantal=aantal, totaalbedrag=totaalbedrag)
            for afzender, aantal, totaalbedrag in rijen
        ]
    )


@router.put("/ongecategoriseerd/{afzender}", status_code=204)
def put_ongecategoriseerd(
    afzender: str,
    invoer: AfzenderCategorieInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> None:
    con.execute(
        SQL_AFZENDER_CATEGORIE_UPSERT,
        {"afzender": afzender, "categorie": invoer.categorie, "subcategorie": invoer.subcategorie},
    )
    con.execute(
        SQL_AFZENDER_CATEGORIE_TOEPASSEN,
        {"afzender": afzender, "categorie": invoer.categorie, "subcategorie": invoer.subcategorie},
    )
