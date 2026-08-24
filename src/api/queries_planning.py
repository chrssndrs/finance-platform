SQL_ITEM_INVOEGEN = """
    INSERT INTO planning.items (omschrijving, bedrag, datum, aangemaakt_op)
    VALUES ($omschrijving, $bedrag, $datum, now())
    RETURNING id
"""

SQL_ITEM_BIJWERKEN = """
    UPDATE planning.items
    SET omschrijving = $omschrijving, bedrag = $bedrag, datum = $datum
    WHERE id = $id
    RETURNING id
"""

SQL_ITEM_VERWIJDEREN = """
    DELETE FROM planning.items WHERE id = $id RETURNING id
"""
