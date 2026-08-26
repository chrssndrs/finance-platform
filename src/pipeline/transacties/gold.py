import logging
from dataclasses import dataclass
from pathlib import Path

import duckdb
import pandas as pd
import yaml

from src.pipeline.paths import CONFIG_ROOT

logger = logging.getLogger(__name__)

CATEGORISATIE_REGELS_PAD = CONFIG_ROOT / "categorisatie_regels.yaml"

# Regex (op de lowercased, getrimde naam_omschrijving) die een betaalverwerker-suffix
# herkent en verwijdert, zodat de onderliggende afzender overblijft (bv. "KNMV via
# Mollie" en "KNMV via Stichting Mollie Payments" worden allebei "knmv"). Nodig omdat
# deze verwerkers een gedeeld/pooled tegenrekening-IBAN gebruiken voor duizenden
# ongerelateerde afzenders — IBAN-groepering zou die anders ten onrechte samenvoegen.
VERWERKER_SUFFIX_PATROON = (
    r"\s+(via|by)\s+(stichting\s+)?"
    r"(mollie(\s+payments)?|buckaroo|adyen|ccv(\s+group)?|pay\.nl|sisow|multisafepay"
    r"|tikkie|ingenico|worldline(\s+financial\s+solutions)?|cm\.com"
    r"|worldpay(\s+(customer\s+payments|b\.v\.))?"
    r"|(rabo(\s+zakelijk)?|ing)\s+betaalverzoek)\s*$"
)

# Tegenrekening-IBAN's waarvan empirisch is vastgesteld dat het gedeelde/pooled
# betaalverwerker-rekeningen zijn (gebruikt door tientallen ongerelateerde afzenders),
# niet de eigen rekening van één tegenpartij. IBAN-gebaseerde afzender-consolidatie
# slaat deze over, ook als VERWERKER_SUFFIX_PATROON de tekst niet ving (bv. omdat de
# naam_omschrijving de verwerker niet noemt, zoals bij sommige Adyen-transacties).
# Kom je in een nieuwe bank-export een vergelijkbaar gedeeld IBAN tegen? Voeg het hier toe.
GEDEELDE_AFZENDER_IBANS = {
    "NL04ADYB2017400157",  # Adyen
    "NL65ADYB2006011162",  # Adyen
    "NL92ADYB2017400998",  # Adyen
    "NL58CITI2032329913",  # Stripe-achtige verwerker
    "NL13ABNA0506417344",  # Tikkie
    "NL39RABO0301242844",  # Ingenico/Worldline
    "NL59ABNA0626226163",  # WorldPay
    "NL35RABO0117713678",  # PAY.nl
    "NL51DEUT0265262461",  # Mollie
    "NL56DEUT0265186420",  # Buckaroo
    "NL63DEUT0265247986",  # CM.com
}


@dataclass
class GoldResultaat:
    aantal_regels: int
    aantal_overrides: int
    aantal_transacties: int
    aantal_ongecategoriseerd: int


