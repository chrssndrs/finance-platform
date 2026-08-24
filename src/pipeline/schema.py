import duckdb
import pandas as pd


def init_schemas(con: duckdb.DuckDBPyConnection) -> None:
    for naam in ("meta", "landing", "bronze", "silver", "gold", "inboedel", "abonnementen", "instellingen", "vastgoed", "beleggingen", "hypotheek", "overzicht", "planning"):
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
    # Staat de gebruiker toe aan te geven dat een artikel bij einde levensduur
    # niet vervangen gaat worden — de verwachte vervangingskosten vallen dan
    # weg uit de Planning-module (planning_berekening.py).
    con.execute("ALTER TABLE inboedel.artikelen ADD COLUMN IF NOT EXISTS wordt_vervangen BOOLEAN DEFAULT true")

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
    # Drempel voor wanneer een bijna-afgeschreven inboedel-artikel al in de
    # Planning-module verschijnt (zie planning_berekening.py).
    con.execute("ALTER TABLE instellingen.instellingen ADD COLUMN IF NOT EXISTS planning_drempel_modus VARCHAR DEFAULT 'maanden'")
    con.execute("ALTER TABLE instellingen.instellingen ADD COLUMN IF NOT EXISTS planning_drempel_waarde DOUBLE DEFAULT 3")

    # Eén woning (adres in de databank, niet in code — dat wordt gecommit;
    # zet 'm zelf via de Vastgoed-pagina).
    con.execute("""
        CREATE TABLE IF NOT EXISTS vastgoed.woning (
            id INTEGER PRIMARY KEY DEFAULT 1,
            adres VARCHAR NOT NULL DEFAULT '',
            aangepast_op TIMESTAMP
        )
    """)
    con.execute("""
        INSERT INTO vastgoed.woning (id, aangepast_op) VALUES (1, now())
        ON CONFLICT (id) DO NOTHING
    """)

    con.execute("CREATE SEQUENCE IF NOT EXISTS vastgoed.waardes_seq START 1")
    con.execute("""
        CREATE TABLE IF NOT EXISTS vastgoed.waardes (
            id INTEGER PRIMARY KEY DEFAULT nextval('vastgoed.waardes_seq'),
            datum DATE NOT NULL,
            waarde DECIMAL(12,2) NOT NULL,
            bron VARCHAR,
            opmerking VARCHAR,
            aangemaakt_op TIMESTAMP NOT NULL
        )
    """)

    con.execute("CREATE SEQUENCE IF NOT EXISTS beleggingen.transacties_seq START 1")
    con.execute("""
        CREATE TABLE IF NOT EXISTS beleggingen.transacties (
            id INTEGER PRIMARY KEY DEFAULT nextval('beleggingen.transacties_seq'),
            datum DATE NOT NULL,
            type VARCHAR NOT NULL,
            code VARCHAR NOT NULL,
            naam VARCHAR,
            aantal DECIMAL(18,6) NOT NULL,
            prijs_per_stuk DECIMAL(18,4) NOT NULL,
            valuta VARCHAR NOT NULL DEFAULT 'EUR',
            kosten DECIMAL(10,2),
            aangemaakt_op TIMESTAMP NOT NULL
        )
    """)

    # Gedeelde koers-cache (niet per transactie) — alle koersen die ooit voor
    # een code opgehaald zijn, incrementeel aangevuld door
    # src/pipeline/beleggingen/koersen.py.
    con.execute("""
        CREATE TABLE IF NOT EXISTS beleggingen.koersen (
            code VARCHAR NOT NULL,
            datum DATE NOT NULL,
            slotkoers DECIMAL(18,4) NOT NULL,
            PRIMARY KEY (code, datum)
        )
    """)

    # Eenheden `valuta` per 1 EUR — EUR-bedrag = bedrag_in_valuta / koers.
    con.execute("""
        CREATE TABLE IF NOT EXISTS beleggingen.wisselkoersen (
            valuta VARCHAR NOT NULL,
            datum DATE NOT NULL,
            koers DECIMAL(18,6) NOT NULL,
            PRIMARY KEY (valuta, datum)
        )
    """)

    con.execute("CREATE SEQUENCE IF NOT EXISTS hypotheek.leningdelen_seq START 1")
    con.execute("""
        CREATE TABLE IF NOT EXISTS hypotheek.leningdelen (
            id INTEGER PRIMARY KEY DEFAULT nextval('hypotheek.leningdelen_seq'),
            naam VARCHAR NOT NULL,
            type VARCHAR NOT NULL,
            hoofdsom DECIMAL(12,2) NOT NULL,
            rente_percentage DECIMAL(6,4) NOT NULL,
            startdatum DATE NOT NULL,
            looptijd_maanden INTEGER NOT NULL,
            rentevast_tot DATE,
            aangemaakt_op TIMESTAMP NOT NULL
        )
    """)

    # Eén handmatig bedrag — geen bron in de bankexport (aparte
    # spaarrekening, niet dit rekening-overzicht), dus net als
    # vastgoed.woning een singleton die je zelf bijwerkt.
    con.execute("""
        CREATE TABLE IF NOT EXISTS overzicht.sparen (
            id INTEGER PRIMARY KEY DEFAULT 1,
            bedrag DECIMAL(12,2) NOT NULL DEFAULT 0,
            aangepast_op TIMESTAMP
        )
    """)
    con.execute("""
        INSERT INTO overzicht.sparen (id, aangepast_op) VALUES (1, now())
        ON CONFLICT (id) DO NOTHING
    """)

    con.execute("CREATE SEQUENCE IF NOT EXISTS overzicht.widgets_seq START 1")
    con.execute("""
        CREATE TABLE IF NOT EXISTS overzicht.widgets (
            id INTEGER PRIMARY KEY DEFAULT nextval('overzicht.widgets_seq'),
            titel VARCHAR,
            categorie VARCHAR,
            subcategorie VARCHAR,
            afzender VARCHAR,
            granulariteit VARCHAR NOT NULL DEFAULT 'maand',
            periode_modus VARCHAR NOT NULL DEFAULT 'relatief',
            periode_aantal INTEGER,
            periode_eenheid VARCHAR,
            periode_vanaf DATE,
            periode_tot DATE,
            weergave VARCHAR NOT NULL DEFAULT 'totaal',
            volgorde INTEGER NOT NULL,
            aangemaakt_op TIMESTAMP NOT NULL
        )
    """)

    # Handmatig ingevoerde geplande in-/uitgaven — bedrag is signed (negatief
    # = uitgave, positief = inkomst). Inboedel-afgeleide planningsposten
    # worden live berekend (planning_berekening.py), niet hier opgeslagen.
    con.execute("CREATE SEQUENCE IF NOT EXISTS planning.items_seq START 1")
    con.execute("""
        CREATE TABLE IF NOT EXISTS planning.items (
            id INTEGER PRIMARY KEY DEFAULT nextval('planning.items_seq'),
            omschrijving VARCHAR NOT NULL,
            bedrag DECIMAL(12,2) NOT NULL,
            datum DATE NOT NULL,
            aangemaakt_op TIMESTAMP NOT NULL
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
