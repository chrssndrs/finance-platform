import logging
import sys

import duckdb
import pandas as pd

from src.pipeline import schema
from src.pipeline.paths import DB_PAD
from src.pipeline.transacties import bronze, gold, silver

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("pipeline")


def main() -> int:
    gestart_op = pd.Timestamp.now()
    con = duckdb.connect(str(DB_PAD))
    try:
        schema.init_schemas(con)
        resultaten = {}

        logger.info("Start stap: bronze")
        try:
            resultaten["bronze"] = bronze.run_bronze(con)
        except Exception:
            logger.exception("Stap 'bronze' gefaald — pipeline gestopt (fail-fast)")
            schema.log_run(con, gestart_op, "gefaald", "bronze gefaald")
            return 1
        logger.info("Stap 'bronze' geslaagd: %s", resultaten["bronze"])

        if resultaten["bronze"].bestanden_verwerkt == 0:
            logger.info("Geen nieuwe bronze-data — silver overgeslagen (zou identieke output geven)")
        else:
            logger.info("Start stap: silver")
            try:
                resultaten["silver"] = silver.run_silver(con)
            except Exception:
                logger.exception("Stap 'silver' gefaald — pipeline gestopt (fail-fast)")
                schema.log_run(con, gestart_op, "gefaald", "silver gefaald")
                return 1
            logger.info("Stap 'silver' geslaagd: %s", resultaten["silver"])

        # Gold draait altijd, ook zonder nieuwe bronze-data: wijzigingen in
        # categorisatie_regels.yaml of een zet_override() moeten anders wachten
        # tot er toevallig weer een nieuw bankbestand binnenkomt.
        logger.info("Start stap: gold")
        try:
            resultaten["gold"] = gold.run_gold(con)
        except Exception:
            logger.exception("Stap 'gold' gefaald — pipeline gestopt (fail-fast)")
            schema.log_run(con, gestart_op, "gefaald", "gold gefaald")
            return 1
        logger.info("Stap 'gold' geslaagd: %s", resultaten["gold"])

        logger.info("Pipeline geslaagd. Samenvatting: %s", resultaten)
        schema.log_run(con, gestart_op, "geslaagd", str(resultaten))
        return 0
    finally:
        con.close()


if __name__ == "__main__":
    sys.exit(main())
