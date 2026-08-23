"""Resterende-schuldberekening voor hypotheek-leningdelen: pure rekenkunde
op basis van de opgegeven parameters (geen externe data, dus — anders dan
bij beleggingen_berekening.py — geen koerscache nodig en geen
reindex/forward-fill-gedoe: dit is een gladde, deterministische functie
van de tijd die voor élke datum opnieuw te evalueren is).
"""

from dataclasses import dataclass
from datetime import date

import duckdb


@dataclass
class Leningdeel:
    id: int
    naam: str
    type: str
    hoofdsom: float
    rente_percentage: float
    startdatum: date
    looptijd_maanden: int
    rentevast_tot: date | None


def _maanden_sinds(start: date, op_datum: date) -> int:
    return (op_datum.year - start.year) * 12 + (op_datum.month - start.month) - (1 if op_datum.day < start.day else 0)


def resterende_schuld(deel: Leningdeel, op_datum: date) -> float:
    """Resterende schuld van één leningdeel op een gegeven datum, volgens
    het standaard Nederlandse aflossingsschema voor het opgegeven type.
    Vóór de startdatum: nog niet ingegaan, dus 0. Ná het einde van de
    looptijd: bij annuïteit/lineair volledig afgelost (0); aflossingsvrij
    blijft op de hoofdsom staan (geen automatische aflossing bij einde
    looptijd verondersteld — dat is aan de gebruiker).
    """
    k = _maanden_sinds(deel.startdatum, op_datum)
    n = deel.looptijd_maanden
    p = deel.hoofdsom

    if k < 0:
        return 0.0
    if deel.type == "aflossingsvrij":
        return p
    if k >= n:
        return 0.0

    if deel.type == "lineair":
        return p * (1 - k / n)

    if deel.type == "annuiteit":
        r = deel.rente_percentage / 100 / 12
        if r == 0:
            return p * (1 - k / n)
        maandbedrag = p * r / (1 - (1 + r) ** (-n))
        return p * (1 + r) ** k - maandbedrag * (((1 + r) ** k - 1) / r)

    raise ValueError(f"Onbekend hypotheektype: {deel.type!r}")


def _laad_leningdelen(con: duckdb.DuckDBPyConnection) -> list[Leningdeel]:
    rijen = con.execute("""
        SELECT id, naam, type, hoofdsom::DOUBLE, rente_percentage::DOUBLE,
               startdatum, looptijd_maanden, rentevast_tot
        FROM hypotheek.leningdelen
    """).fetchall()
    return [
        Leningdeel(
            id=id_, naam=naam, type=type_, hoofdsom=hoofdsom, rente_percentage=rente,
            startdatum=startdatum, looptijd_maanden=looptijd, rentevast_tot=rentevast_tot,
        )
        for id_, naam, type_, hoofdsom, rente, startdatum, looptijd, rentevast_tot in rijen
    ]


def _einddatum(deel: Leningdeel) -> date:
    maand_index = deel.startdatum.month - 1 + deel.looptijd_maanden
    jaar = deel.startdatum.year + maand_index // 12
    maand = maand_index % 12 + 1
    return date(jaar, maand, deel.startdatum.day)


def actuele_schuld_totaal(con: duckdb.DuckDBPyConnection, op_datum: date | None = None) -> float:
    op_datum = op_datum or date.today()
    delen = _laad_leningdelen(con)
    return sum(resterende_schuld(deel, op_datum) for deel in delen)


def bereken_verloop(con: duckdb.DuckDBPyConnection) -> list[tuple[date, float]]:
    """Maandelijkse punten van het vroegste startpunt tot het laatste
    einde-looptijd over alle delen — som van elk deel se resterende schuld
    per maand."""
    delen = _laad_leningdelen(con)
    if not delen:
        return []

    start = min(deel.startdatum for deel in delen)
    eind = max(_einddatum(deel) for deel in delen)

    punten = []
    huidig = date(start.year, start.month, 1)
    while huidig <= eind:
        totaal = sum(resterende_schuld(deel, huidig) for deel in delen)
        punten.append((huidig, totaal))
        maand_index = huidig.month + 1
        jaar = huidig.year + (1 if maand_index > 12 else 0)
        maand = 1 if maand_index > 12 else maand_index
        huidig = date(jaar, maand, 1)

    return punten
