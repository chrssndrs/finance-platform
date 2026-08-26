"""Restwaarde-berekening (lineaire afschrijving) voor inboedel-artikelen —
gedeeld tussen de per-artikel-weergave (routers/inboedel.py) en de
vermogensberekening (vermogen_berekening.py), zodat de formule maar op
één plek staat.
"""

from datetime import date

import duckdb

DAGEN_PER_MAAND = 30.44


def bereken_restwaarde(
    bedrag: float | None, datum: date | None, levensduur_maanden: int | None, vandaag: date
) -> float | None:
    if bedrag is None or datum is None or not levensduur_maanden or levensduur_maanden <= 0:
        return None
    leeftijd_dagen = (vandaag - datum).days
    levensduur_dagen = levensduur_maanden * DAGEN_PER_MAAND
    percentage_leven = min(1.0, max(0.0, leeftijd_dagen / levensduur_dagen))
    return round(bedrag * (1 - percentage_leven), 2)


def bereken_opgebouwde_buffer(
    bedrag: float | None, datum: date | None, levensduur_maanden: int | None, vandaag: date
) -> float | None:
    """Een artikel dat langer meegaat dan verwacht kost in die extra tijd
    geen geld — dat 'uitgespaarde' bedrag (tegen hetzelfde dagtarief als de
    afschrijving) bouwt op als een soort informele buffer, tot maximaal het
    aanschafbedrag (dan heb je in feite een tweede exemplaar 'verdiend').
    Los van restwaarde — telt bewust NIET mee in het totale vermogen (dat
    zou een nog gewoon werkend artikel ten onrechte als schuld laten
    aanvoelen); puur een motiverend cijfer op de Spullen-pagina zelf.
    """
    if bedrag is None or datum is None or not levensduur_maanden or levensduur_maanden <= 0:
        return None
    leeftijd_dagen = (vandaag - datum).days
    levensduur_dagen = levensduur_maanden * DAGEN_PER_MAAND
    dagen_voorbij = leeftijd_dagen - levensduur_dagen
    if dagen_voorbij <= 0:
        return 0.0
    dagtarief = bedrag / levensduur_dagen
    return round(min(bedrag, dagen_voorbij * dagtarief), 2)


def dagwaarde_totaal(con: duckdb.DuckDBPyConnection, vandaag: date | None = None) -> float:
    vandaag = vandaag or date.today()
    rijen = con.execute("""
        SELECT bedrag::DOUBLE, datum, levensduur_maanden FROM inboedel.artikelen
    """).fetchall()
    return sum(
        bereken_restwaarde(bedrag, datum, levensduur_maanden, vandaag) or 0.0
        for bedrag, datum, levensduur_maanden in rijen
    )
