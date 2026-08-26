import duckdb
import pandas as pd
import yaml

from src.pipeline.paths import CONFIG_ROOT


def init_schemas(con: duckdb.DuckDBPyConnection) -> None:
    for naam in ("meta", "landing", "bronze", "silver", "gold", "inboedel", "abonnementen", "instellingen", "vastgoed", "beleggingen", "hypotheek", "overzicht", "planning", "verzamelfacturen", "contantgeld"):
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

    # Eén rij met overige instellingen. bank/export_locatie stonden hier
    # ooit (één actieve bank) — vervangen door instellingen.banken
    # hieronder (meerdere banken tegelijk), de kolommen worden verderop in
    # deze functie weggehaald op een al-bestaande db.
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
    # Locatie voor geüploade verzamelfacturen (bv. creditcard/bol.com), zie
    # verzamelfacturen_berekening.py — analoog aan export_locatie.
    con.execute("ALTER TABLE instellingen.instellingen ADD COLUMN IF NOT EXISTS verzamelfacturen_locatie VARCHAR DEFAULT 'data/landing/verzamelfacturen'")
    # Na hoeveel dagen zonder nieuwe transactie de rode "data is oud"-banner verschijnt.
    con.execute("ALTER TABLE instellingen.instellingen ADD COLUMN IF NOT EXISTS data_te_oud_na_dagen DOUBLE DEFAULT 7")
    # Aantal maanden voor het voortschrijdend gemiddelde (trendlijn) in de grafieken.
    con.execute("ALTER TABLE instellingen.instellingen ADD COLUMN IF NOT EXISTS trend_venster_maanden INTEGER DEFAULT 3")

    # Dynamisch geregistreerde banken — vervangt de statische config/banken/*.yaml
    # + het enkele bank/export_locatie-veld hierboven. Elke bank heeft zijn eigen
    # landingsmap; de pipeline scant ze allemaal (zie bronze.py). Zie
    # bank_config.py voor hoe deze rijen naar BankConfig-objecten worden.
    con.execute("""
        CREATE TABLE IF NOT EXISTS instellingen.banken (
            bank VARCHAR PRIMARY KEY,
            naam VARCHAR NOT NULL,
            locatie VARCHAR NOT NULL,
            separator VARCHAR NOT NULL,
            datum_kolom VARCHAR NOT NULL,
            datum_formaat VARCHAR NOT NULL,
            omschrijving_kolom VARCHAR NOT NULL,
            rekening_kolom VARCHAR NOT NULL,
            tegenrekening_kolom VARCHAR,
            bedrag_kolom VARCHAR NOT NULL,
            bedrag_decimaal_teken VARCHAR NOT NULL,
            richting_kolom VARCHAR,
            richting_negatief_waarde VARCHAR,
            mededelingen_kolom VARCHAR,
            saldo_kolom VARCHAR,
            laatst_gebruikt_op TIMESTAMP,
            aangemaakt_op TIMESTAMP NOT NULL
        )
    """)
    # Onderscheidt spaarrekeningen van betaalrekeningen — bepaalt of een
    # geregistreerde bank meetelt in de Sparen-module (zie sparen_berekening.py)
    # i.p.v. als gewone uitgaven-rekening. Bestaande banken (zoals de
    # ING-migratie hieronder) zijn per definitie een betaalrekening.
    con.execute("ALTER TABLE instellingen.banken ADD COLUMN IF NOT EXISTS rekening_type VARCHAR DEFAULT 'betaalrekening'")

    # Eenmalige migratie: als er nog geen banken geregistreerd zijn en de oude
    # config/banken/ing.yaml bestaat nog, zaai 'm met die config + de huidige
    # bank/export_locatie-waarden — zodat een al werkende ING-koppeling niet
    # stukgaat en niet opnieuw via de wizard hoeft.
    if con.execute("SELECT COUNT(*) FROM instellingen.banken").fetchone()[0] == 0:
        ing_yaml_pad = CONFIG_ROOT / "banken" / "ing.yaml"
        if ing_yaml_pad.exists():
            with open(ing_yaml_pad, "r", encoding="utf-8") as f:
                ing_config = yaml.safe_load(f)
            huidige_bank, huidige_locatie = con.execute(
                "SELECT bank, export_locatie FROM instellingen.instellingen WHERE id = 1"
            ).fetchone()
            con.execute("""
                INSERT INTO instellingen.banken (
                    bank, naam, locatie, separator, datum_kolom, datum_formaat,
                    omschrijving_kolom, rekening_kolom, tegenrekening_kolom,
                    bedrag_kolom, bedrag_decimaal_teken, richting_kolom,
                    richting_negatief_waarde, mededelingen_kolom, saldo_kolom,
                    aangemaakt_op
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
            """, [
                huidige_bank, ing_config["naam"], huidige_locatie, ing_config["separator"],
                ing_config["datum_kolom"], ing_config["datum_formaat"], ing_config["omschrijving_kolom"],
                ing_config["rekening_kolom"], ing_config.get("tegenrekening_kolom"),
                ing_config["bedrag_kolom"], ing_config["bedrag_decimaal_teken"],
                ing_config.get("richting_kolom"), ing_config.get("richting_negatief_waarde"),
                ing_config.get("mededelingen_kolom"), ing_config.get("saldo_kolom"),
            ])

    # bank/export_locatie zijn vervangen door instellingen.banken (hierboven) —
    # ALTER ... DROP COLUMN IF EXISTS zodat dit op een al-gemigreerde db niets doet.
    con.execute("ALTER TABLE instellingen.instellingen DROP COLUMN IF EXISTS bank")
    con.execute("ALTER TABLE instellingen.instellingen DROP COLUMN IF EXISTS export_locatie")

    # Meerdere panden i.p.v. één vaste woning — locaties zelf toe te voegen
    # via de Vastgoed-pagina (adres in de databank, niet in code).
    con.execute("CREATE SEQUENCE IF NOT EXISTS vastgoed.locaties_seq START 1")
    con.execute("""
        CREATE TABLE IF NOT EXISTS vastgoed.locaties (
            id INTEGER PRIMARY KEY DEFAULT nextval('vastgoed.locaties_seq'),
            adres VARCHAR NOT NULL,
            aangemaakt_op TIMESTAMP NOT NULL
        )
    """)

    con.execute("CREATE SEQUENCE IF NOT EXISTS vastgoed.waardes_seq START 1")
    con.execute("""
        CREATE TABLE IF NOT EXISTS vastgoed.waardes (
            id INTEGER PRIMARY KEY DEFAULT nextval('vastgoed.waardes_seq'),
            locatie_id INTEGER,
            datum DATE NOT NULL,
            waarde DECIMAL(12,2) NOT NULL,
            bron VARCHAR,
            opmerking VARCHAR,
            aangemaakt_op TIMESTAMP NOT NULL
        )
    """)
    # locatie_id bestond niet vóór de overstap naar meerdere panden — op een
    # al-bestaande tabel raakt CREATE TABLE IF NOT EXISTS de kolom niet aan.
    con.execute("ALTER TABLE vastgoed.waardes ADD COLUMN IF NOT EXISTS locatie_id INTEGER")

    # Eenmalige migratie: de oude enkele-woning-singleton (vastgoed.woning)
    # wordt de eerste rij in vastgoed.locaties, en alle bestaande waardes
    # (die voorheen impliciet bij "de" woning hoorden) krijgen die locatie_id
    # — zodat een al ingevulde woning/waardegeschiedenis niet verdwijnt.
    if con.execute("SELECT COUNT(*) FROM vastgoed.locaties").fetchone()[0] == 0:
        oude_woning_tabel_bestaat = con.execute(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'vastgoed' AND table_name = 'woning'"
        ).fetchone()[0] > 0
        if oude_woning_tabel_bestaat:
            rij = con.execute("SELECT adres FROM vastgoed.woning WHERE id = 1").fetchone()
            if rij is not None and rij[0].strip():
                nieuwe_id = con.execute(
                    "INSERT INTO vastgoed.locaties (adres, aangemaakt_op) VALUES ($adres, now()) RETURNING id",
                    {"adres": rij[0].strip()},
                ).fetchone()[0]
                con.execute(
                    "UPDATE vastgoed.waardes SET locatie_id = $id WHERE locatie_id IS NULL",
                    {"id": nieuwe_id},
                )
    con.execute("DROP TABLE IF EXISTS vastgoed.woning")

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

    # Eén handmatig restbedrag, als aanvulling op de Sparen-module (zie
    # sparen_berekening.py) voor spaargeld dat niet als bank geregistreerd
    # is — een singleton die je zelf bijwerkt via de Sparen-pagina.
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
            weergave VARCHAR NOT NULL DEFAULT 'grafiek',
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
            datum DATE,
            aangemaakt_op TIMESTAMP NOT NULL
        )
    """)
    # Datum is optioneel geworden (nog geen idee wanneer een grote uitgave
    # gepland staat) — op een al-bestaande tabel raakt CREATE TABLE IF NOT
    # EXISTS de kolom niet aan, dus expliciet de NOT NULL eraf halen.
    con.execute("ALTER TABLE planning.items ALTER COLUMN datum DROP NOT NULL")

    # Verzamelfacturen (bv. creditcard-afschrijving of bol.com-overzicht):
    # één bankrekening-transactie ("factuur") die uit meerdere losse
    # aankopen ("regels") bestaat, elk met een eigen categorie. Zodra een
    # factuur regels heeft (status 'gesplitst') vervangt
    # gold.transacties_effectief (zie transacties/gold.py) de oorspronkelijke
    # transactie door de regels in alle rapportages.
    con.execute("CREATE SEQUENCE IF NOT EXISTS verzamelfacturen.facturen_seq START 1")
    con.execute("""
        CREATE TABLE IF NOT EXISTS verzamelfacturen.facturen (
            id INTEGER PRIMARY KEY DEFAULT nextval('verzamelfacturen.facturen_seq'),
            bestandsnaam VARCHAR NOT NULL,
            origineel_bestandsnaam VARCHAR,
            bron VARCHAR NOT NULL,
            totaalbedrag DECIMAL(10,2),
            transactie_id VARCHAR,
            status VARCHAR NOT NULL DEFAULT 'nieuw',
            geupload_op TIMESTAMP NOT NULL
        )
    """)
    con.execute("CREATE SEQUENCE IF NOT EXISTS verzamelfacturen.regels_seq START 1")
    con.execute("""
        CREATE TABLE IF NOT EXISTS verzamelfacturen.regels (
            id INTEGER PRIMARY KEY DEFAULT nextval('verzamelfacturen.regels_seq'),
            factuur_id INTEGER NOT NULL,
            omschrijving VARCHAR NOT NULL,
            bedrag DECIMAL(10,2) NOT NULL,
            categorie VARCHAR,
            subcategorie VARCHAR,
            aangemaakt_op TIMESTAMP NOT NULL
        )
    """)

    # Contant geld: telling per coupure per bewaarlocatie (portemonnee,
    # kluis, etc.) — geen enkele-momentopname meer, maar een event-log
    # (mutaties) zodat er geschiedenis is en geld tussen locaties verplaatst
    # of uitgegeven kan worden. De huidige voorraad per locatie/coupure is
    # afgeleid (SUM van signed mutatie-regels via de voorraad-view hieronder),
    # nooit direct overschreven.
    con.execute("CREATE SEQUENCE IF NOT EXISTS contantgeld.locaties_seq START 1")
    con.execute("""
        CREATE TABLE IF NOT EXISTS contantgeld.locaties (
            id INTEGER PRIMARY KEY DEFAULT nextval('contantgeld.locaties_seq'),
            naam VARCHAR NOT NULL,
            aangemaakt_op TIMESTAMP NOT NULL
        )
    """)
    # Vervangen door het mutaties-model hieronder — leeg in de praktijk
    # (nog geen tellingen ingevoerd via de vorige, niet-historische versie).
    con.execute("DROP TABLE IF EXISTS contantgeld.tellingen")

    con.execute("CREATE SEQUENCE IF NOT EXISTS contantgeld.mutaties_seq START 1")
    con.execute("""
        CREATE TABLE IF NOT EXISTS contantgeld.mutaties (
            id INTEGER PRIMARY KEY DEFAULT nextval('contantgeld.mutaties_seq'),
            type VARCHAR NOT NULL,
            datum DATE NOT NULL,
            locatie_id INTEGER,
            locatie_naam VARCHAR,
            van_locatie_id INTEGER,
            van_locatie_naam VARCHAR,
            naar_locatie_id INTEGER,
            naar_locatie_naam VARCHAR,
            omschrijving VARCHAR,
            categorie VARCHAR,
            subcategorie VARCHAR,
            bedrag DECIMAL(10,2) NOT NULL,
            aangemaakt_op TIMESTAMP NOT NULL
        )
    """)
    # locatie_naam/van_locatie_naam/naar_locatie_naam zijn bewust een
    # momentopname-snapshot (niet live via JOIN) — zo blijft de geschiedenis
    # leesbaar ook als een locatie later hernoemd of verwijderd wordt.
    con.execute("""
        CREATE TABLE IF NOT EXISTS contantgeld.mutatie_regels (
            mutatie_id INTEGER NOT NULL,
            coupure DECIMAL(10,2) NOT NULL,
            aantal INTEGER NOT NULL,
            PRIMARY KEY (mutatie_id, coupure)
        )
    """)
    # Signed aantal per (locatie, coupure): 'telling' is zelf al een delta
    # (kan negatief zijn, bv. een correctie naar beneden); 'verplaatsing' en
    # 'uitgave' slaan altijd een positief aantal op, het teken hangt af van
    # de rol (van/naar/locatie) — vandaar de losse UNION-takken hieronder
    # i.p.v. één simpele SUM.
    con.execute("""
        CREATE OR REPLACE VIEW contantgeld.voorraad AS
        SELECT locatie_id, coupure, SUM(delta)::INTEGER AS aantal
        FROM (
            SELECT m.locatie_id AS locatie_id, r.coupure AS coupure, r.aantal AS delta
            FROM contantgeld.mutaties m JOIN contantgeld.mutatie_regels r ON r.mutatie_id = m.id
            WHERE m.type = 'telling'
            UNION ALL
            SELECT m.locatie_id, r.coupure, -r.aantal
            FROM contantgeld.mutaties m JOIN contantgeld.mutatie_regels r ON r.mutatie_id = m.id
            WHERE m.type = 'uitgave'
            UNION ALL
            SELECT m.van_locatie_id, r.coupure, -r.aantal
            FROM contantgeld.mutaties m JOIN contantgeld.mutatie_regels r ON r.mutatie_id = m.id
            WHERE m.type = 'verplaatsing'
            UNION ALL
            SELECT m.naar_locatie_id, r.coupure, r.aantal
            FROM contantgeld.mutaties m JOIN contantgeld.mutatie_regels r ON r.mutatie_id = m.id
            WHERE m.type = 'verplaatsing'
        ) alles
        GROUP BY locatie_id, coupure
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
