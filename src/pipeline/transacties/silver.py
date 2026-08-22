import logging
from dataclasses import dataclass

import duckdb

logger = logging.getLogger(__name__)


@dataclass
class SilverResultaat:
    rijen_bronze: int
    rijen_silver: int
    null_datum_of_bedrag: int


def run_silver(con: duckdb.DuckDBPyConnection) -> SilverResultaat:
    rijen_bronze = con.execute("SELECT COUNT(*) FROM bronze.transacties_ing").fetchone()[0]

    con.execute("""
        CREATE OR REPLACE TABLE silver.transacties AS
        WITH gededupliceerd AS (
            SELECT
                *,
                ROW_NUMBER() OVER (PARTITION BY rij_hash ORDER BY ingelezen_op ASC) AS rn
            FROM bronze.transacties_ing
        )
        SELECT
            md5(rij_hash)                                              AS transactie_id,
            strptime("Datum", '%Y%m%d')::DATE                        AS datum,
            trim("Naam / Omschrijving")                                AS naam_omschrijving,
            upper(trim("Rekening"))                                    AS rekening,
            upper(trim("Tegenrekening"))                                AS tegenrekening,
            trim("Code")                                                AS code,
            trim("Mutatiesoort")                                        AS mutatiesoort,
            trim("Mededelingen")                                        AS mededelingen,
            CASE
                WHEN "Af Bij" = 'Af' THEN -1 * CAST(REPLACE("Bedrag (EUR)", ',', '.') AS DECIMAL(18,2))
                ELSE CAST(REPLACE("Bedrag (EUR)", ',', '.') AS DECIMAL(18,2))
            END                                                          AS bedrag_eur,
            rij_hash,
            bronbestand,
            ingelezen_op
        FROM gededupliceerd
        WHERE rn = 1
    """)
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
