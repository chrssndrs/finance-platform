import duckdb


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
