import logging
from dataclasses import dataclass
from pathlib import Path

import duckdb
import pandas as pd
import yaml

from src.pipeline.paths import CONFIG_ROOT

logger = logging.getLogger(__name__)

CATEGORISATIE_REGELS_PAD = CONFIG_ROOT / "categorisatie_regels.yaml"


@dataclass
class GoldResultaat:
    aantal_regels: int
    aantal_overrides: int
    aantal_transacties: int
    aantal_ongecategoriseerd: int


def run_gold(
    con: duckdb.DuckDBPyConnection,
    regels_pad: Path = CATEGORISATIE_REGELS_PAD,
) -> GoldResultaat:
    with open(regels_pad, "r", encoding="utf-8") as f:
        regels_config = yaml.safe_load(f)

    regels_df = pd.DataFrame(regels_config["regels"])
    regels_df.insert(0, "regel_id", range(1, len(regels_df) + 1))
    if "richting" not in regels_df.columns:
        regels_df["richting"] = None
    if "winkel" not in regels_df.columns:
        regels_df["winkel"] = None

    con.register("regels_temp", regels_df)
    con.execute("""
        CREATE OR REPLACE TABLE gold.categorisatie_regels AS
        SELECT regel_id, prioriteit, categorie, subcategorie, patroon, richting, winkel
        FROM regels_temp
    """)
    logger.info("gold.categorisatie_regels herladen (%d regels)", len(regels_df))

    bestaand_type = con.execute("""
        SELECT table_type FROM information_schema.tables
        WHERE table_schema = 'gold' AND table_name = 'transacties'
    """).fetchone()
    if bestaand_type is not None and bestaand_type[0] == "VIEW":
        con.execute("DROP VIEW gold.transacties")

    con.execute("""
        CREATE TABLE IF NOT EXISTS gold.categorie_overrides (
            transactie_id VARCHAR PRIMARY KEY,
            categorie VARCHAR,
            subcategorie VARCHAR,
            reden VARCHAR,
            aangemaakt_op TIMESTAMP
        )
    """)

    con.execute("""
        CREATE OR REPLACE TABLE gold.transacties AS
        WITH regel_matches AS (
            SELECT
                s.transactie_id,
                r.categorie,
                r.subcategorie,
                r.winkel,
                r.prioriteit,
                ROW_NUMBER() OVER (
                    PARTITION BY s.transactie_id
                    ORDER BY r.prioriteit ASC
                ) AS rn
            FROM silver.transacties s
            JOIN gold.categorisatie_regels r
                ON regexp_matches(
                    lower(s.naam_omschrijving || ' ' || coalesce(s.mededelingen, '') || ' ' || coalesce(s.tegenrekening, '')),
                    lower(r.patroon)
                )
                AND (
                    r.richting IS NULL
                    OR (r.richting = 'in' AND s.bedrag_eur > 0)
                    OR (r.richting = 'uit' AND s.bedrag_eur < 0)
                )
        ),
        beste_match AS (
            SELECT transactie_id, categorie, subcategorie, winkel
            FROM regel_matches
            WHERE rn = 1
        )
        SELECT
            s.*,
            COALESCE(o.categorie, b.categorie, 'Overig')               AS categorie,
            COALESCE(o.subcategorie, b.subcategorie, 'Ongecategoriseerd') AS subcategorie,
            (o.transactie_id IS NOT NULL)                                AS handmatig_overschreven,
            b.winkel                                                     AS winkel
        FROM silver.transacties s
        LEFT JOIN beste_match b ON b.transactie_id = s.transactie_id
        LEFT JOIN gold.categorie_overrides o ON o.transactie_id = s.transactie_id
    """)
    logger.info("gold.transacties tabel klaar")

    aantal_regels = con.execute("SELECT COUNT(*) FROM gold.categorisatie_regels").fetchone()[0]
    aantal_overrides = con.execute("SELECT COUNT(*) FROM gold.categorie_overrides").fetchone()[0]
    aantal_transacties = con.execute("SELECT COUNT(*) FROM gold.transacties").fetchone()[0]
    aantal_ongecategoriseerd = con.execute(
        "SELECT COUNT(*) FROM gold.transacties WHERE categorie = 'Overig'"
    ).fetchone()[0]

    return GoldResultaat(
        aantal_regels=aantal_regels,
        aantal_overrides=aantal_overrides,
        aantal_transacties=aantal_transacties,
        aantal_ongecategoriseerd=aantal_ongecategoriseerd,
    )


def zet_override(
    con: duckdb.DuckDBPyConnection,
    transactie_id: str,
    categorie: str,
    subcategorie: str,
    reden: str,
) -> None:
    con.execute("""
        INSERT INTO gold.categorie_overrides (transactie_id, categorie, subcategorie, reden, aangemaakt_op)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (transactie_id) DO UPDATE SET
            categorie = excluded.categorie,
            subcategorie = excluded.subcategorie,
            reden = excluded.reden,
            aangemaakt_op = excluded.aangemaakt_op
    """, [transactie_id, categorie, subcategorie, reden, pd.Timestamp.now()])
    logger.info(
        "Override gezet voor %s: %s / %s (roep run_gold() opnieuw aan om dit in gold.transacties te zien)",
        transactie_id, categorie, subcategorie,
    )
