import duckdb
import pandas as pd


def init_schemas(con: duckdb.DuckDBPyConnection) -> None:
    for naam in ("meta", "landing", "bronze", "silver", "gold"):
        con.execute(f"CREATE SCHEMA IF NOT EXISTS {naam}")

    con.execute("CREATE SEQUENCE IF NOT EXISTS meta.bestanden_log_seq START 1")

    con.execute("""
        CREATE TABLE IF NOT EXISTS meta.landing_bestanden_log (
            id INTEGER PRIMARY KEY DEFAULT nextval('meta.bestanden_log_seq'),
            bestandsnaam VARCHAR,
            content_hash VARCHAR UNIQUE,
            aantal_rijen INTEGER,
            verwerkt_op TIMESTAMP,
            status VARCHAR
        )
    """)

    con.execute("CREATE SEQUENCE IF NOT EXISTS meta.pipeline_runs_seq START 1")

    con.execute("""
        CREATE TABLE IF NOT EXISTS meta.pipeline_runs (
            id INTEGER PRIMARY KEY DEFAULT nextval('meta.pipeline_runs_seq'),
            gestart_op TIMESTAMP,
            afgerond_op TIMESTAMP,
            status VARCHAR,
            samenvatting VARCHAR
        )
    """)


def log_run(
    con: duckdb.DuckDBPyConnection,
    gestart_op: pd.Timestamp,
    status: str,
    samenvatting: str,
) -> None:
    con.execute(
        """INSERT INTO meta.pipeline_runs (gestart_op, afgerond_op, status, samenvatting)
           VALUES (?, ?, ?, ?)""",
        [gestart_op, pd.Timestamp.now(), status, samenvatting],
    )
