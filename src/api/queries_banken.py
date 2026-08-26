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
