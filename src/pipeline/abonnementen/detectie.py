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

CONFIG_PAD = CONFIG_ROOT / "abonnementen.yaml"

# Bewust uitgesloten: geen betaling aan een bedrijf (contant, eigen inkomen,
# overboekingen naar spaarrekening/personen) of nog ongecategoriseerd
# (te onbetrouwbaar om automatisch als "abonnement" te bestempelen).
# Gemeentelijke belasting is geen overeenkomst met een bedrijf.
# Geldt alleen voor de automatische detectie — een handmatige regel in
# abonnementen.yaml omzeilt dit bewust (de gebruiker weet het beter).
UITGESLOTEN_CATEGORIEEN = ("Contant", "Inkomen", "Sparen/Beleggen", "Overig")

# Persoonsnaam-patroon (Nederlandse bank-export aanhef "Hr"/"Mw", gezamenlijke
# rekeninghouders "... en Mw ...", of "e/o" tussen twee namen) — zelfs een
# regelmatige overboeking naar een persoon is geen "abonnement" in de zin
# van een overeenkomst met een bedrijf. Geldt alleen voor de automatische
# detectie, net als de categorie-uitsluiting hierboven.
PERSOONSNAAM_PATROON = r"(?i)^(?:hr|mw|dhr|mevr)\.?\s|\ben\s+(?:hr|mw)\b|\be/?o\b"

# (interval-naam, min-gemiddelde-dag-gap, max-gemiddelde-dag-gap, typische-dag-lengte)
# De typische lengte wordt gebruikt om eerstvolgende_afschrijving te bepalen
# wanneer er geen (betrouwbaar) gemeten gemiddelde is — bij een handmatige
# override uit abonnementen.yaml, waar vaak maar 1-2 transacties bekend zijn.
CADENCES: list[tuple[str, int, int, float]] = [
    ("wekelijks", 5, 9, 7),
    ("maandelijks", 25, 35, 30.44),
    ("tweemaandelijks", 55, 65, 60.87),
    ("per_kwartaal", 80, 100, 91.3),
    ("jaarlijks", 340, 390, 365),
]
INTERVAL_DAGEN = {naam: dagen for naam, _, _, dagen in CADENCES}
INTERVAL_BAND = {naam: (lo, hi) for naam, lo, hi, _ in CADENCES}

# Overwogen om dit voor jaarlijks te verlagen naar 2 (zodat je niet 3 jaar
# hoeft te wachten) — leverde bij het testen alleen valse positieven op:
# toevallig 2x eenzelfde afgeronde prijs bij een winkel (Wibra, Lidl, HEMA,
# ...), zonder enig echt interval. Met maar 1 tussenliggende gap is er
# domweg geen regelmaat te meten. Jaarlijkse abonnementen met minder dan 3
# jaar historie horen daarom in abonnementen.yaml, niet hier.
MIN_TRANSACTIES = 3

GOLD_ABONNEMENTEN_KOLOMMEN = [
    "afzender", "naam", "categorie", "subcategorie", "bedrag", "interval",
    "eerste_afschrijving", "laatste_afschrijving", "eerstvolgende_afschrijving",
    "aantal_transacties", "logo_bestand",
]


@dataclass
class AbonnementenResultaat:
    aantal_automatisch: int
    aantal_handmatig: int
    aantal_logos_opgehaald: int


