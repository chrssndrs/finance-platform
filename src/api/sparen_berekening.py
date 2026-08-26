"""Saldo per geregistreerde spaarrekening — afgeleid uit dezelfde
geïmporteerde bankexports als een gewone betaalrekening (via
instellingen.banken met rekening_type='spaarrekening'), geen aparte
handmatige invoer nodig zodra een spaarrekening als bank geregistreerd is.

bronze.transacties kent het bank-slug per rij, maar dat veld overleeft de
stap naar silver/gold niet (zie silver.py) — de link rekening -> bank wordt
hier dus herleid via rij_hash, die wél door alle lagen heen hetzelfde blijft.
"""

from datetime import date

import duckdb

from src.api.banksaldo_berekening import extrapoleer_saldo

SQL_SPAARREKENINGEN = """
    WITH bank_rekeningen AS (
        SELECT DISTINCT br.bank, s.rekening
        FROM bronze.transacties br
        JOIN silver.transacties s ON s.rij_hash = br.rij_hash
    ),
    spaar_rekeningen AS (
        SELECT DISTINCT b.bank, b.naam, br.rekening
        FROM instellingen.banken b
        JOIN bank_rekeningen br ON br.bank = b.bank
        WHERE b.rekening_type = 'spaarrekening'
    ),
    laatste AS (
        SELECT sr.bank, sr.naam, sr.rekening, t.saldo_na_mutatie::DOUBLE AS saldo, t.datum,
               ROW_NUMBER() OVER (PARTITION BY sr.rekening ORDER BY t.datum DESC) AS rn
        FROM spaar_rekeningen sr
        JOIN gold.transacties t ON t.rekening = sr.rekening AND t.saldo_na_mutatie IS NOT NULL
    )
    SELECT l.bank, l.naam, l.rekening, l.saldo, l.datum, d.alias, d.doelbedrag::DOUBLE
    FROM laatste l
    LEFT JOIN overzicht.spaarrekening_doelen d ON d.rekening = l.rekening
    WHERE l.rn = 1
    ORDER BY l.naam
"""


def bereken_spaarrekeningen(con: duckdb.DuckDBPyConnection, vandaag: date | None = None) -> list[dict]:
    vandaag = vandaag or date.today()
    rijen = con.execute(SQL_SPAARREKENINGEN).fetchall()
    return [
        {
            "bank": bank, "naam": naam, "rekening": rekening, "saldo": saldo, "datum": datum,
            # Een spaarrekening kan nooit negatief staan — de dag-van-de-
            # maand-extrapolatie (gedeeld met het banksaldo, waar een
            # negatief bedrag door roodstand wél normaal is) weet dat zelf
            # niet, dus hier expliciet clampen.
            "geschat_saldo": max(0.0, extrapoleer_saldo(con, saldo, datum, vandaag, rekening)),
            "alias": alias,
            "doelbedrag": doelbedrag,
        }
        for bank, naam, rekening, saldo, datum, alias, doelbedrag in rijen
    ]
