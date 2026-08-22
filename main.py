import logging
import sys

import duckdb

from src.pipeline import schema
from src.pipeline.paths import DB_PAD
from src.pipeline.transacties import bronze, gold, silver

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("pipeline")

STAPPEN = [
    ("bronze", bronze.run_bronze),
    ("silver", silver.run_silver),
    ("gold", gold.run_gold),
]


def main() -> int:
    con = duckdb.connect(str(DB_PAD))
    try:
        schema.init_schemas(con)

        resultaten = {}
        for naam, stap_fn in STAPPEN:
            logger.info("Start stap: %s", naam)
            try:
                resultaten[naam] = stap_fn(con)
            except Exception:
                logger.exception("Stap '%s' gefaald — pipeline gestopt (fail-fast)", naam)
                return 1
            logger.info("Stap '%s' geslaagd: %s", naam, resultaten[naam])

        logger.info("Pipeline geslaagd. Samenvatting: %s", resultaten)
        return 0
    finally:
        con.close()


if __name__ == "__main__":
    sys.exit(main())