def _laad_config() -> dict:
    if not CONFIG_PAD.exists():
        return {"abonnementen": [], "genegeerd": []}
    with open(CONFIG_PAD, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return {
        "abonnementen": data.get("abonnementen") or [],
        "genegeerd": data.get("genegeerd") or [],
    }


def _is_actueel(eerstvolgende: date, interval: str, vandaag: date) -> bool:
    # niet meer actueel: waarschijnlijk opgezegd, de (verwachte) eerstvolgende
    # afschrijving ligt te ver terug t.o.v. het interval.
    band_hi = INTERVAL_BAND[interval][1]
    return eerstvolgende >= vandaag - timedelta(days=band_hi * 0.5)


def _detecteer_automatisch(df: pd.DataFrame, vandaag: date) -> list[dict]:
    resultaten = []
    for (afzender, bedrag), groep in df.groupby(["afzender", "bedrag_eur"]):
        datums = sorted(groep["datum"].tolist())

        gaps = [(datums[i + 1] - datums[i]).days for i in range(len(datums) - 1)]
        gemiddelde_gap = statistics.mean(gaps) if gaps else None
        std_gap = statistics.stdev(gaps) if len(gaps) > 1 else 0.0

        interval = None
        for naam, lo, hi, _ in CADENCES:
            if gemiddelde_gap is not None and lo <= gemiddelde_gap <= hi:
                interval = naam
                break
        if interval is None:
            continue

        if len(datums) < MIN_TRANSACTIES:
            continue
        # regelmaat: bij toevallig gelijke bedragen (bv. losse boodschappen die
        # toevallig hetzelfde kostten) staan de gaps niet netjes rond één
        # interval geclusterd — een grote spreiding verraadt dat.
        band = INTERVAL_BAND[interval]
        if std_gap > (band[1] - band[0]) / 2:
            continue

        laatste = datums[-1]
        eerstvolgende = laatste + timedelta(days=round(gemiddelde_gap))
        if not _is_actueel(eerstvolgende, interval, vandaag):
            continue

        resultaten.append({
            "afzender": afzender,
            "naam": afzender,
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


def _verwerk_handmatige_entry(entry: dict, alle_df: pd.DataFrame, vandaag: date) -> dict | None:
    """Een volledige override uit abonnementen.yaml (interval opgegeven) —
    omzeilt categorie-/persoonsnaam-uitsluiting, het minimum-aantal en de
    regelmaat-check volledig: de gebruiker heeft dit al beoordeeld. Gebruikt
    de meest recente matchende transactie, ongeacht bedrag (tenzij `bedrag`
    is opgegeven) — zo heeft een prijswijziging geen invloed.
    """
    afzender = entry["afzender"]
    interval = entry.get("interval", "maandelijks")
    if interval not in INTERVAL_DAGEN:
        logger.warning("Onbekend interval %r voor %r in abonnementen.yaml — overgeslagen", interval, afzender)
        return None

    subset = alle_df[alle_df["afzender"] == afzender]
    if "bedrag" in entry:
        subset = subset[abs(subset["bedrag_eur"] - (-abs(entry["bedrag"]))) < 0.005]
    if subset.empty:
        logger.warning("Geen transacties gevonden voor handmatig abonnement %r in abonnementen.yaml", afzender)
        return None

    laatste_rij = subset.sort_values("datum").iloc[-1]
    laatste = laatste_rij["datum"]
    eerstvolgende = laatste + timedelta(days=round(INTERVAL_DAGEN[interval]))
    if not _is_actueel(eerstvolgende, interval, vandaag):
        return None

    return {
        "afzender": afzender,
        "naam": entry.get("naam") or afzender,
        "categorie": laatste_rij["categorie"],
        "subcategorie": laatste_rij["subcategorie"],
        "bedrag": abs(float(laatste_rij["bedrag_eur"])),
        "interval": interval,
        "eerste_afschrijving": subset["datum"].min(),
        "laatste_afschrijving": laatste,
        "eerstvolgende_afschrijving": eerstvolgende,
        "aantal_transacties": len(subset),
    }


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
    config = _laad_config()
    domeinen: dict[str, str] = {}

    alle_df = con.execute("""
        SELECT afzender, bedrag_eur, datum, categorie, subcategorie
        FROM gold.transacties
        WHERE bedrag_eur < 0 AND afzender IS NOT NULL
    """).df()
    alle_df["datum"] = pd.to_datetime(alle_df["datum"]).dt.date

    # handmatige entries: alleen degene met een interval sturen de detectie
    # aan (bypassen alle automatische filters); entries zonder interval zijn
    # puur een naam-/logo-hint voor een afzender die al automatisch gevonden
    # wordt.
    handmatig = []
    gedekte_afzenders = set()
    for entry in config["abonnementen"]:
        afzender = entry["afzender"]
        if entry.get("domein"):
            domeinen[afzender] = entry["domein"]
        if "interval" not in entry:
            continue
        resultaat = _verwerk_handmatige_entry(entry, alle_df, vandaag)
        if resultaat is not None:
            if entry.get("naam"):
                resultaat["naam"] = entry["naam"]
            handmatig.append(resultaat)
        gedekte_afzenders.add(afzender)

    genegeerd = set(config["genegeerd"]) | gedekte_afzenders

    auto_df = alle_df[~alle_df["categorie"].isin(UITGESLOTEN_CATEGORIEEN)]
    auto_df = auto_df[
        ~((auto_df["categorie"] == "Wonen") & (auto_df["subcategorie"] == "Gemeente/Belasting"))
    ]
    auto_df = auto_df[~auto_df["afzender"].isin(genegeerd)]
    auto_df = auto_df[~auto_df["afzender"].str.contains(PERSOONSNAAM_PATROON, regex=True, na=False)]

    automatisch = _detecteer_automatisch(auto_df, vandaag)
    for item in automatisch:
        item["naam"] = item["afzender"]

    alle_resultaten = handmatig + automatisch

    aantal_logos = 0
    for item in alle_resultaten:
        item["logo_bestand"] = None
        domein = domeinen.get(item["afzender"])
        if domein:
            bestand = _haal_logo_op(domein)
            if bestand:
                item["logo_bestand"] = bestand
                aantal_logos += 1

    resultaat_df = pd.DataFrame(alle_resultaten, columns=GOLD_ABONNEMENTEN_KOLOMMEN)
    # anders leidt DuckDB bij een lege/all-NULL kolom (bv. geen enkel logo
    # opgehaald deze run) een niet-VARCHAR type af
    resultaat_df["logo_bestand"] = resultaat_df["logo_bestand"].astype("string")
    con.register("abonnementen_temp", resultaat_df)
    con.execute("CREATE OR REPLACE TABLE gold.abonnementen AS SELECT * FROM abonnementen_temp")
    con.unregister("abonnementen_temp")
    logger.info(
        "gold.abonnementen tabel klaar (%d automatisch, %d handmatig)",
        len(automatisch), len(handmatig),
    )

    return AbonnementenResultaat(
        aantal_automatisch=len(automatisch),
        aantal_handmatig=len(handmatig),
        aantal_logos_opgehaald=aantal_logos,
    )
