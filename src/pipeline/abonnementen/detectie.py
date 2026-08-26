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

# Alleen nog gelezen door de eenmalige migratie hieronder (_migreer_indien_nodig)
# — de databank is nu de bron van waarheid, dit bestand bestaat niet meer.
CONFIG_PAD = CONFIG_ROOT / "abonnementen.yaml"

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

# (interval-naam, min-gemiddelde-dag-gap, max-gemiddelde-dag-gap, typische-dag-lengte)
CADENCES: list[tuple[str, int, int, float]] = [
    ("wekelijks", 5, 9, 7),
    ("maandelijks", 25, 35, 30.44),
    ("tweemaandelijks", 55, 65, 60.87),
    ("per_kwartaal", 80, 100, 91.3),
    ("jaarlijks", 340, 390, 365),
]
INTERVAL_DAGEN = {naam: dagen for naam, _, _, dagen in CADENCES}
INTERVAL_BAND = {naam: (lo, hi) for naam, lo, hi, _ in CADENCES}

# Zie eerdere overweging: met minder dan 3 tussenliggende transacties is er
# geen regelmaat te meten — dan moet de gebruiker het abonnement handmatig
# toevoegen in plaats van te wachten tot de detectie genoeg data heeft.
MIN_TRANSACTIES = 3


@dataclass
class AbonnementenResultaat:
    aantal_gemigreerd: int
    aantal_ververst: int
    aantal_doorgerold: int
    aantal_nieuwe_aanbevelingen: int
    aantal_prijswijziging_aanbevelingen: int
    aantal_logos_opgehaald: int
    aantal_logos_opgeruimd: int


