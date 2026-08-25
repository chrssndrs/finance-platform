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

SQL_VOORRAAD = """
    SELECT locatie_id, coupure::DOUBLE, aantal FROM contantgeld.voorraad
"""

SQL_VOORRAAD_VOOR_COUPURE = """
    SELECT aantal FROM contantgeld.voorraad WHERE locatie_id = $locatie_id AND coupure = $coupure
"""

SQL_VOORRAAD_TOTAAL_VOOR_LOCATIE = """
    SELECT COALESCE(SUM(coupure * aantal), 0)::DOUBLE FROM contantgeld.voorraad WHERE locatie_id = $locatie_id
"""

SQL_MUTATIE_INVOEGEN = """
    INSERT INTO contantgeld.mutaties (
        type, datum, locatie_id, locatie_naam, van_locatie_id, van_locatie_naam,
        naar_locatie_id, naar_locatie_naam, omschrijving, categorie, subcategorie, bedrag, aangemaakt_op
    ) VALUES (
        $type, $datum, $locatie_id, $locatie_naam, $van_locatie_id, $van_locatie_naam,
        $naar_locatie_id, $naar_locatie_naam, $omschrijving, $categorie, $subcategorie, $bedrag, now()
    )
    RETURNING id
"""

SQL_MUTATIE_REGEL_INVOEGEN = """
    INSERT INTO contantgeld.mutatie_regels (mutatie_id, coupure, aantal)
    VALUES ($mutatie_id, $coupure, $aantal)
"""

SQL_HISTORIE = """
    SELECT id, type, datum, locatie_naam, van_locatie_naam, naar_locatie_naam,
           omschrijving, categorie, subcategorie, bedrag::DOUBLE, aangemaakt_op
    FROM contantgeld.mutaties
    ORDER BY datum DESC, aangemaakt_op DESC
    LIMIT 200
"""

SQL_HISTORIE_REGELS = """
    SELECT r.mutatie_id, r.coupure::DOUBLE, r.aantal
    FROM contantgeld.mutatie_regels r
    JOIN (
        SELECT id FROM contantgeld.mutaties ORDER BY datum DESC, aangemaakt_op DESC LIMIT 200
    ) recent ON recent.id = r.mutatie_id
"""
