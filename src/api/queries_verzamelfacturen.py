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

# Voor het automatisch koppelen van een geparste creditcard-afschrift-regel
# aan de bank-incasso die 'm daadwerkelijk heeft afgeschreven. Bewust de
# ruwe gold.transacties (niet transacties_effectief) — dit moet een echte,
# ongesplitste bankregel zijn. Sluit transacties uit die al aan een andere
# factuur gekoppeld zijn, zodat een per ongeluk dubbel geüpload afschrift
# niet aan dezelfde transactie gekoppeld raakt.
SQL_TRANSACTIE_MATCH = """
    SELECT t.transactie_id FROM gold.transacties t
    WHERE t.rekening = $rekening AND t.datum = $datum AND ABS(t.bedrag_eur - $bedrag) < 0.01
      AND t.transactie_id NOT IN (
          SELECT transactie_id FROM verzamelfacturen.facturen WHERE transactie_id IS NOT NULL
      )
"""

# Terugkerende afzenders (bv. "APPLE.COM/BILL CORK", "BACKBLAZE INC SAN
# MATEO") krijgen zo automatisch dezelfde categorie als de vorige keer dat
# een regel met exact dezelfde omschrijving handmatig gecategoriseerd is.
SQL_REGEL_CATEGORIE_HISTORIE = """
    SELECT categorie, subcategorie FROM verzamelfacturen.regels
    WHERE lower(trim(omschrijving)) = lower(trim($omschrijving)) AND categorie IS NOT NULL
    ORDER BY aangemaakt_op DESC
    LIMIT 1
"""
