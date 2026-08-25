SQL_LOCATIES = """
    SELECT id, naam FROM contantgeld.locaties ORDER BY id
"""

SQL_LOCATIE_OPHALEN = """
    SELECT id, naam FROM contantgeld.locaties WHERE id = $id
"""

SQL_LOCATIE_INVOEGEN = """
    INSERT INTO contantgeld.locaties (naam, aangemaakt_op)
    VALUES ($naam, now())
    RETURNING id
"""

SQL_LOCATIE_BIJWERKEN = """
    UPDATE contantgeld.locaties SET naam = $naam WHERE id = $id RETURNING id
"""

SQL_LOCATIE_VERWIJDEREN = """
    DELETE FROM contantgeld.locaties WHERE id = $id RETURNING id
"""

SQL_TELLINGEN_VERWIJDEREN_VOOR_LOCATIE = """
    DELETE FROM contantgeld.tellingen WHERE locatie_id = $locatie_id
"""

SQL_TELLINGEN = """
    SELECT locatie_id, coupure::DOUBLE, aantal FROM contantgeld.tellingen
"""

SQL_TELLING_UPSERT = """
    INSERT INTO contantgeld.tellingen (locatie_id, coupure, aantal, bijgewerkt_op)
    VALUES ($locatie_id, $coupure, $aantal, now())
    ON CONFLICT (locatie_id, coupure) DO UPDATE SET aantal = excluded.aantal, bijgewerkt_op = now()
"""
