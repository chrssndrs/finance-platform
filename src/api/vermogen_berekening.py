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

    sparen_rij = con.execute("SELECT bedrag::DOUBLE, aangepast_op FROM overzicht.sparen WHERE id = 1").fetchone()
    if sparen_rij is not None:
        bedrag, aangepast_op = sparen_rij
        onderdelen.append({
            "label": "Sparen", "bedrag": bedrag,
            "laatst_bijgewerkt": aangepast_op.date() if aangepast_op else None, "type": "bezit",
        })

    posities = bereken_posities(con)
    beleggingen_totaal = sum(p["huidige_waarde"] or 0.0 for p in posities)
    laatste_koers_datum = con.execute("SELECT MAX(datum) FROM beleggingen.koersen").fetchone()[0]
    onderdelen.append({
        "label": "Beleggingen", "bedrag": beleggingen_totaal,
        "laatst_bijgewerkt": laatste_koers_datum, "type": "bezit",
    })

    woning_rij = con.execute(
        "SELECT waarde::DOUBLE, datum FROM vastgoed.waardes ORDER BY datum DESC LIMIT 1"
    ).fetchone()
    if woning_rij is not None:
        waarde, datum = woning_rij
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
