"""Vermogensberekening: telt de actuele waarde van elk vermogensonderdeel
bij elkaar op. On-the-fly, geen materialized tabel (zelfde stijl als
hypotheek_berekening.py) — hergebruikt de bestaande berekeningsfuncties van
de andere modules i.p.v. ze te dupliceren.
"""

import calendar
from datetime import date

import duckdb

from src.api.banksaldo_berekening import bereken_banksaldo
from src.api.beleggingen_berekening import bereken_portfolio_reeks, bereken_posities
from src.api.hypotheek_berekening import actuele_schuld_totaal
from src.api.inboedel_berekening import dagwaarde_totaal
from src.api.sparen_berekening import bereken_spaarrekeningen


def bereken_overzicht(con: duckdb.DuckDBPyConnection) -> list[dict]:
    vandaag = date.today()
    onderdelen = []

    saldo = bereken_banksaldo(con, vandaag)
    if saldo["bedrag"] is not None:
        # geschat_bedrag i.p.v. het rauwe laatst-bekende bedrag voor het
        # vermogenstotaal — laatst_bijgewerkt blijft wel de échte datadatum,
        # niet "vandaag", zodat je nog steeds ziet hoe recent de onderliggende
        # data is (is_geschat markeert dit onderdeel als extrapolatie).
        onderdelen.append({
            "label": "Banksaldo", "bedrag": saldo["geschat_bedrag"],
            "laatst_bijgewerkt": saldo["datum"], "type": "bezit", "is_geschat": True,
        })

    # Som van elke geregistreerde spaarrekening (afgeleid uit bankexports)
    # plus het handmatige restbedrag — zelfde bron als de Sparen-module,
    # niet los opnieuw berekend.
    spaarrekeningen = bereken_spaarrekeningen(con)
    sparen_rij = con.execute("SELECT bedrag::DOUBLE, aangepast_op FROM overzicht.sparen WHERE id = 1").fetchone()
    handmatig_saldo, handmatig_aangepast_op = sparen_rij if sparen_rij is not None else (0.0, None)
    sparen_totaal = sum(r["geschat_saldo"] for r in spaarrekeningen) + handmatig_saldo
    if spaarrekeningen or handmatig_saldo:
        laatste_datums = [r["datum"] for r in spaarrekeningen] + (
            [handmatig_aangepast_op.date()] if handmatig_saldo and handmatig_aangepast_op else []
        )
        onderdelen.append({
            "label": "Sparen", "bedrag": sparen_totaal,
            "laatst_bijgewerkt": max(laatste_datums) if laatste_datums else None, "type": "bezit",
        })

    posities = bereken_posities(con)
    beleggingen_totaal = sum(p["huidige_waarde"] or 0.0 for p in posities)
    laatste_koers_datum = con.execute("SELECT MAX(datum) FROM beleggingen.koersen").fetchone()[0]
    onderdelen.append({
        "label": "Beleggingen", "bedrag": beleggingen_totaal,
        "laatst_bijgewerkt": laatste_koers_datum, "type": "bezit",
    })

    # Som van de laatst bekende waarde PER locatie — niet zomaar de meest
    # recente rij over alle locaties heen (dat zou bij meerdere panden alle
    # andere panden dan het net-bijgewerkte laten verdwijnen uit het vermogen).
    vastgoed_rij = con.execute("""
        WITH laatste AS (
            SELECT locatie_id, waarde::DOUBLE AS waarde, datum,
                   ROW_NUMBER() OVER (PARTITION BY locatie_id ORDER BY datum DESC) AS rn
            FROM vastgoed.waardes
            WHERE locatie_id IS NOT NULL
        )
        SELECT SUM(waarde)::DOUBLE, MAX(datum) FROM laatste WHERE rn = 1
    """).fetchone()
    if vastgoed_rij is not None and vastgoed_rij[0] is not None:
        waarde, datum = vastgoed_rij
        onderdelen.append({"label": "Woningwaarde", "bedrag": waarde, "laatst_bijgewerkt": datum, "type": "bezit"})

    onderdelen.append({
        "label": "Hypotheekschuld", "bedrag": actuele_schuld_totaal(con, vandaag),
        "laatst_bijgewerkt": vandaag, "type": "schuld",
    })

    onderdelen.append({
        "label": "Inboedel (dagwaarde)", "bedrag": dagwaarde_totaal(con, vandaag),
        "laatst_bijgewerkt": vandaag, "type": "bezit",
    })

    return onderdelen


def bereken_totaal(onderdelen: list[dict]) -> float:
    bezit = sum(o["bedrag"] for o in onderdelen if o["type"] == "bezit")
    schuld = sum(o["bedrag"] for o in onderdelen if o["type"] == "schuld")
    return bezit - schuld


