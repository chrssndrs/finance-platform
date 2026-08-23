import hashlib
import json
import logging
from dataclasses import dataclass
from datetime import datetime

import duckdb
import pandas as pd

from src.pipeline.bank_config import BankConfig, laad_bank_config

logger = logging.getLogger(__name__)


@dataclass
class SilverResultaat:
    rijen_bronze: int
    rijen_silver: int
    null_datum_of_bedrag: int


def _naar_silver_rij(ruwe_rij: str, cfg: BankConfig, transactie_id: str, rij_hash: str,
                      bronbestand: str, ingelezen_op) -> dict:
    ruwe = json.loads(ruwe_rij)

    datum = None
    bedrag_eur = None
    try:
        datum = datetime.strptime(ruwe[cfg.datum_kolom], cfg.datum_formaat).date()
    except (KeyError, ValueError, TypeError):
        pass
    try:
        bedrag_str = ruwe[cfg.bedrag_kolom].replace(cfg.bedrag_decimaal_teken, ".")
        bedrag_eur = float(bedrag_str)
        if ruwe.get(cfg.richting_kolom) == cfg.richting_negatief_waarde:
            bedrag_eur = -bedrag_eur
    except (KeyError, ValueError, TypeError, AttributeError):
        pass

    saldo_na_mutatie = None
    if cfg.saldo_kolom:
        try:
            saldo_na_mutatie = float(ruwe[cfg.saldo_kolom].replace(cfg.bedrag_decimaal_teken, "."))
        except (KeyError, ValueError, TypeError, AttributeError):
            pass

    return {
        "transactie_id": transactie_id,
        "datum": datum,
        "naam_omschrijving": (ruwe.get(cfg.omschrijving_kolom) or "").strip(),
        "rekening": (ruwe.get(cfg.rekening_kolom) or "").strip().upper(),
        "tegenrekening": (ruwe.get(cfg.tegenrekening_kolom) or "").strip().upper(),
        "mededelingen": (ruwe.get(cfg.mededelingen_kolom) or "").strip(),
        "bedrag_eur": bedrag_eur,
        "saldo_na_mutatie": saldo_na_mutatie,
        "rij_hash": rij_hash,
        "bronbestand": bronbestand,
        "ingelezen_op": ingelezen_op,
    }


def run_silver(con: duckdb.DuckDBPyConnection) -> SilverResultaat:
    rijen_bronze = con.execute("SELECT COUNT(*) FROM bronze.transacties").fetchone()[0]

    gededupliceerd = con.execute("""
        SELECT bank, ruwe_rij, rij_hash, bronbestand, ingelezen_op
        FROM (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY rij_hash ORDER BY ingelezen_op ASC) AS rn
            FROM bronze.transacties
        )
        WHERE rn = 1
    """).df()

    resultaat_rijen = []
    configs: dict[str, BankConfig] = {}
    for bank, groep in gededupliceerd.groupby("bank"):
        if bank not in configs:
            configs[bank] = laad_bank_config(bank)
        cfg = configs[bank]
        for rij in groep.itertuples(index=False):
            transactie_id = hashlib.md5(rij.rij_hash.encode("utf-8")).hexdigest()
            resultaat_rijen.append(_naar_silver_rij(
                rij.ruwe_rij, cfg, transactie_id, rij.rij_hash, rij.bronbestand, rij.ingelezen_op,
            ))

    resultaat_df = pd.DataFrame(resultaat_rijen, columns=[
        "transactie_id", "datum", "naam_omschrijving", "rekening", "tegenrekening",
        "mededelingen", "bedrag_eur", "saldo_na_mutatie", "rij_hash", "bronbestand", "ingelezen_op",
    ])
    if not resultaat_df.empty:
        resultaat_df["datum"] = pd.to_datetime(resultaat_df["datum"]).dt.date

    con.register("silver_temp", resultaat_df)
    con.execute("CREATE OR REPLACE TABLE silver.transacties AS SELECT * FROM silver_temp")
    con.unregister("silver_temp")
    logger.info("silver.transacties gebouwd")

    rijen_silver = con.execute("SELECT COUNT(*) FROM silver.transacties").fetchone()[0]
    null_datum_of_bedrag = con.execute(
        "SELECT COUNT(*) FROM silver.transacties WHERE datum IS NULL OR bedrag_eur IS NULL"
    ).fetchone()[0]

    return SilverResultaat(
        rijen_bronze=rijen_bronze,
        rijen_silver=rijen_silver,
        null_datum_of_bedrag=null_datum_of_bedrag,
    )
