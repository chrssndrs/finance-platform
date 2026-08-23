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


def dagwaarde_totaal(con: duckdb.DuckDBPyConnection, vandaag: date | None = None) -> float:
    vandaag = vandaag or date.today()
    rijen = con.execute("""
        SELECT bedrag::DOUBLE, datum, levensduur_maanden FROM inboedel.artikelen
    """).fetchall()
    return sum(
        bereken_restwaarde(bedrag, datum, levensduur_maanden, vandaag) or 0.0
        for bedrag, datum, levensduur_maanden in rijen
    )