def _laatste_dagen_van_maanden(vandaag: date, aantal_maanden: int) -> list[date]:
    """Laatste dag van elke maand, van (aantal_maanden - 1) maanden geleden
    tot en met deze maand — voor de huidige (nog niet afgelopen) maand wordt
    vandaag zelf gebruikt i.p.v. een datum in de toekomst."""
    datums = []
    for i in range(aantal_maanden - 1, -1, -1):
        maand_index = vandaag.month - 1 - i
        jaar = vandaag.year + maand_index // 12
        maand = maand_index % 12 + 1
        laatste_dag = calendar.monthrange(jaar, maand)[1]
        d = date(jaar, maand, laatste_dag)
        datums.append(min(d, vandaag))
    return datums


def _vermogen_op_datum(con: duckdb.DuckDBPyConnection, op_datum: date) -> float:
    """Reconstrueert het totale vermogen op een datum in het verleden, met
    dezelfde onderdelen als bereken_overzicht — maar met écht historische
    waardes waar die bestaan (banksaldo/sparen via saldo_na_mutatie, beleggingen
    via de dagelijkse portfolio-reeks, vastgoed via de laatst bekende waarde
    per locatie, hypotheek/inboedel zijn toch al als functie van een datum
    berekenbaar) i.p.v. de 'geschatte' extrapolatie die bereken_overzicht voor
    ván-vandaag gebruikt — die extrapolatie is alleen zinvol tussen de laatste
    upload en nu, niet voor een sowieso-al-voorbije maand."""
    banksaldo_rij = con.execute(
        """
        SELECT saldo_na_mutatie::DOUBLE FROM gold.transacties
        WHERE saldo_na_mutatie IS NOT NULL AND datum <= $datum
          AND (rekening IS NULL OR rekening NOT IN (SELECT rekening FROM gold.spaarrekening_nummers))
        ORDER BY datum DESC, ingelezen_op DESC LIMIT 1
        """,
        {"datum": op_datum},
    ).fetchone()
    banksaldo = banksaldo_rij[0] if banksaldo_rij else 0.0

    sparen_rij = con.execute(
        """
        WITH laatste AS (
            SELECT rekening, saldo_na_mutatie::DOUBLE AS saldo,
                   ROW_NUMBER() OVER (PARTITION BY rekening ORDER BY datum DESC) AS rn
            FROM gold.transacties
            WHERE saldo_na_mutatie IS NOT NULL AND datum <= $datum
              AND rekening IN (SELECT rekening FROM gold.spaarrekening_nummers)
        )
        SELECT COALESCE(SUM(saldo), 0)::DOUBLE FROM laatste WHERE rn = 1
        """,
        {"datum": op_datum},
    ).fetchone()
    sparen_rekeningen_totaal = sparen_rij[0] if sparen_rij else 0.0
    handmatig_rij = con.execute("SELECT bedrag::DOUBLE FROM overzicht.sparen WHERE id = 1").fetchone()
    sparen_totaal = sparen_rekeningen_totaal + (handmatig_rij[0] if handmatig_rij else 0.0)

    beleggingen_reeks = bereken_portfolio_reeks(con, portefeuille_id=None, tot=op_datum)
    beleggingen_waarde = beleggingen_reeks[-1][1] if beleggingen_reeks else 0.0

    vastgoed_rij = con.execute(
        """
        WITH laatste AS (
            SELECT locatie_id, waarde::DOUBLE AS waarde,
                   ROW_NUMBER() OVER (PARTITION BY locatie_id ORDER BY datum DESC) AS rn
            FROM vastgoed.waardes
            WHERE locatie_id IS NOT NULL AND datum <= $datum
        )
        SELECT SUM(waarde)::DOUBLE FROM laatste WHERE rn = 1
        """,
        {"datum": op_datum},
    ).fetchone()
    vastgoed_waarde = vastgoed_rij[0] if vastgoed_rij and vastgoed_rij[0] is not None else 0.0

    hypotheekschuld = actuele_schuld_totaal(con, op_datum)
    inboedel_waarde = dagwaarde_totaal(con, op_datum)

    return banksaldo + sparen_totaal + beleggingen_waarde + vastgoed_waarde - hypotheekschuld + inboedel_waarde


def bereken_vermogen_per_maand(con: duckdb.DuckDBPyConnection, aantal_maanden: int) -> list[dict]:
    vandaag = date.today()
    punten = []
    vorige_vermogen = None
    for op_datum in _laatste_dagen_van_maanden(vandaag, aantal_maanden):
        vermogen = round(_vermogen_op_datum(con, op_datum), 2)
        mutatie = round(vermogen - vorige_vermogen, 2) if vorige_vermogen is not None else None
        punten.append({"maand": f"{op_datum.year:04d}-{op_datum.month:02d}", "vermogen": vermogen, "mutatie": mutatie})
        vorige_vermogen = vermogen
    return punten
