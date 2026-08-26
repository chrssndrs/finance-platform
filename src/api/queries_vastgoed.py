SQL_LOCATIES = """
    SELECT id, adres FROM vastgoed.locaties ORDER BY id
"""

SQL_LOCATIE_OPHALEN = """
    SELECT id, adres FROM vastgoed.locaties WHERE id = $id
"""

SQL_LOCATIE_INVOEGEN = """
    INSERT INTO vastgoed.locaties (adres, aangemaakt_op)
    VALUES ($adres, now())
    RETURNING id
"""

SQL_LOCATIE_BIJWERKEN = """
    UPDATE vastgoed.locaties SET adres = $adres WHERE id = $id RETURNING id
"""

SQL_LOCATIE_VERWIJDEREN = """
    DELETE FROM vastgoed.locaties WHERE id = $id RETURNING id
"""

SQL_WAARDES_VERWIJDEREN_VOOR_LOCATIE = """
    DELETE FROM vastgoed.waardes WHERE locatie_id = $locatie_id
"""

SQL_WAARDES = """
    SELECT id, locatie_id, datum, waarde::DOUBLE, bron, opmerking
    FROM vastgoed.waardes
    WHERE locatie_id = $locatie_id
    ORDER BY datum
"""

SQL_WAARDE_INVOEGEN = """
    INSERT INTO vastgoed.waardes (locatie_id, datum, waarde, bron, opmerking, aangemaakt_op)
    VALUES ($locatie_id, $datum, $waarde, $bron, $opmerking, now())
    RETURNING id
"""

SQL_WAARDE_BIJWERKEN = """
    UPDATE vastgoed.waardes
    SET datum = $datum, waarde = $waarde, bron = $bron, opmerking = $opmerking
    WHERE id = $id
    RETURNING id, locatie_id
"""

SQL_WAARDE_VERWIJDEREN = """
    DELETE FROM vastgoed.waardes WHERE id = $id RETURNING id
"""
