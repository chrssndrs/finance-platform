import duckdb
import pandas as pd


def init_schemas(con: duckdb.DuckDBPyConnection) -> None:
    for naam in ("meta", "landing", "bronze", "silver", "gold", "inboedel", "abonnementen", "instellingen"):
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

    # De geaccepteerde/handmatige abonnementen-lijst — vervangt de oude,
    # volledig herberekende gold.abonnementen. afzender NULL = puur
    # handmatig (geen koppeling aan banktransacties, bv. contant betaald).
    con.execute("CREATE SEQUENCE IF NOT EXISTS abonnementen.abonnementen_seq START 1")
    con.execute("""
        CREATE TABLE IF NOT EXISTS abonnementen.abonnementen (
            id INTEGER PRIMARY KEY DEFAULT nextval('abonnementen.abonnementen_seq'),
            afzender VARCHAR,
            naam VARCHAR NOT NULL,
            categorie VARCHAR,
            subcategorie VARCHAR,
            bedrag DECIMAL(10,2) NOT NULL,
            interval VARCHAR NOT NULL,
            eerste_afschrijving DATE,
            laatste_afschrijving DATE,
            eerstvolgende_afschrijving DATE NOT NULL,
            aantal_transacties INTEGER,
            domein VARCHAR,
            logo_bestand VARCHAR,
            bron VARCHAR NOT NULL DEFAULT 'handmatig',
            aangemaakt_op TIMESTAMP NOT NULL
        )
    """)

    # Openstaande/afgehandelde suggesties uit de detectie (nieuw abonnement
    # gevonden, of een prijswijziging bij een al-geaccepteerd abonnement).
    con.execute("CREATE SEQUENCE IF NOT EXISTS abonnementen.aanbevelingen_seq START 1")
    con.execute("""
        CREATE TABLE IF NOT EXISTS abonnementen.aanbevelingen (
            id INTEGER PRIMARY KEY DEFAULT nextval('abonnementen.aanbevelingen_seq'),
            type VARCHAR NOT NULL,
            afzender VARCHAR NOT NULL,
            abonnement_id INTEGER,
            naam VARCHAR,
            categorie VARCHAR,
            subcategorie VARCHAR,
            huidig_bedrag DECIMAL(10,2),
            voorgesteld_bedrag DECIMAL(10,2) NOT NULL,
            interval VARCHAR,
            eerste_afschrijving DATE,
            laatste_afschrijving DATE,
            eerstvolgende_afschrijving DATE,
            aantal_transacties INTEGER,
            status VARCHAR NOT NULL DEFAULT 'open',
            aangemaakt_op TIMESTAMP NOT NULL,
            afgehandeld_op TIMESTAMP
        )
    """)

    # Eén rij: welke bank-config (config/banken/{bank}.yaml) en welke
    # locatie (relatief aan de gemounte data-root) de pipeline gebruikt.
    con.execute("""
        CREATE TABLE IF NOT EXISTS instellingen.instellingen (
            id INTEGER PRIMARY KEY DEFAULT 1,
            bank VARCHAR NOT NULL DEFAULT 'ing',
            export_locatie VARCHAR NOT NULL DEFAULT 'data/landing/transacties/ing',
            aangepast_op TIMESTAMP
        )
    """)
    con.execute("""
        INSERT INTO instellingen.instellingen (id, aangepast_op) VALUES (1, now())
        ON CONFLICT (id) DO NOTHING
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
