"""Geplande in-/uitgaven: combineert handmatig ingevoerde planning.items met
live-berekende posten voor bijna-afgeschreven inboedel — on-the-fly, geen
materialized tabel (zelfde stijl als vermogen_berekening.py/
hypotheek_berekening.py).
"""

import calendar
from datetime import date, timedelta

import duckdb

from src.api.inboedel_berekening import DAGEN_PER_MAAND


def _plus_een_kalendermaand(datum: date) -> date:
    """Telt één kalendermaand op, met dezelfde dag-van-de-maand (geclamped
    naar de laatste dag als die in de doelmaand niet bestaat, bv. 31 jan ->
    28/29 feb). In tegenstelling tot "+30 dagen" drift dit nooit weg van een
    vaste dag-van-de-maand.
    """
    if datum.month == 12:
        jaar, maand = datum.year + 1, 1
    else:
        jaar, maand = datum.year, datum.month + 1
    laatste_dag = calendar.monthrange(jaar, maand)[1]
    return date(jaar, maand, min(datum.day, laatste_dag))


def verwachte_datum(datum_aankoop: date, levensduur_maanden: int, vandaag: date) -> date:
    """Datum waarop de vervangingskosten gepland staan. Zolang een artikel
    al voorbij zijn levensduur is maar nog niet vervangen (uit inboedel
    verwijderd), schuift deze datum telkens een kalendermaand op — zo blijft
    de post in beeld als "aankomend" i.p.v. weg te zakken in het verleden.
    Kalendermaanden i.p.v. "+30 dagen": dat laatste drift geleidelijk weg van
    de oorspronkelijke dag-van-de-maand (1 jul -> 31 jul -> 30 aug -> ...).
    """
    eind_datum = datum_aankoop + timedelta(days=round(levensduur_maanden * DAGEN_PER_MAAND))
    while eind_datum < vandaag:
        eind_datum = _plus_een_kalendermaand(eind_datum)
    return eind_datum


def bereken_inboedel_planning(
    con: duckdb.DuckDBPyConnection, vandaag: date, drempel_modus: str, drempel_waarde: float
) -> list[dict]:
    rijen = con.execute("""
        SELECT id, omschrijving, bedrag::DOUBLE, datum, levensduur_maanden
        FROM inboedel.artikelen
        WHERE bedrag IS NOT NULL AND datum IS NOT NULL
          AND levensduur_maanden IS NOT NULL AND levensduur_maanden > 0
          AND wordt_vervangen
    """).fetchall()

    posten = []
    for artikel_id, omschrijving, bedrag, datum, levensduur_maanden in rijen:
        leeftijd_dagen = (vandaag - datum).days
        levensduur_dagen = levensduur_maanden * DAGEN_PER_MAAND
        percentage_leven = leeftijd_dagen / levensduur_dagen
        maanden_tot_afschrijving = levensduur_maanden - (leeftijd_dagen / DAGEN_PER_MAAND)
        is_afgeschreven = leeftijd_dagen >= levensduur_dagen

        in_aanmerking = (
            (drempel_modus == "maanden" and maanden_tot_afschrijving <= drempel_waarde)
            or (drempel_modus == "percentage" and percentage_leven >= drempel_waarde / 100)
        )
        if not in_aanmerking:
            continue

        posten.append({
            "id": None,
            "omschrijving": f"Vervanging: {omschrijving}",
            "bedrag": round(-bedrag, 2),
            "datum": verwachte_datum(datum, levensduur_maanden, vandaag),
            "bron": "inboedel",
            "artikel_id": artikel_id,
            "is_afgeschreven": is_afgeschreven,
        })
    return posten


def bereken_inboedel_kosten_per_maand(
    con: duckdb.DuckDBPyConnection, vandaag: date, maanden_vooruit: int
) -> list[dict]:
    """Verwachte inboedel-vervangingskosten, gebucket per kalendermaand voor
    de komende `maanden_vooruit` maanden — een volledige projectie over ALLE
    te vervangen artikelen, los van de planning-drempel (die alleen bepaalt
    welke posten al als 'binnenkort'/'afgeschreven' in de losse lijst
    verschijnen). Geeft dus ook zicht op kosten die pas ver in de toekomst
    verwacht worden.
    """
    rijen = con.execute("""
        SELECT bedrag::DOUBLE, datum, levensduur_maanden
        FROM inboedel.artikelen
        WHERE bedrag IS NOT NULL AND datum IS NOT NULL
          AND levensduur_maanden IS NOT NULL AND levensduur_maanden > 0
          AND wordt_vervangen
    """).fetchall()

    start_maand = date(vandaag.year, vandaag.month, 1)
    maanden = []
    maand = start_maand
    for _ in range(maanden_vooruit):
        maanden.append(maand)
        maand = _plus_een_kalendermaand(maand)
    eind_exclusief = maand

    totalen = {m: 0.0 for m in maanden}
    for bedrag, datum, levensduur_maanden in rijen:
        verwacht = verwachte_datum(datum, levensduur_maanden, vandaag)
        verwacht_maand = date(verwacht.year, verwacht.month, 1)
        if start_maand <= verwacht_maand < eind_exclusief:
            totalen[verwacht_maand] += bedrag

    return [{"maand": m.isoformat()[:7], "bedrag": round(-totalen[m], 2) or 0.0} for m in maanden]


def bereken_planning_items(con: duckdb.DuckDBPyConnection, vandaag: date | None = None) -> list[dict]:
    vandaag = vandaag or date.today()

    handmatig = con.execute(
        "SELECT id, omschrijving, bedrag::DOUBLE, datum FROM planning.items"
    ).fetchall()
    posten = [
        {
            "id": id_,
            "omschrijving": omschrijving,
            "bedrag": bedrag,
            "datum": datum,
            "bron": "handmatig",
            "artikel_id": None,
            "is_afgeschreven": False,
        }
        for id_, omschrijving, bedrag, datum in handmatig
    ]

    drempel_modus, drempel_waarde = con.execute(
        "SELECT planning_drempel_modus, planning_drempel_waarde FROM instellingen.instellingen WHERE id = 1"
    ).fetchone()
    posten += bereken_inboedel_planning(con, vandaag, drempel_modus, drempel_waarde)

    # Posten zonder datum (nog niet gepland) onderaan, in plaats van een
    # TypeError bij het vergelijken van None met een date.
    posten.sort(key=lambda p: (p["datum"] is None, p["datum"]))
    return posten
