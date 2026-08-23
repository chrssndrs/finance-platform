import duckdb
import pandas as pd


def init_schemas(con: duckdb.DuckDBPyConnection) -> None:
    for naam in ("meta", "landing", "bronze", "silver", "gold", "inboedel"):
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

    # Geen bronze/silver/gold-medallion hier: inboedel komt niet uit een
    # bankexport, maar wordt rechtstreeks door de gebruiker beheerd (CSV-
    # eenmalige import + toevoegen via de frontend).
    con.execute("CREATE SEQUENCE IF NOT EXISTS inboedel.artikelen_seq START 1")

    con.execute("""
        CREATE TABLE IF NOT EXISTS inboedel.artikelen (
            id INTEGER PRIMARY KEY DEFAULT nextval('inboedel.artikelen_seq'),
            omschrijving VARCHAR NOT NULL,
            merk VARCHAR,
            model VARCHAR,
            winkel VARCHAR,
            bedrag DECIMAL(10,2),
            datum DATE,
            levensduur_maanden INTEGER,
            aangemaakt_op TIMESTAMP
        )
    """)
    # ALTER ... IF NOT EXISTS omdat de tabel hierboven al bestond vóór dit veld
    # werd toegevoegd — CREATE TABLE IF NOT EXISTS raakt een bestaande tabel niet aan.
    con.execute("ALTER TABLE inboedel.artikelen ADD COLUMN IF NOT EXISTS serienummer VARCHAR")


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
