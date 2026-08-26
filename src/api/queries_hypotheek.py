SQL_LENINGDELEN = """
    SELECT id, locatie_id, naam, type, hoofdsom::DOUBLE, rente_percentage::DOUBLE,
           startdatum, looptijd_maanden, rentevast_tot
    FROM hypotheek.leningdelen
    WHERE $locatie_id::INTEGER IS NULL OR locatie_id = $locatie_id
    ORDER BY startdatum
"""

SQL_LENINGDEEL_OPHALEN = """
    SELECT id, locatie_id, naam, type, hoofdsom::DOUBLE, rente_percentage::DOUBLE,
           startdatum, looptijd_maanden, rentevast_tot
    FROM hypotheek.leningdelen
    WHERE id = $id
"""

SQL_LENINGDEEL_INVOEGEN = """
    INSERT INTO hypotheek.leningdelen
        (locatie_id, naam, type, hoofdsom, rente_percentage, startdatum, looptijd_maanden, rentevast_tot, aangemaakt_op)
    VALUES ($locatie_id, $naam, $type, $hoofdsom, $rente_percentage, $startdatum, $looptijd_maanden, $rentevast_tot, now())
    RETURNING id
"""

SQL_LENINGDEEL_BIJWERKEN = """
    UPDATE hypotheek.leningdelen
    SET locatie_id = $locatie_id, naam = $naam, type = $type, hoofdsom = $hoofdsom,
        rente_percentage = $rente_percentage, startdatum = $startdatum,
        looptijd_maanden = $looptijd_maanden, rentevast_tot = $rentevast_tot
    WHERE id = $id
    RETURNING id
"""

SQL_LENINGDEEL_VERWIJDEREN = """
    DELETE FROM hypotheek.leningdelen WHERE id = $id RETURNING id
"""
