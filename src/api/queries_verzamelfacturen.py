SQL_FACTUREN = """
    SELECT f.id, f.bestandsnaam, f.origineel_bestandsnaam, f.bron, f.totaalbedrag,
           f.transactie_id, f.status, f.geupload_op, t.bedrag_eur
    FROM verzamelfacturen.facturen f
    LEFT JOIN gold.transacties t ON t.transactie_id = f.transactie_id
    ORDER BY f.geupload_op DESC
"""

SQL_FACTUUR_OPHALEN = """
    SELECT f.id, f.bestandsnaam, f.origineel_bestandsnaam, f.bron, f.totaalbedrag,
           f.transactie_id, f.status, f.geupload_op, t.bedrag_eur
    FROM verzamelfacturen.facturen f
    LEFT JOIN gold.transacties t ON t.transactie_id = f.transactie_id
    WHERE f.id = $id
"""

SQL_FACTUUR_INVOEGEN = """
    INSERT INTO verzamelfacturen.facturen
        (bestandsnaam, origineel_bestandsnaam, bron, totaalbedrag, status, geupload_op)
    VALUES ($bestandsnaam, $origineel_bestandsnaam, $bron, $totaalbedrag, 'nieuw', now())
    RETURNING id
"""

SQL_FACTUUR_BIJWERKEN = """
    UPDATE verzamelfacturen.facturen
    SET bron = $bron, totaalbedrag = $totaalbedrag, transactie_id = $transactie_id,
        status = CASE
            WHEN $transactie_id IS NULL THEN 'nieuw'
            WHEN status = 'gesplitst' THEN 'gesplitst'
            ELSE 'gematcht'
        END
    WHERE id = $id
    RETURNING id
"""

SQL_FACTUUR_VERWIJDEREN = """
    DELETE FROM verzamelfacturen.facturen WHERE id = $id RETURNING id
"""

SQL_REGELS_VOOR_FACTUUR = """
    SELECT id, factuur_id, omschrijving, bedrag, categorie, subcategorie
    FROM verzamelfacturen.regels
    WHERE factuur_id = $factuur_id
    ORDER BY id
"""

SQL_REGEL_INVOEGEN = """
    INSERT INTO verzamelfacturen.regels (factuur_id, omschrijving, bedrag, categorie, subcategorie, aangemaakt_op)
    VALUES ($factuur_id, $omschrijving, $bedrag, $categorie, $subcategorie, now())
    RETURNING id
"""

SQL_REGEL_BIJWERKEN = """
    UPDATE verzamelfacturen.regels
    SET omschrijving = $omschrijving, bedrag = $bedrag, categorie = $categorie, subcategorie = $subcategorie
    WHERE id = $id
    RETURNING id, factuur_id
"""

SQL_REGEL_OPHALEN = """
    SELECT id, factuur_id, omschrijving, bedrag, categorie, subcategorie
    FROM verzamelfacturen.regels WHERE id = $id
"""

SQL_REGEL_VERWIJDEREN = """
    DELETE FROM verzamelfacturen.regels WHERE id = $id RETURNING factuur_id
"""

SQL_FACTUUR_STATUS_ZETTEN = """
    UPDATE verzamelfacturen.facturen SET status = $status WHERE id = $id
"""

SQL_AANTAL_REGELS_VOOR_FACTUUR = """
    SELECT COUNT(*) FROM verzamelfacturen.regels WHERE factuur_id = $factuur_id
"""
