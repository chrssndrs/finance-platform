"""'Magic knop': bepaalt of/wanneer een grote geplande uitgave haalbaar is,
op basis van huidig liquide vermogen (banksaldo + sparen + beleggingen,
ervan uitgaande dat beleggingen direct verkocht kunnen worden) en het
gemiddelde netto maandelijkse overschot uit de recente transactiegeschiedenis.

Het bedrag van ELKE ANDERE geplande uitgave wordt vooraf (nu al, ongeacht
zijn eigen datum) van de beschikbare pot afgetrokken — behandelt elke andere
post als een al toegezegde verplichting. Zonder dit zouden twee losse grote
uitgaven allebei los bekeken "nu al haalbaar" kunnen lijken terwijl er
eigenlijk maar geld is voor één van de twee (hetzelfde geld dubbel
gereserveerd).
"""

from datetime import date

import duckdb

from src.api.banksaldo_berekening import bereken_banksaldo
from src.api.beleggingen_berekening import bereken_posities
from src.api.sparen_berekening import bereken_spaarrekeningen

NETTO_VENSTER_MAANDEN = 6
MAX_MAANDEN_VOORUIT = 120  # 10 jaar — daarna geldt het als "niet haalbaar"


def _volgende_maand(d: date) -> date:
    if d.month == 12:
        return date(d.year + 1, 1, 1)
    return date(d.year, d.month + 1, 1)


def _vorige_maand(d: date) -> date:
    if d.month == 1:
        return date(d.year - 1, 12, 1)
    return date(d.year, d.month - 1, 1)


def huidig_liquide_vermogen(con: duckdb.DuckDBPyConnection, vandaag: date) -> float:
    saldo = bereken_banksaldo(con, vandaag)
    banksaldo = saldo["geschat_bedrag"] or 0.0

    spaarrekeningen = bereken_spaarrekeningen(con)
    sparen_rij = con.execute("SELECT bedrag::DOUBLE FROM overzicht.sparen WHERE id = 1").fetchone()
    handmatig_sparen = sparen_rij[0] if sparen_rij else 0.0
    sparen_totaal = sum(r["geschat_saldo"] for r in spaarrekeningen) + handmatig_sparen

    posities = bereken_posities(con)
    beleggingen_totaal = sum(p["huidige_waarde"] or 0.0 for p in posities)

    return banksaldo + sparen_totaal + beleggingen_totaal


def _gemiddeld_netto_maandelijks(con: duckdb.DuckDBPyConnection, vandaag: date) -> float:
    tot = date(vandaag.year, vandaag.month, 1)
    vanaf = tot
    for _ in range(NETTO_VENSTER_MAANDEN):
        vanaf = _vorige_maand(vanaf)
    totaal = con.execute(
        "SELECT COALESCE(SUM(bedrag_eur), 0)::DOUBLE FROM gold.transacties_effectief WHERE datum >= $vanaf AND datum < $tot",
        {"vanaf": vanaf, "tot": tot},
    ).fetchone()[0]
    return totaal / NETTO_VENSTER_MAANDEN


def bereken_magic_datum(con: duckdb.DuckDBPyConnection, item_id: int, vandaag: date | None = None) -> dict:
    """`{"gevonden": False}` als de post niet bestaat,
    `{"gevonden": True, "is_uitgave": False}` als het een inkomst is (alleen
    uitgaven hebben een zinvol 'wanneer haalbaar'-antwoord)."""
    vandaag = vandaag or date.today()
    rijen = con.execute("SELECT id, bedrag::DOUBLE FROM planning.items").fetchall()
    item = next((r for r in rijen if r[0] == item_id), None)
    if item is None:
        return {"gevonden": False}
    if item[1] >= 0:
        return {"gevonden": True, "is_uitgave": False}
    kosten = abs(item[1])

    andere_gereserveerd = sum(abs(bedrag) for id_, bedrag in rijen if id_ != item_id and bedrag < 0)

    start_vermogen = huidig_liquide_vermogen(con, vandaag)
    netto_maandelijks = _gemiddeld_netto_maandelijks(con, vandaag)
    beschikbaar = start_vermogen - andere_gereserveerd

    maand = date(vandaag.year, vandaag.month, 1)
    for i in range(MAX_MAANDEN_VOORUIT):
        if i > 0:
            beschikbaar += netto_maandelijks
        if beschikbaar >= kosten:
            return {
                "gevonden": True, "is_uitgave": True,
                "haalbaar_op": maand,
                "nu_al_haalbaar": i == 0,
                "huidig_liquide_vermogen": round(start_vermogen, 2),
                "gemiddeld_netto_maandelijks": round(netto_maandelijks, 2),
            }
        maand = _volgende_maand(maand)

    return {
        "gevonden": True, "is_uitgave": True,
        "haalbaar_op": None,
        "nu_al_haalbaar": False,
        "huidig_liquide_vermogen": round(start_vermogen, 2),
        "gemiddeld_netto_maandelijks": round(netto_maandelijks, 2),
    }
