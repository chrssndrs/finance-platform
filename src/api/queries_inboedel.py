SQL_ARTIKELEN = """
    SELECT id, omschrijving, merk, model, winkel, categorie, bedrag::DOUBLE, datum, levensduur_maanden, serienummer, wordt_vervangen
    FROM inboedel.artikelen
    ORDER BY id
"""

SQL_MERKEN = """
    SELECT DISTINCT merk FROM inboedel.artikelen WHERE merk IS NOT NULL ORDER BY merk
"""

SQL_WINKELS = """
    SELECT DISTINCT winkel FROM inboedel.artikelen WHERE winkel IS NOT NULL ORDER BY winkel
"""

SQL_CATEGORIEEN = """
    SELECT DISTINCT categorie FROM inboedel.artikelen WHERE categorie IS NOT NULL ORDER BY categorie
"""

SQL_ARTIKEL_INVOEGEN = """
    INSERT INTO inboedel.artikelen
        (omschrijving, merk, model, winkel, categorie, bedrag, datum, levensduur_maanden, serienummer, wordt_vervangen, aangemaakt_op)
    VALUES ($omschrijving, $merk, $model, $winkel, $categorie, $bedrag, $datum, $levensduur_maanden, $serienummer, $wordt_vervangen, now())
    RETURNING id
"""

SQL_ARTIKEL_BIJWERKEN = """
    UPDATE inboedel.artikelen
    SET omschrijving = $omschrijving, merk = $merk, model = $model, winkel = $winkel, categorie = $categorie,
        bedrag = $bedrag, datum = $datum, levensduur_maanden = $levensduur_maanden,
        serienummer = $serienummer, wordt_vervangen = $wordt_vervangen
    WHERE id = $id
    RETURNING id
"""

SQL_ARTIKEL_VERWIJDEREN = """
    DELETE FROM inboedel.artikelen WHERE id = $id RETURNING id
"""
