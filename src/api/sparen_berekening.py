"""Saldo per geregistreerde spaarrekening — afgeleid uit dezelfde
geïmporteerde bankexports als een gewone betaalrekening (via
instellingen.banken met rekening_type='spaarrekening'), geen aparte
handmatige invoer nodig zodra een spaarrekening als bank geregistreerd is.

bronze.transacties kent het bank-slug per rij, maar dat veld overleeft de
stap naar silver/gold niet (zie silver.py) — de link rekening -> bank wordt
hier dus herleid via rij_hash, die wél door alle lagen heen hetzelfde blijft.
"""

import duckdb

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
    SELECT bank, naam, rekening, saldo, datum FROM laatste WHERE rn = 1 ORDER BY naam
"""


def bereken_spaarrekeningen(con: duckdb.DuckDBPyConnection) -> list[dict]:
    rijen = con.execute(SQL_SPAARREKENINGEN).fetchall()
    return [
        {"bank": bank, "naam": naam, "rekening": rekening, "saldo": saldo, "datum": datum}
        for bank, naam, rekening, saldo, datum in rijen
    ]
