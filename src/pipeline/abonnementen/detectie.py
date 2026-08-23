import logging
import re
import statistics
from dataclasses import dataclass
from datetime import date, timedelta

import duckdb
import pandas as pd
import requests
import yaml

from src.pipeline.paths import CONFIG_ROOT, LOGOS_PAD

logger = logging.getLogger(__name__)

DOMEINEN_PAD = CONFIG_ROOT / "abonnement_domeinen.yaml"

# Bewust uitgesloten: geen betaling aan een bedrijf (contant, eigen inkomen,
# overboekingen naar spaarrekening/personen) of nog ongecategoriseerd
# (te onbetrouwbaar om automatisch als "abonnement" te bestempelen).
# Gemeentelijke belasting is geen overeenkomst met een bedrijf.
UITGESLOTEN_CATEGORIEEN = ("Contant", "Inkomen", "Sparen/Beleggen", "Overig")

# Persoonsnaam-patroon (Nederlandse bank-export aanhef "Hr"/"Mw", gezamenlijke
# rekeninghouders "... en Mw ...", of "e/o" tussen twee namen) — zelfs een
# regelmatige overboeking naar een persoon is geen "abonnement" in de zin
# van een overeenkomst met een bedrijf.
PERSOONSNAAM_PATROON = r"(?i)^(?:hr|mw|dhr|mevr)\.?\s|\ben\s+(?:hr|mw)\b|\be/?o\b"

# (interval-naam, min-gemiddelde-dag-gap, max-gemiddelde-dag-gap)
CADENCES: list[tuple[str, int, int]] = [
    ("wekelijks", 5, 9),
    ("maandelijks", 25, 35),
    ("per_kwartaal", 80, 100),
    ("jaarlijks", 340, 390),
]

MIN_TRANSACTIES = 3

GOLD_ABONNEMENTEN_KOLOMMEN = [
    "afzender", "categorie", "subcategorie", "bedrag", "interval",
    "eerste_afschrijving", "laatste_afschrijving", "eerstvolgende_afschrijving",
    "aantal_transacties", "logo_bestand",
]


@dataclass
class AbonnementenResultaat:
    aantal_gedetecteerd: int
    aantal_logos_opgehaald: int


def _laad_domeinen() -> dict[str, str]:
    if not DOMEINEN_PAD.exists():
        return {}
    with open(DOMEINEN_PAD, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _detecteer(df: pd.DataFrame, vandaag: date) -> list[dict]:
    resultaten = []
    for (afzender, bedrag), groep in df.groupby(["afzender", "bedrag_eur"]):
        datums = sorted(groep["datum"].tolist())
        if len(datums) < MIN_TRANSACTIES:
            continue

        gaps = [(datums[i + 1] - datums[i]).days for i in range(len(datums) - 1)]
        gemiddelde_gap = statistics.mean(gaps)
        std_gap = statistics.stdev(gaps) if len(gaps) > 1 else 0.0

        interval = None
        band = None
        for naam, lo, hi in CADENCES:
            if lo <= gemiddelde_gap <= hi:
                interval, band = naam, (lo, hi)
                break
        if interval is None:
            continue
        # regelmaat: bij toevallig gelijke bedragen (bv. losse boodschappen die
        # toevallig hetzelfde kostten) staan de gaps niet netjes rond één
        # interval geclusterd — een grote spreiding verraadt dat.
        if std_gap > (band[1] - band[0]) / 2:
            continue

        laatste = datums[-1]
        eerstvolgende = laatste + timedelta(days=round(gemiddelde_gap))
        # niet meer actueel: waarschijnlijk opgezegd, laatste afschrijving ligt
        # te ver terug t.o.v. het verwachte interval.
        if eerstvolgende < vandaag - timedelta(days=band[1] * 0.5):
            continue

        resultaten.append({
            "afzender": afzender,
            "categorie": groep["categorie"].iloc[0],
            "subcategorie": groep["subcategorie"].iloc[0],
            "bedrag": abs(float(bedrag)),
            "interval": interval,
            "eerste_afschrijving": datums[0],
            "laatste_afschrijving": laatste,
            "eerstvolgende_afschrijving": eerstvolgende,
            "aantal_transacties": len(datums),
        })
    return resultaten


def _domein_slug(domein: str) -> str:
    return re.sub(r"[^a-z0-9.]", "_", domein.lower())


def _haal_logo_op(domein: str) -> str | None:
    bestandsnaam = f"{_domein_slug(domein)}.png"
    pad = LOGOS_PAD / bestandsnaam
    if pad.exists():
        return bestandsnaam
    try:
        response = requests.get(f"https://icons.duckduckgo.com/ip3/{domein}.ico", timeout=5)
        if response.status_code == 200 and response.content:
            LOGOS_PAD.mkdir(parents=True, exist_ok=True)
            pad.write_bytes(response.content)
            return bestandsnaam
    except requests.RequestException:
        logger.warning("Logo ophalen mislukt voor domein %s", domein, exc_info=True)
    return None


def run_abonnementen(
    con: duckdb.DuckDBPyConnection,
    vandaag: date | None = None,
) -> AbonnementenResultaat:
    vandaag = vandaag or date.today()

    df = con.execute(f"""
        SELECT afzender, bedrag_eur, datum, categorie, subcategorie
        FROM gold.transacties
        WHERE bedrag_eur < 0
          AND afzender IS NOT NULL
          AND categorie NOT IN ({",".join("?" * len(UITGESLOTEN_CATEGORIEEN))})
          AND NOT (categorie = 'Wonen' AND subcategorie = 'Gemeente/Belasting')
    """, list(UITGESLOTEN_CATEGORIEEN)).df()
    df["datum"] = pd.to_datetime(df["datum"]).dt.date
    df = df[~df["afzender"].str.contains(PERSOONSNAAM_PATROON, regex=True, na=False)]

    gedetecteerd = _detecteer(df, vandaag)

    domeinen = _laad_domeinen()
    aantal_logos = 0
    for item in gedetecteerd:
        item["logo_bestand"] = None
        domein = domeinen.get(item["afzender"])
        if domein:
            bestand = _haal_logo_op(domein)
            if bestand:
                item["logo_bestand"] = bestand
                aantal_logos += 1

    resultaat_df = pd.DataFrame(gedetecteerd, columns=GOLD_ABONNEMENTEN_KOLOMMEN)
    # anders leidt DuckDB bij een lege/all-NULL kolom (bv. geen enkel logo
    # opgehaald deze run) een niet-VARCHAR type af
    resultaat_df["logo_bestand"] = resultaat_df["logo_bestand"].astype("string")
    con.register("abonnementen_temp", resultaat_df)
    con.execute("CREATE OR REPLACE TABLE gold.abonnementen AS SELECT * FROM abonnementen_temp")
    con.unregister("abonnementen_temp")
    logger.info("gold.abonnementen tabel klaar (%d abonnementen)", len(gedetecteerd))

    return AbonnementenResultaat(
        aantal_gedetecteerd=len(gedetecteerd),
        aantal_logos_opgehaald=aantal_logos,
    )