def run_gold(
    con: duckdb.DuckDBPyConnection,
    regels_pad: Path = CATEGORISATIE_REGELS_PAD,
) -> GoldResultaat:
    with open(regels_pad, "r", encoding="utf-8") as f:
        regels_config = yaml.safe_load(f)

    regels_df = pd.DataFrame(regels_config["regels"])
    regels_df.insert(0, "regel_id", range(1, len(regels_df) + 1))
    if "richting" not in regels_df.columns:
        regels_df["richting"] = None
    if "winkel" not in regels_df.columns:
        regels_df["winkel"] = None

    con.register("regels_temp", regels_df)
    con.execute("""
        CREATE OR REPLACE TABLE gold.categorisatie_regels AS
        SELECT regel_id, prioriteit, categorie, subcategorie, patroon, richting, winkel
        FROM regels_temp
    """)
    logger.info("gold.categorisatie_regels herladen (%d regels)", len(regels_df))

    bestaand_type = con.execute("""
        SELECT table_type FROM information_schema.tables
        WHERE table_schema = 'gold' AND table_name = 'transacties'
    """).fetchone()
    if bestaand_type is not None and bestaand_type[0] == "VIEW":
        con.execute("DROP VIEW gold.transacties")

    con.execute("""
        CREATE TABLE IF NOT EXISTS gold.categorie_overrides (
            transactie_id VARCHAR PRIMARY KEY,
            categorie VARCHAR,
            subcategorie VARCHAR,
            reden VARCHAR,
            aangemaakt_op TIMESTAMP
        )
    """)

    # Door de gebruiker gekozen categorie per afzender (ongecategoriseerde-
    # afzenders-inbox) — in tegenstelling tot gold.categorisatie_regels
    # NIET herschreven vanuit config, blijft dus bewaard tussen pipeline-runs.
    con.execute("""
        CREATE TABLE IF NOT EXISTS gold.afzender_categorieen (
            afzender VARCHAR PRIMARY KEY,
            categorie VARCHAR NOT NULL,
            subcategorie VARCHAR,
            aangemaakt_op TIMESTAMP
        )
    """)

    # Rekeningnummers van banken die als spaarrekening geregistreerd staan
    # (instellingen.banken.rekening_type) — hun eigen geüploade transacties
    # (rentebijschrijvingen, overboekingen naar/van de spaarrekening zelf)
    # horen niet als Uitgaven-post mee te tellen; het saldo wordt al apart
    # via sparen_berekening.py afgeleid. rij_hash is de enige stabiele link
    # terug naar de bank-slug, want die overleeft de stap naar silver niet
    # (zie ook sparen_berekening.py).
    con.execute("""
        CREATE OR REPLACE VIEW gold.spaarrekening_nummers AS
        SELECT DISTINCT s.rekening
        FROM silver.transacties s
        JOIN bronze.transacties br ON br.rij_hash = s.rij_hash
        JOIN instellingen.banken b ON b.bank = br.bank AND b.rekening_type = 'spaarrekening'
        WHERE s.rekening IS NOT NULL AND s.rekening != ''
    """)

    con.execute(
        """
        CREATE OR REPLACE TABLE gold.transacties AS
        WITH regel_matches AS (
            SELECT
                s.transactie_id,
                r.categorie,
                r.subcategorie,
                r.winkel,
                r.prioriteit,
                -- of de winkel-match kwam uit naam_omschrijving zelf (dus de winkel IS
                -- de tegenpartij) i.p.v. alleen uit mededelingen (bv. een persoon die
                -- toevallig "Hornbach" noemt als besteding-omschrijving in een overboeking)
                regexp_matches(lower(s.naam_omschrijving), lower(r.patroon)) AS winkel_uit_naam,
                ROW_NUMBER() OVER (
                    PARTITION BY s.transactie_id
                    ORDER BY r.prioriteit ASC
                ) AS rn
            FROM silver.transacties s
            JOIN gold.categorisatie_regels r
                ON regexp_matches(
                    lower(s.naam_omschrijving || ' ' || coalesce(s.mededelingen, '') || ' ' || coalesce(s.tegenrekening, '')),
                    lower(r.patroon)
                )
                AND (
                    r.richting IS NULL
                    OR (r.richting = 'in' AND s.bedrag_eur > 0)
                    OR (r.richting = 'uit' AND s.bedrag_eur < 0)
                )
        ),
        beste_match AS (
            SELECT
                transactie_id, categorie, subcategorie, winkel,
                (winkel IS NOT NULL AND winkel_uit_naam) AS winkel_is_afzender
            FROM regel_matches
            WHERE rn = 1
        ),
        -- Afzender-consolidatie voor transacties zonder betrouwbare winkel-match:
        -- normaliseer per rij naar een groepeersleutel, kies daarna de vaakst voor-
        -- komende ruwe naam als canonieke weergavenaam voor die sleutel.
        basis_afzender AS (
            SELECT
                s.transactie_id,
                s.tegenrekening,
                s.naam_omschrijving,
                b.winkel,
                b.winkel_is_afzender,
                regexp_replace(lower(trim(s.naam_omschrijving)), $verwerker_patroon, '') AS naam_gestript,
                -- zelfde strip, maar met behoud van originele hoofdlettering, als
                -- weergavenaam-kandidaat (naam_gestript zelf is altijd lowercase,
                -- alleen bruikbaar als groepeersleutel, niet om te tonen)
                regexp_replace(trim(s.naam_omschrijving), $verwerker_patroon, '', 'i') AS naam_zonder_verwerker
            FROM silver.transacties s
            LEFT JOIN beste_match b ON b.transactie_id = s.transactie_id
        ),
        -- Sommige verwerkers (Rabo/ING Betaalverzoek) genereren per betaalverzoek een
        -- nieuwe/andere tegenrekening-IBAN i.p.v. één vast pooled IBAN — die staan dus
        -- niet in GEDEELDE_AFZENDER_IBANS. Maar als een IBAN op ÉÉN rij al via de
        -- verwerker-suffix herkend is (naam_gestript != ruwe naam), dan is diezelfde
        -- IBAN op een ANDERE rij (waar de verwerkersnaam niet in de tekst voorkomt,
        -- bv. "A.J.L.M. Kemps e/o L.A.A Bouwman" zonder "via Rabo Betaalverzoek")
        -- evenmin een betrouwbare afzender-sleutel: empirisch bevestigd dat zulke
        -- IBAN's door meerdere, totaal ongerelateerde afzenders gedeeld worden.
        verwerker_ibans AS (
            SELECT DISTINCT tegenrekening
            FROM basis_afzender
            WHERE tegenrekening IS NOT NULL
              AND tegenrekening != ''
              AND naam_gestript != lower(trim(naam_omschrijving))
        ),
        sleutels AS (
            SELECT
                transactie_id,
                naam_omschrijving,
                winkel,
                winkel_is_afzender,
                -- weergave-kandidaat: bij verwerker-suffix-stripping tonen we de
                -- gestripte naam (bv. "KNMV"), anders de ruwe naam ongewijzigd
                CASE
                    WHEN naam_gestript != lower(trim(naam_omschrijving)) THEN naam_zonder_verwerker
                    ELSE naam_omschrijving
                END AS weergave_naam,
                CASE
                    WHEN winkel_is_afzender THEN NULL
                    WHEN naam_gestript != lower(trim(naam_omschrijving)) THEN 'tekst:' || naam_gestript
                    WHEN tegenrekening IS NOT NULL AND tegenrekening != ''
                         AND NOT list_contains($gedeelde_ibans, tegenrekening)
                         AND tegenrekening NOT IN (SELECT tegenrekening FROM verwerker_ibans)
                        THEN 'iban:' || tegenrekening
                    ELSE 'tekst:' || regexp_replace(lower(trim(naam_omschrijving)), '\\s*,\\s*', ', ')
                END AS normalisatie_sleutel
            FROM basis_afzender
        ),
        naam_tellingen AS (
            SELECT normalisatie_sleutel, weergave_naam, COUNT(*) AS aantal
            FROM sleutels
            WHERE normalisatie_sleutel IS NOT NULL
            GROUP BY normalisatie_sleutel, weergave_naam
        ),
        canonieke_namen AS (
            SELECT normalisatie_sleutel, weergave_naam AS canonieke_naam
            FROM (
                SELECT
                    normalisatie_sleutel, weergave_naam,
                    ROW_NUMBER() OVER (
                        PARTITION BY normalisatie_sleutel
                        ORDER BY aantal DESC, length(weergave_naam) DESC
                    ) AS rn
                FROM naam_tellingen
            ) t
            WHERE rn = 1
        ),
        afzenders AS (
            SELECT
                sl.transactie_id,
                COALESCE(CASE WHEN sl.winkel_is_afzender THEN sl.winkel END, c.canonieke_naam) AS afzender
            FROM sleutels sl
            LEFT JOIN canonieke_namen c ON c.normalisatie_sleutel = sl.normalisatie_sleutel
        )
        SELECT
            s.*,
            COALESCE(o.categorie, ac.categorie, b.categorie, 'Overig')               AS categorie,
            COALESCE(o.subcategorie, ac.subcategorie, b.subcategorie, 'Ongecategoriseerd') AS subcategorie,
            (o.transactie_id IS NOT NULL)                                AS handmatig_overschreven,
            b.winkel                                                     AS winkel,
            a.afzender                                                   AS afzender
        FROM silver.transacties s
        LEFT JOIN beste_match b ON b.transactie_id = s.transactie_id
        LEFT JOIN gold.categorie_overrides o ON o.transactie_id = s.transactie_id
        LEFT JOIN afzenders a ON a.transactie_id = s.transactie_id
        LEFT JOIN gold.afzender_categorieen ac ON ac.afzender = a.afzender
        """,
        {
            "verwerker_patroon": VERWERKER_SUFFIX_PATROON,
            "gedeelde_ibans": list(GEDEELDE_AFZENDER_IBANS),
        },
    )
    logger.info("gold.transacties tabel klaar")

    # Vervangt een verzamelfactuur-transactie (bv. één creditcard-afschrijving)
    # door de handmatig gesplitste regels zodra die er zijn, zodat elke
    # rapportage-query (totalen, transactielijst, categorieën, afzenders)
    # automatisch de gesplitste bedragen/categorieën ziet i.p.v. de ene
    # lump-transactie — zonder dat elke query zelf de splits-logica hoeft
    # te kennen. Referentie naar een tabelnaam in een VIEW wordt door DuckDB
    # bij elke query opnieuw opgezocht, dus deze hoeft niet herbouwd te
    # worden als gold.transacties verandert — CREATE OR REPLACE hier is
    # alleen zodat de view sowieso bestaat, ook bij de allereerste run.
    #
    # De omruil (origineel -> regels) gebeurt pas als de som van de regels
    # exact (op een cent na) het transactiebedrag dekt — zolang een factuur
    # nog maar deels gesplitst is, blijft de originele lump-transactie hier
    # gewoon staan. Zo verdwijnt er nooit geld uit de rapportages doordat een
    # verzamelfactuur half gesplitst is blijven staan: pas als het klopt,
    # wisselt de weergave om.
    con.execute("""
        CREATE OR REPLACE VIEW gold.transacties_effectief AS
        WITH volledig_gesplitst AS (
            SELECT f.transactie_id
            FROM verzamelfacturen.facturen f
            JOIN gold.transacties t ON t.transactie_id = f.transactie_id
            JOIN verzamelfacturen.regels r ON r.factuur_id = f.id
            WHERE f.status = 'gesplitst'
            GROUP BY f.transactie_id, t.bedrag_eur
            HAVING ABS(SUM(r.bedrag) - t.bedrag_eur) < 0.01
        )
        SELECT * FROM gold.transacties
        WHERE transactie_id NOT IN (SELECT transactie_id FROM volledig_gesplitst)
          AND (rekening IS NULL OR rekening NOT IN (SELECT rekening FROM gold.spaarrekening_nummers))
        UNION ALL BY NAME
        SELECT
            f.transactie_id || '-regel-' || r.id AS transactie_id,
            t.datum AS datum,
            r.omschrijving AS naam_omschrijving,
            t.rekening AS rekening,
            t.tegenrekening AS tegenrekening,
            r.omschrijving AS mededelingen,
            r.bedrag AS bedrag_eur,
            CAST(NULL AS DOUBLE) AS saldo_na_mutatie,
            CAST(NULL AS VARCHAR) AS rij_hash,
            t.bronbestand AS bronbestand,
            t.ingelezen_op AS ingelezen_op,
            COALESCE(r.categorie, 'Overig') AS categorie,
            COALESCE(r.subcategorie, 'Ongecategoriseerd') AS subcategorie,
            true AS handmatig_overschreven,
            r.omschrijving AS winkel,
            r.omschrijving AS afzender
        FROM verzamelfacturen.regels r
        JOIN verzamelfacturen.facturen f ON f.id = r.factuur_id
        JOIN gold.transacties t ON t.transactie_id = f.transactie_id
        WHERE f.transactie_id IN (SELECT transactie_id FROM volledig_gesplitst)
        UNION ALL BY NAME
        SELECT
            'cash-' || m.id AS transactie_id,
            m.datum AS datum,
            m.omschrijving AS naam_omschrijving,
            CAST(NULL AS VARCHAR) AS rekening,
            CAST(NULL AS VARCHAR) AS tegenrekening,
            m.omschrijving AS mededelingen,
            -m.bedrag AS bedrag_eur,
            CAST(NULL AS DOUBLE) AS saldo_na_mutatie,
            CAST(NULL AS VARCHAR) AS rij_hash,
            CAST(NULL AS VARCHAR) AS bronbestand,
            m.aangemaakt_op AS ingelezen_op,
            COALESCE(m.categorie, 'Overig') AS categorie,
            COALESCE(m.subcategorie, 'Ongecategoriseerd') AS subcategorie,
            true AS handmatig_overschreven,
            m.omschrijving AS winkel,
            m.omschrijving AS afzender
        FROM contantgeld.mutaties m
        WHERE m.type = 'uitgave'
    """)

    aantal_regels = con.execute("SELECT COUNT(*) FROM gold.categorisatie_regels").fetchone()[0]
    aantal_overrides = con.execute("SELECT COUNT(*) FROM gold.categorie_overrides").fetchone()[0]
    aantal_transacties = con.execute("SELECT COUNT(*) FROM gold.transacties").fetchone()[0]
    aantal_ongecategoriseerd = con.execute(
        "SELECT COUNT(*) FROM gold.transacties WHERE categorie = 'Overig'"
    ).fetchone()[0]

    return GoldResultaat(
        aantal_regels=aantal_regels,
        aantal_overrides=aantal_overrides,
        aantal_transacties=aantal_transacties,
        aantal_ongecategoriseerd=aantal_ongecategoriseerd,
    )


def zet_override(
    con: duckdb.DuckDBPyConnection,
    transactie_id: str,
    categorie: str,
    subcategorie: str,
    reden: str,
) -> None:
    con.execute("""
        INSERT INTO gold.categorie_overrides (transactie_id, categorie, subcategorie, reden, aangemaakt_op)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (transactie_id) DO UPDATE SET
            categorie = excluded.categorie,
            subcategorie = excluded.subcategorie,
            reden = excluded.reden,
            aangemaakt_op = excluded.aangemaakt_op
    """, [transactie_id, categorie, subcategorie, reden, pd.Timestamp.now()])
    logger.info(
        "Override gezet voor %s: %s / %s (roep run_gold() opnieuw aan om dit in gold.transacties te zien)",
        transactie_id, categorie, subcategorie,
    )
