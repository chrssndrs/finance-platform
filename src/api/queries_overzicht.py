SQL_WIDGETS = """
    SELECT id, titel, categorie, subcategorie, afzender, granulariteit, periode_modus,
           periode_aantal, periode_eenheid, periode_vanaf, periode_tot, weergave, volgorde
    FROM overzicht.widgets
    ORDER BY volgorde, id
"""

SQL_WIDGET_OPHALEN = """
    SELECT id, titel, categorie, subcategorie, afzender, granulariteit, periode_modus,
           periode_aantal, periode_eenheid, periode_vanaf, periode_tot, weergave, volgorde
    FROM overzicht.widgets
    WHERE id = $id
"""

SQL_WIDGET_INVOEGEN = """
    INSERT INTO overzicht.widgets
        (titel, categorie, subcategorie, afzender, granulariteit, periode_modus,
         periode_aantal, periode_eenheid, periode_vanaf, periode_tot, weergave, volgorde, aangemaakt_op)
    VALUES ($titel, $categorie, $subcategorie, $afzender, $granulariteit, $periode_modus,
            $periode_aantal, $periode_eenheid, $periode_vanaf, $periode_tot, $weergave, $volgorde, now())
    RETURNING id
"""

SQL_WIDGET_BIJWERKEN = """
    UPDATE overzicht.widgets
    SET titel = $titel, categorie = $categorie, subcategorie = $subcategorie, afzender = $afzender,
        granulariteit = $granulariteit, periode_modus = $periode_modus, periode_aantal = $periode_aantal,
        periode_eenheid = $periode_eenheid, periode_vanaf = $periode_vanaf, periode_tot = $periode_tot,
        weergave = $weergave, volgorde = $volgorde
    WHERE id = $id
    RETURNING id
"""

SQL_WIDGET_VERWIJDEREN = """
    DELETE FROM overzicht.widgets WHERE id = $id RETURNING id
"""
