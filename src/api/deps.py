import logging
from collections.abc import Iterator

import duckdb
from fastapi import HTTPException

from src.pipeline.paths import DB_PAD

logger = logging.getLogger(__name__)


def get_db() -> Iterator[duckdb.DuckDBPyConnection]:
    try:
        con = duckdb.connect(str(DB_PAD), read_only=True)
    except duckdb.IOException:
        logger.warning("Database is vergrendeld door de pipeline")
        raise HTTPException(
            status_code=503,
            detail="Database is momenteel bezig met de pipeline. Probeer het over een paar seconden opnieuw.",
        )
    try:
        yield con
    finally:
        con.close()


def get_write_db() -> Iterator[duckdb.DuckDBPyConnection]:
    """Voor schrijvende endpoints (bv. een inboedel-artikel toevoegen).
    DuckDB staat maar één schrijver tegelijk toe (en geen lezers ernaast) —
    kort-levende connectie per request, zelfde 503-bij-vergrendeling-patroon
    als get_db hierboven (nu ook mogelijk door een gelijktijdige lezer,
    niet alleen de pipeline)."""
    try:
        con = duckdb.connect(str(DB_PAD))
    except duckdb.IOException:
        logger.warning("Database is vergrendeld (pipeline of een andere aanvraag)")
        raise HTTPException(
            status_code=503,
            detail="Database is momenteel bezig. Probeer het over een paar seconden opnieuw.",
        )
    try:
        yield con
    finally:
        con.close()
