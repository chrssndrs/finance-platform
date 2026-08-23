SQL_ARTIKELEN = """
    SELECT id, omschrijving, merk, model, winkel, bedrag::DOUBLE, datum, levensduur_maanden
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
        (omschrijving, merk, model, winkel, bedrag, datum, levensduur_maanden, aangemaakt_op)
    VALUES ($omschrijving, $merk, $model, $winkel, $bedrag, $datum, $levensduur_maanden, now())
    RETURNING id
"""

# Gemiddelde dagen per maand — zelfde conventie als bij de abonnementen-
# intervallen (src/pipeline/abonnementen/detectie.py), voor consistente
# maand-conversies door de hele app heen.
DAGEN_PER_MAAND = 30.44
