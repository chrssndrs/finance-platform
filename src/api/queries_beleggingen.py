SQL_PORTEFEUILLES = """
    SELECT id, naam FROM beleggingen.portefeuilles ORDER BY id
"""

SQL_PORTEFEUILLE_OPHALEN = """
    SELECT id, naam FROM beleggingen.portefeuilles WHERE id = $id
"""

SQL_PORTEFEUILLE_INVOEGEN = """
    INSERT INTO beleggingen.portefeuilles (naam, aangemaakt_op)
    VALUES ($naam, now())
    RETURNING id
"""

SQL_PORTEFEUILLE_BIJWERKEN = """
    UPDATE beleggingen.portefeuilles SET naam = $naam WHERE id = $id RETURNING id
"""

SQL_PORTEFEUILLE_VERWIJDEREN = """
    DELETE FROM beleggingen.portefeuilles WHERE id = $id RETURNING id
"""

SQL_TRANSACTIES_VERWIJDEREN_VOOR_PORTEFEUILLE = """
    DELETE FROM beleggingen.transacties WHERE portefeuille_id = $portefeuille_id
"""

SQL_TRANSACTIES = """
    SELECT id, portefeuille_id, datum, type, code, naam, aantal::DOUBLE, prijs_per_stuk::DOUBLE, valuta, kosten::DOUBLE
    FROM beleggingen.transacties
    WHERE portefeuille_id = $portefeuille_id
    ORDER BY datum DESC
"""

SQL_TRANSACTIE_OPHALEN = """
    SELECT id, portefeuille_id, datum, type, code, naam, aantal::DOUBLE, prijs_per_stuk::DOUBLE, valuta, kosten::DOUBLE
    FROM beleggingen.transacties
    WHERE id = $id
"""

SQL_TRANSACTIE_INVOEGEN = """
    INSERT INTO beleggingen.transacties
        (portefeuille_id, datum, type, code, naam, aantal, prijs_per_stuk, valuta, kosten, aangemaakt_op)
    VALUES ($portefeuille_id, $datum, $type, $code, $naam, $aantal, $prijs_per_stuk, $valuta, $kosten, now())
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
