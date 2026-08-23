SQL_ARTIKELEN = """
    SELECT id, omschrijving, merk, model, winkel, bedrag::DOUBLE, datum, levensduur_maanden, serienummer
    FROM inboedel.artikelen
    ORDER BY id
"""

SQL_MERKEN = """
    SELECT DISTINCT merk FROM inboedel.artikelen WHERE merk IS NOT NULL ORDER BY merk
"""

SQL_WINKELS = """
    SELECT DISTINCT winkel FROM inboedel.artikelen WHERE winkel IS NOT NULL ORDER BY winkel
"""

SQL_ARTIKEL_INVOEGEN = """
    INSERT INTO inboedel.artikelen
        (omschrijving, merk, model, winkel, bedrag, datum, levensduur_maanden, serienummer, aangemaakt_op)
    VALUES ($omschrijving, $merk, $model, $winkel, $bedrag, $datum, $levensduur_maanden, $serienummer, now())
    RETURNING id
"""

SQL_ARTIKEL_BIJWERKEN = """
    UPDATE inboedel.artikelen
    SET omschrijving = $omschrijving, merk = $merk, model = $model, winkel = $winkel,
        bedrag = $bedrag, datum = $datum, levensduur_maanden = $levensduur_maanden,
        serienummer = $serienummer
    WHERE id = $id
    RETURNING id
"""

SQL_ARTIKEL_VERWIJDEREN = """
    DELETE FROM inboedel.artikelen WHERE id = $id RETURNING id
"""

# Gemiddelde dagen per maand — zelfde conventie als bij de abonnementen-
# intervallen (src/pipeline/abonnementen/detectie.py), voor consistente
# maand-conversies door de hele app heen.
DAGEN_PER_MAAND = 30.44