def _laad_config() -> dict:
    if not CONFIG_PAD.exists():
        return {"abonnementen": []}
    with open(CONFIG_PAD, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return {"abonnementen": data.get("abonnementen") or []}


def _is_actueel(eerstvolgende: date, interval: str, vandaag: date) -> bool:
    # niet meer actueel: waarschijnlijk opgezegd, de (verwachte) eerstvolgende
    # afschrijving ligt te ver terug t.o.v. het interval.
    band_hi = INTERVAL_BAND[interval][1]
    return eerstvolgende >= vandaag - timedelta(days=band_hi * 0.5)


def _laad_transacties(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    df = con.execute("""
        SELECT afzender, bedrag_eur, datum, categorie, subcategorie
        FROM gold.transacties
        WHERE bedrag_eur < 0 AND afzender IS NOT NULL
    """).df()
    df["datum"] = pd.to_datetime(df["datum"]).dt.date
    return df


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


def _migreer_indien_nodig(con: duckdb.DuckDBPyConnection, vandaag: date) -> int:
    """Eenmalige migratie vanaf de oude, volledig herberekende
    gold.abonnementen + config/abonnementen.yaml naar de nieuwe, muteerbare
    abonnementen.abonnementen-tabel. Alles wat er al herkend/geconfigureerd
    stond wordt als 'al geaccepteerd' overgenomen — anders zou de gebruiker
    al zijn gecureerde abonnementen opnieuw als aanbeveling voorgeschoteld
    krijgen. Idempotent: slaat over zodra de nieuwe tabel niet meer leeg is.
    """
    (aantal_bestaand,) = con.execute("SELECT count(*) FROM abonnementen.abonnementen").fetchone()
    if aantal_bestaand > 0:
        return 0

    bestaat_gold = con.execute("""
        SELECT count(*) FROM information_schema.tables
        WHERE table_schema = 'gold' AND table_name = 'abonnementen'
    """).fetchone()[0]
    if not bestaat_gold:
        return 0

    oud = con.execute("""
        SELECT afzender, naam, categorie, subcategorie, bedrag, interval,
               eerste_afschrijving, laatste_afschrijving, eerstvolgende_afschrijving,
               aantal_transacties, logo_bestand
        FROM gold.abonnementen
    """).fetchall()
    if not oud:
        return 0

    domeinen = {
        entry["afzender"]: entry["domein"]
        for entry in _laad_config()["abonnementen"]
        if entry.get("domein")
    }

    for (afzender, naam, categorie, subcategorie, bedrag, interval,
         eerste, laatste, eerstvolgende, aantal, logo_bestand) in oud:
        con.execute("""
            INSERT INTO abonnementen.abonnementen
                (afzender, naam, categorie, subcategorie, bedrag, interval,
                 eerste_afschrijving, laatste_afschrijving, eerstvolgende_afschrijving,
                 aantal_transacties, domein, logo_bestand, bron, aangemaakt_op)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'gemigreerd', now())
        """, [afzender, naam, categorie, subcategorie, bedrag, interval,
              eerste, laatste, eerstvolgende, aantal, domeinen.get(afzender), logo_bestand])

    logger.info("Gemigreerd van gold.abonnementen naar abonnementen.abonnementen: %d rijen", len(oud))
    return len(oud)


def _ververs_geaccepteerd(con: duckdb.DuckDBPyConnection, transacties_df: pd.DataFrame) -> int:
    """Ververst laatste/eerstvolgende-afschrijving en aantal_transacties voor
    afzender-gekoppelde abonnementen, op basis van transacties met exact het
    huidige bedrag. Verandert het bedrag zelf nooit — dat gaat via een
    prijswijziging-aanbeveling (_detecteer_prijswijzigingen), niet stilzwijgend.
    """
    rijen = con.execute("""
        SELECT id, afzender, bedrag, interval
        FROM abonnementen.abonnementen
        WHERE afzender IS NOT NULL
    """).fetchall()

    aantal = 0
    for id_, afzender, bedrag, interval in rijen:
        subset = transacties_df[
            (transacties_df["afzender"] == afzender)
            & ((transacties_df["bedrag_eur"] + float(bedrag)).abs() < 0.005)
        ]
        if subset.empty:
            continue
        laatste = subset["datum"].max()
        eerste = subset["datum"].min()
        eerstvolgende = laatste + timedelta(days=round(INTERVAL_DAGEN[interval]))
        con.execute("""
            UPDATE abonnementen.abonnementen
            SET eerste_afschrijving = ?, laatste_afschrijving = ?,
                eerstvolgende_afschrijving = ?, aantal_transacties = ?
            WHERE id = ?
        """, [eerste, laatste, eerstvolgende, len(subset), id_])
        aantal += 1
    return aantal


def _rol_handmatige_datums_door(con: duckdb.DuckDBPyConnection, vandaag: date) -> int:
    """Puur handmatige abonnementen (geen afzender-koppeling, dus geen
    banktransacties om de datum aan te verversen) rollen we zelf door zodra
    de eerstvolgende_afschrijving verstreken is — anders blijft 'dagen tot
    afschrijving' voor altijd negatief."""
    rijen = con.execute("""
        SELECT id, eerstvolgende_afschrijving, interval
        FROM abonnementen.abonnementen
        WHERE afzender IS NULL AND eerstvolgende_afschrijving < ?
    """, [vandaag]).fetchall()

    aantal = 0
    for id_, eerstvolgende, interval in rijen:
        stap = timedelta(days=round(INTERVAL_DAGEN[interval]))
        nieuw = eerstvolgende
        while nieuw < vandaag:
            nieuw += stap
        con.execute(
            "UPDATE abonnementen.abonnementen SET eerstvolgende_afschrijving = ? WHERE id = ?",
            [nieuw, id_],
        )
        aantal += 1
    return aantal


def _upsert_nieuwe_aanbevelingen(con: duckdb.DuckDBPyConnection, kandidaten: list[dict]) -> int:
    bestaande = con.execute("""
        SELECT afzender, voorgesteld_bedrag, status, id
        FROM abonnementen.aanbevelingen
        WHERE type = 'nieuw'
    """).fetchall()
    per_sleutel = {(afz, round(float(bedr), 2)): (status, id_) for afz, bedr, status, id_ in bestaande}

    aantal_nieuw = 0
    for kand in kandidaten:
        sleutel = (kand["afzender"], round(kand["bedrag"], 2))
        bestaand = per_sleutel.get(sleutel)
        if bestaand is None:
            con.execute("""
                INSERT INTO abonnementen.aanbevelingen
                    (type, afzender, naam, categorie, subcategorie, voorgesteld_bedrag, interval,
                     eerste_afschrijving, laatste_afschrijving, eerstvolgende_afschrijving,
                     aantal_transacties, status, aangemaakt_op)
                VALUES ('nieuw', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', now())
            """, [kand["afzender"], kand["naam"], kand["categorie"], kand["subcategorie"], kand["bedrag"],
                  kand["interval"], kand["eerste_afschrijving"], kand["laatste_afschrijving"],
                  kand["eerstvolgende_afschrijving"], kand["aantal_transacties"]])
            aantal_nieuw += 1
        elif bestaand[0] == "open":
            con.execute("""
                UPDATE abonnementen.aanbevelingen
                SET laatste_afschrijving = ?, eerstvolgende_afschrijving = ?, aantal_transacties = ?
                WHERE id = ?
            """, [kand["laatste_afschrijving"], kand["eerstvolgende_afschrijving"],
                  kand["aantal_transacties"], bestaand[1]])
        # status == 'geweigerd': bewust overslaan, blijft onderdrukt.
    return aantal_nieuw


def _detecteer_prijswijzigingen(con: duckdb.DuckDBPyConnection, transacties_df: pd.DataFrame) -> int:
    """Sommige afzenders hebben meerdere, gelijktijdig lopende abonnementen op
    verschillende bedragen (bv. een verzekeraar met meerdere polissen) — dus
    "de meest recente transactie van deze afzender" zegt niets over welke
    polis van prijs veranderd is. In plaats daarvan kijken we per
    geaccepteerd abonnement alleen naar transacties van ná zijn eigen,
    net-ververste laatste_afschrijving (_ververs_geaccepteerd draait hiervóór)
    met een ander bedrag — dat is het venster waarin alleen een echte
    prijswijziging van precies déze polis zichtbaar wordt; een nog gewoon
    doorlopende andere polis van dezelfde afzender blijft buiten beeld omdat
    zijn eigen laatste_afschrijving al ververst is tot een recente datum.
    """
    geaccepteerd = con.execute("""
        SELECT id, afzender, bedrag, laatste_afschrijving
        FROM abonnementen.abonnementen
        WHERE afzender IS NOT NULL AND laatste_afschrijving IS NOT NULL
    """).fetchall()

    # Alle al-geaccepteerde (afzender, bedrag)-paren: als een afzender meerdere
    # gelijktijdig lopende abonnementen heeft (bv. twee polissen bij dezelfde
    # verzekeraar), mag een transactie die bij de ÁNDERE, ook-geaccepteerde
    # polis hoort niet worden aangezien voor een prijswijziging van déze polis.
    alle_geaccepteerde_bedragen: dict[str, set[float]] = {}
    for _id, afz, bedr, _laatste in geaccepteerd:
        alle_geaccepteerde_bedragen.setdefault(afz, set()).add(round(float(bedr), 2))

    bestaande = con.execute("""
        SELECT abonnement_id, voorgesteld_bedrag, status
        FROM abonnementen.aanbevelingen
        WHERE type = 'prijswijziging'
    """).fetchall()
    beslist = {(aid, round(float(bedr), 2)) for aid, bedr, status in bestaande if status in ("geaccepteerd", "geweigerd")}
    open_per_abonnement = {aid: round(float(bedr), 2) for aid, bedr, status in bestaande if status == "open"}

    aantal = 0
    for abonnement_id, afzender, huidig_bedrag, laatste_afschrijving in geaccepteerd:
        huidig_bedrag = round(float(huidig_bedrag), 2)
        overige_geaccepteerde_bedragen = alle_geaccepteerde_bedragen.get(afzender, set())
        nieuwe = transacties_df[
            (transacties_df["afzender"] == afzender)
            & (transacties_df["datum"] > laatste_afschrijving)
            & (~transacties_df["bedrag_eur"].abs().round(2).isin(overige_geaccepteerde_bedragen))
        ]
        if nieuwe.empty:
            continue
        nieuwste = nieuwe.loc[nieuwe["datum"].idxmax()]
        nieuw_bedrag = round(abs(float(nieuwste["bedrag_eur"])), 2)

        if (abonnement_id, nieuw_bedrag) in beslist:
            continue
        if open_per_abonnement.get(abonnement_id) == nieuw_bedrag:
            continue

        con.execute("""
            DELETE FROM abonnementen.aanbevelingen
            WHERE abonnement_id = ? AND type = 'prijswijziging' AND status = 'open'
        """, [abonnement_id])
        con.execute("""
            INSERT INTO abonnementen.aanbevelingen
                (type, afzender, abonnement_id, huidig_bedrag, voorgesteld_bedrag,
                 laatste_afschrijving, status, aangemaakt_op)
            VALUES ('prijswijziging', ?, ?, ?, ?, ?, 'open', now())
        """, [afzender, abonnement_id, huidig_bedrag, nieuw_bedrag, nieuwste["datum"]])
        aantal += 1
    return aantal


def _ververs_logos(con: duckdb.DuckDBPyConnection) -> int:
    rijen = con.execute("""
        SELECT id, domein FROM abonnementen.abonnementen
        WHERE domein IS NOT NULL AND logo_bestand IS NULL
    """).fetchall()
    aantal = 0
    for id_, domein in rijen:
        bestand = _haal_logo_op(domein)
        if bestand:
            con.execute("UPDATE abonnementen.abonnementen SET logo_bestand = ? WHERE id = ?", [bestand, id_])
            aantal += 1
    return aantal


def _ruim_ongebruikte_logos_op(con: duckdb.DuckDBPyConnection) -> int:
    """Verwijdert geüploade/opgehaalde logo-bestanden die door geen enkel
    abonnement meer gerefereerd worden (bv. na het verwijderen van een
    abonnement, of het vervangen van een handmatig geüpload logo)."""
    if not LOGOS_PAD.is_dir():
        return 0
    gebruikt = {
        rij[0] for rij in con.execute(
            "SELECT logo_bestand FROM abonnementen.abonnementen WHERE logo_bestand IS NOT NULL"
        ).fetchall()
    }
    aantal = 0
    for bestand in LOGOS_PAD.iterdir():
        if bestand.is_file() and bestand.name not in gebruikt:
            bestand.unlink()
            aantal += 1
    return aantal


def run_abonnementen(
    con: duckdb.DuckDBPyConnection,
    vandaag: date | None = None,
) -> AbonnementenResultaat:
    vandaag = vandaag or date.today()

    aantal_gemigreerd = _migreer_indien_nodig(con, vandaag)

    # Wees-aanbevelingen opruimen: als een afzender inmiddels (via migratie of
    # handmatige toevoeging) al geaccepteerd is, hoeft een openstaande
    # 'nieuw'-aanbeveling daarvoor niet meer te bestaan.
    con.execute("""
        UPDATE abonnementen.aanbevelingen a
        SET status = 'geaccepteerd', afgehandeld_op = now()
        WHERE a.type = 'nieuw' AND a.status = 'open'
          AND EXISTS (
              SELECT 1 FROM abonnementen.abonnementen ab
              WHERE ab.afzender = a.afzender AND round(ab.bedrag, 2) = round(a.voorgesteld_bedrag, 2)
          )
    """)

    transacties_df = _laad_transacties(con)

    aantal_ververst = _ververs_geaccepteerd(con, transacties_df)
    aantal_doorgerold = _rol_handmatige_datums_door(con, vandaag)

    # Uitsluiten op exact (afzender, bedrag) i.p.v. alleen afzender: sommige
    # afzenders (bv. een verzekeraar) hebben meerdere, gelijktijdig lopende
    # abonnementen op verschillende bedragen — een al-geaccepteerde polis mag
    # een net zo légitieme, nog niet geaccepteerde polis van dezelfde afzender
    # niet aan de detectie onttrekken.
    geaccepteerde_paren = set(
        (afz, round(float(bedr), 2)) for afz, bedr in con.execute(
            "SELECT afzender, bedrag FROM abonnementen.abonnementen WHERE afzender IS NOT NULL"
        ).fetchall()
    )

    kandidaten_df = transacties_df[
        ~pd.Series(
            list(zip(transacties_df["afzender"], transacties_df["bedrag_eur"].abs().round(2))),
            index=transacties_df.index,
        ).isin(geaccepteerde_paren)
    ]
    kandidaten_df = kandidaten_df[~kandidaten_df["categorie"].isin(UITGESLOTEN_CATEGORIEEN)]
    kandidaten_df = kandidaten_df[
        ~((kandidaten_df["categorie"] == "Wonen") & (kandidaten_df["subcategorie"] == "Gemeente/Belasting"))
    ]
    kandidaten_df = kandidaten_df[~kandidaten_df["afzender"].str.contains(PERSOONSNAAM_PATROON, regex=True, na=False)]

    nieuwe_kandidaten = _detecteer_automatisch(kandidaten_df, vandaag)
    aantal_nieuwe_aanbevelingen = _upsert_nieuwe_aanbevelingen(con, nieuwe_kandidaten)

    aantal_prijswijziging_aanbevelingen = _detecteer_prijswijzigingen(con, transacties_df)

    aantal_logos = _ververs_logos(con)
    aantal_logos_opgeruimd = _ruim_ongebruikte_logos_op(con)

    resultaat = AbonnementenResultaat(
        aantal_gemigreerd=aantal_gemigreerd,
        aantal_ververst=aantal_ververst,
        aantal_doorgerold=aantal_doorgerold,
        aantal_nieuwe_aanbevelingen=aantal_nieuwe_aanbevelingen,
        aantal_prijswijziging_aanbevelingen=aantal_prijswijziging_aanbevelingen,
        aantal_logos_opgehaald=aantal_logos,
        aantal_logos_opgeruimd=aantal_logos_opgeruimd,
    )
    logger.info("Abonnementen-stap klaar: %s", resultaat)
    return resultaat
