SQL_TRANSACTIES = """
    SELECT id, datum, type, code, naam, aantal::DOUBLE, prijs_per_stuk::DOUBLE, valuta, kosten::DOUBLE
    FROM beleggingen.transacties
    ORDER BY datum DESC
"""

SQL_TRANSACTIE_OPHALEN = """
    SELECT id, datum, type, code, naam, aantal::DOUBLE, prijs_per_stuk::DOUBLE, valuta, kosten::DOUBLE
    FROM beleggingen.transacties
    WHERE id = $id
"""

SQL_TRANSACTIE_INVOEGEN = """
    INSERT INTO beleggingen.transacties (datum, type, code, naam, aantal, prijs_per_stuk, valuta, kosten, aangemaakt_op)
    VALUES ($datum, $type, $code, $naam, $aantal, $prijs_per_stuk, $valuta, $kosten, now())
    RETURNING id
"""

SQL_TRANSACTIE_BIJWERKEN = """
    UPDATE beleggingen.transacties
    SET datum = $datum, type = $type, code = $code, naam = $naam, aantal = $aantal,
        prijs_per_stuk = $prijs_per_stuk, valuta = $valuta, kosten = $kosten
    WHERE id = $id
    RETURNING id
"""

SQL_TRANSACTIE_VERWIJDEREN = """
    DELETE FROM beleggingen.transacties WHERE id = $id RETURNING id
"""

SQL_BESTAAT_CODE_AL = """
    SELECT count(*) FROM beleggingen.transacties WHERE code = $code
"""
