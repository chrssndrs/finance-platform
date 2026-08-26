SQL_BANKEN = """
    SELECT bank, naam, locatie, separator, datum_kolom, datum_formaat,
           omschrijving_kolom, rekening_kolom, tegenrekening_kolom,
           bedrag_kolom, bedrag_decimaal_teken, richting_kolom,
           richting_negatief_waarde, mededelingen_kolom, saldo_kolom,
           laatst_gebruikt_op, rekening_type
    FROM instellingen.banken
    ORDER BY laatst_gebruikt_op DESC NULLS LAST, naam
"""

SQL_BANK_OPHALEN = """
    SELECT bank, naam, locatie, separator, datum_kolom, datum_formaat,
           omschrijving_kolom, rekening_kolom, tegenrekening_kolom,
           bedrag_kolom, bedrag_decimaal_teken, richting_kolom,
           richting_negatief_waarde, mededelingen_kolom, saldo_kolom,
           laatst_gebruikt_op, rekening_type
    FROM instellingen.banken WHERE bank = $bank
"""

SQL_BANK_INVOEGEN = """
    INSERT INTO instellingen.banken (
        bank, naam, locatie, separator, datum_kolom, datum_formaat,
        omschrijving_kolom, rekening_kolom, tegenrekening_kolom,
        bedrag_kolom, bedrag_decimaal_teken, richting_kolom,
        richting_negatief_waarde, mededelingen_kolom, saldo_kolom, rekening_type, aangemaakt_op
    ) VALUES ($bank, $naam, $locatie, $separator, $datum_kolom, $datum_formaat,
              $omschrijving_kolom, $rekening_kolom, $tegenrekening_kolom,
              $bedrag_kolom, $bedrag_decimaal_teken, $richting_kolom,
              $richting_negatief_waarde, $mededelingen_kolom, $saldo_kolom, $rekening_type, now())
"""

SQL_BANK_LAATST_GEBRUIKT_ZETTEN = """
    UPDATE instellingen.banken SET laatst_gebruikt_op = now() WHERE bank = $bank
"""

# bank en locatie blijven bewust ongewijzigd: bank is de primary key (en de
# naam van de landingsmap), die zomaar wijzigen zou de koppeling met al
# geüploade bestanden en bronze.transacties.bank breken.
SQL_BANK_BIJWERKEN = """
    UPDATE instellingen.banken
    SET naam = $naam, separator = $separator, datum_kolom = $datum_kolom, datum_formaat = $datum_formaat,
        omschrijving_kolom = $omschrijving_kolom, rekening_kolom = $rekening_kolom,
        tegenrekening_kolom = $tegenrekening_kolom, bedrag_kolom = $bedrag_kolom,
        bedrag_decimaal_teken = $bedrag_decimaal_teken, richting_kolom = $richting_kolom,
        richting_negatief_waarde = $richting_negatief_waarde, mededelingen_kolom = $mededelingen_kolom,
        saldo_kolom = $saldo_kolom, rekening_type = $rekening_type
    WHERE bank = $bank
    RETURNING bank
"""
