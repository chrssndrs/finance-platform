import logging
import sys

import duckdb

from src.pipeline.orchestrator import PipelineStapGefaald, run_pipeline
from src.pipeline.paths import DB_PAD

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


def main() -> int:
    con = duckdb.connect(str(DB_PAD))
    try:
        run_pipeline(con)
        return 0
    except PipelineStapGefaald:
        return 1
    finally:
        con.close()


if __name__ == "__main__":
    sys.exit(main())
