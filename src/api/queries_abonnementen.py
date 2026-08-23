# Zelfde interval-tabel als de pipeline (src/pipeline/abonnementen/detectie.py)
# — hier gedupliceerd i.p.v. geïmporteerd, want API en pipeline draaien als
# aparte processen/containers en delen geen Python-modules over die grens heen
# (zie ook DAGEN_PER_MAAND in queries_inboedel.py, zelfde reden).
INTERVAL_DAGEN = {
    "wekelijks": 7,
    "maandelijks": 30.44,
    "tweemaandelijks": 60.87,
    "per_kwartaal": 91.3,
    "jaarlijks": 365,
}

# Genormaliseerd naar een maandbedrag, zodat abonnementen met verschillende
# intervallen bij elkaar opgeteld een zinvol totaal geven.
INTERVAL_NAAR_MAAND_FACTOR = {
    "wekelijks": 52 / 12,
    "maandelijks": 1,
    "tweemaandelijks": 1 / 2,
    "per_kwartaal": 1 / 3,
    "jaarlijks": 1 / 12,
}

SQL_ABONNEMENTEN = """
    SELECT id, naam, afzender, categorie, subcategorie, bedrag::DOUBLE, interval,
           logo_bestand, eerstvolgende_afschrijving, bron
    FROM abonnementen.abonnementen
    ORDER BY eerstvolgende_afschrijving ASC
"""

SQL_ABONNEMENT_INVOEGEN = """
    INSERT INTO abonnementen.abonnementen
        (naam, afzender, categorie, subcategorie, bedrag, interval,
         eerstvolgende_afschrijving, domein, bron, aangemaakt_op)
    VALUES ($naam, $afzender, $categorie, $subcategorie, $bedrag, $interval,
            $eerstvolgende_afschrijving, $domein, 'handmatig', now())
    RETURNING id
"""

SQL_ABONNEMENT_BIJWERKEN = """
    UPDATE abonnementen.abonnementen
    SET naam = $naam, afzender = $afzender, categorie = $categorie, subcategorie = $subcategorie,
        bedrag = $bedrag, interval = $interval, eerstvolgende_afschrijving = $eerstvolgende_afschrijving,
        domein = $domein
    WHERE id = $id
    RETURNING id
"""

SQL_ABONNEMENT_OPHALEN = """
    SELECT id, naam, afzender, categorie, subcategorie, bedrag::DOUBLE, interval,
           logo_bestand, eerstvolgende_afschrijving, bron
    FROM abonnementen.abonnementen
    WHERE id = $id
"""

SQL_ABONNEMENT_VERWIJDEREN = """
    DELETE FROM abonnementen.abonnementen WHERE id = $id RETURNING id
"""

# LEFT JOIN met abonnementen.abonnementen: bij een prijswijziging staan
# naam/categorie/interval/logo niet op de aanbeveling zelf, maar op het
# bestaande abonnement waar de wijziging bij hoort.
SQL_AANBEVELINGEN = """
    SELECT
        a.id, a.type, a.afzender,
        COALESCE(a.naam, ab.naam) AS naam,
        COALESCE(a.categorie, ab.categorie) AS categorie,
        COALESCE(a.subcategorie, ab.subcategorie) AS subcategorie,
        ab.logo_bestand,
        a.huidig_bedrag::DOUBLE,
        a.voorgesteld_bedrag::DOUBLE,
        COALESCE(a.interval, ab.interval) AS interval,
        a.eerstvolgende_afschrijving,
        a.aantal_transacties
    FROM abonnementen.aanbevelingen a
    LEFT JOIN abonnementen.abonnementen ab ON ab.id = a.abonnement_id
    WHERE a.status = 'open'
    ORDER BY a.aangemaakt_op
"""

SQL_AANBEVELING_OPHALEN = """
    SELECT id, type, afzender, abonnement_id, naam, categorie, subcategorie,
           voorgesteld_bedrag::DOUBLE, interval, eerste_afschrijving,
           laatste_afschrijving, eerstvolgende_afschrijving, aantal_transacties
    FROM abonnementen.aanbevelingen
    WHERE id = $id AND status = 'open'
"""

SQL_AANBEVELING_AFHANDELEN = """
    UPDATE abonnementen.aanbevelingen SET status = $status, afgehandeld_op = now()
    WHERE id = $id
    RETURNING id
"""

# Bij het accepteren van een 'nieuw'-aanbeveling: de aanbeveling draagt zelf
# al alle velden van een compleet abonnement, dus rechtstreeks overnemen.
SQL_ABONNEMENT_INVOEGEN_VAN_AANBEVELING = """
    INSERT INTO abonnementen.abonnementen
        (afzender, naam, categorie, subcategorie, bedrag, interval,
         eerste_afschrijving, laatste_afschrijving, eerstvolgende_afschrijving,
         aantal_transacties, bron, aangemaakt_op)
    SELECT afzender, naam, categorie, subcategorie, voorgesteld_bedrag, interval,
           eerste_afschrijving, laatste_afschrijving, eerstvolgende_afschrijving,
           aantal_transacties, 'automatisch', now()
    FROM abonnementen.aanbevelingen
    WHERE id = $id
    RETURNING id
"""

# Bij het accepteren van een 'prijswijziging'-aanbeveling: het bedrag van het
# gekoppelde abonnement bijwerken. eerstvolgende_afschrijving wordt in Python
# berekend (laatste_afschrijving + interval-stap), want DuckDB kent geen
# generieke "tel N dagen op" met een variabele afkomstig uit een lookup-dict.
SQL_ABONNEMENT_PRIJS_BIJWERKEN = """
    UPDATE abonnementen.abonnementen
    SET bedrag = $bedrag, laatste_afschrijving = $laatste_afschrijving,
        eerstvolgende_afschrijving = $eerstvolgende_afschrijving
    WHERE id = $id
"""
