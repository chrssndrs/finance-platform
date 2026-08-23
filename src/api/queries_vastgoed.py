SQL_WONING_OPHALEN = """
    SELECT adres FROM vastgoed.woning WHERE id = 1
"""

SQL_WONING_BIJWERKEN = """
    UPDATE vastgoed.woning SET adres = $adres, aangepast_op = now() WHERE id = 1
"""

SQL_WAARDES = """
    SELECT id, datum, waarde::DOUBLE, bron, opmerking
    FROM vastgoed.waardes
    ORDER BY datum
"""

SQL_WAARDE_INVOEGEN = """
    INSERT INTO vastgoed.waardes (datum, waarde, bron, opmerking, aangemaakt_op)
    VALUES ($datum, $waarde, $bron, $opmerking, now())
    RETURNING id
"""

SQL_WAARDE_BIJWERKEN = """
    UPDATE vastgoed.waardes
    SET datum = $datum, waarde = $waarde, bron = $bron, opmerking = $opmerking
    WHERE id = $id
    RETURNING id
"""

SQL_WAARDE_VERWIJDEREN = """
    DELETE FROM vastgoed.waardes WHERE id = $id RETURNING id
"""
