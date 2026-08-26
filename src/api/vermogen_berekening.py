"""Vermogensberekening: telt de actuele waarde van elk vermogensonderdeel
bij elkaar op. On-the-fly, geen materialized tabel (zelfde stijl als
hypotheek_berekening.py) — hergebruikt de bestaande berekeningsfuncties van
de andere modules i.p.v. ze te dupliceren.
"""

from datetime import date

import duckdb

from src.api.banksaldo_berekening import bereken_banksaldo
from src.api.beleggingen_berekening import bereken_posities
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
    sparen_totaal = sum(r["saldo"] for r in spaarrekeningen) + handmatig_saldo
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
