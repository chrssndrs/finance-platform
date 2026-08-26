from datetime import date, timedelta

SQL_CATEGORIEEN = """
    SELECT DISTINCT categorie, subcategorie
    FROM gold.transacties_effectief
    ORDER BY categorie, subcategorie
"""

SQL_AFZENDERS = """
    SELECT DISTINCT afzender
    FROM gold.transacties_effectief
    WHERE afzender IS NOT NULL
      AND ($categorie::VARCHAR IS NULL OR categorie = $categorie)
      AND ($subcategorie::VARCHAR IS NULL OR subcategorie = $subcategorie)
    ORDER BY afzender
"""

SQL_STATUS = """
    SELECT
        (SELECT MAX(afgerond_op) FROM meta.pipeline_runs WHERE status = 'geslaagd') AS laatste_refresh,
        (SELECT MAX(datum) FROM gold.transacties) AS laatste_transactie
"""

SQL_DATUM_BEREIK = """
    SELECT MIN(datum), MAX(datum) FROM gold.transacties
"""

SQL_ONGECATEGORISEERD = """
    SELECT afzender, COUNT(*) AS aantal, SUM(bedrag_eur)::DOUBLE AS totaalbedrag
    FROM gold.transacties
    WHERE categorie = 'Overig' AND afzender IS NOT NULL
      AND (rekening IS NULL OR rekening NOT IN (SELECT rekening FROM gold.spaarrekening_nummers))
    GROUP BY afzender
    ORDER BY aantal DESC
"""

SQL_AFZENDER_CATEGORIE_UPSERT = """
    INSERT INTO gold.afzender_categorieen (afzender, categorie, subcategorie, aangemaakt_op)
    VALUES ($afzender, $categorie, $subcategorie, now())
    ON CONFLICT (afzender) DO UPDATE SET
        categorie = excluded.categorie, subcategorie = excluded.subcategorie, aangemaakt_op = excluded.aangemaakt_op
"""

# Past meteen bestaande ongecategoriseerde transacties toe — zonder hierop
# te wachten op de volgende nachtelijke pipeline-run (die run_gold's
# LEFT JOIN op gold.afzender_categorieen zou hetzelfde effect geven).
SQL_AFZENDER_CATEGORIE_TOEPASSEN = """
    UPDATE gold.transacties SET categorie = $categorie, subcategorie = $subcategorie
    WHERE afzender = $afzender AND categorie = 'Overig'
"""

# Eén enkele transactie handmatig ombuigen vanuit het detailkaartje. In
# tegenstelling tot SQL_AFZENDER_CATEGORIE_TOEPASSEN (alle ongecategoriseerde
# transacties van één afzender) geldt dit ongeacht de huidige categorie —
# een bewuste correctie overschrijft altijd, ook een al-juiste categorie.
SQL_TRANSACTIE_CATEGORIE_TOEPASSEN = """
    UPDATE gold.transacties SET categorie = $categorie, subcategorie = $subcategorie
    WHERE transactie_id = $transactie_id
    RETURNING transactie_id
"""

SQL_TRANSACTIE_DETAIL = """
    SELECT
        t.transactie_id, t.datum, t.naam_omschrijving, t.afzender, t.winkel,
        t.rekening, t.tegenrekening, t.mededelingen, t.bedrag_eur::DOUBLE, t.saldo_na_mutatie::DOUBLE,
        t.categorie, t.subcategorie, t.handmatig_overschreven, t.bronbestand,
        b.ruwe_rij
    FROM gold.transacties_effectief t
    LEFT JOIN bronze.transacties b ON b.rij_hash = t.rij_hash
    WHERE t.transactie_id = $transactie_id
"""

# Meest recente bekende banksaldo — niet elke bank/rij heeft een
# saldo_na_mutatie (afhankelijk van bank_config.saldo_kolom), dus expliciet
# filteren i.p.v. aannemen dat de laatste rij op datum 'm heeft. Sluit
# spaarrekeningen uit: anders kan een recentere spaarrekening-upload het
# banksaldo van de betaalrekening verdringen met het spaarsaldo.
SQL_LAATSTE_SALDO = """
    SELECT saldo_na_mutatie::DOUBLE, datum
    FROM gold.transacties
    WHERE saldo_na_mutatie IS NOT NULL
      AND (rekening IS NULL OR rekening NOT IN (SELECT rekening FROM gold.spaarrekening_nummers))
    ORDER BY datum DESC, ingelezen_op DESC
    LIMIT 1
"""

# Rekeningen waarvan de gebruiker zelf bank-exports heeft geïmporteerd —
# gebruikt om overboekingen naar eigen (bv. spaar-)rekeningen desgewenst
# uit Uitgaven te filteren, zonder dat daar een aparte instelling voor
# hoeft te worden bijgehouden: elke rekening die ooit als 'rekening'
# (i.p.v. tegenrekening) is voorgekomen, is per definitie van de gebruiker.
SQL_EIGEN_REKENINGEN = """
    SELECT DISTINCT rekening FROM gold.transacties WHERE rekening != ''
"""

SQL_TRANSACTIES = """
    SELECT transactie_id, datum, afzender, bedrag_eur::DOUBLE, mededelingen
    FROM gold.transacties_effectief
    WHERE ($categorie::VARCHAR IS NULL OR categorie = $categorie)
      AND ($subcategorie::VARCHAR IS NULL OR subcategorie = $subcategorie)
      AND (len($afzenders::VARCHAR[]) = 0 OR list_contains($afzenders, afzender))
      AND ($vanaf::DATE IS NULL OR datum >= $vanaf)
      AND ($tot::DATE IS NULL OR datum <= $tot)
      AND (len($eigen_rekeningen::VARCHAR[]) = 0 OR tegenrekening IS NULL OR NOT list_contains($eigen_rekeningen, tegenrekening))
    ORDER BY datum DESC
"""

# Vertaalt de gebruiksvriendelijke granulariteit-waarden naar DuckDB's date_trunc-eenheden.
GRANULARITEIT_NAAR_DUCKDB_EENHEID = {
    "dag": "day",
    "week": "week",
    "maand": "month",
    "jaar": "year",
}

SQL_TOTALEN = """
    WITH perioden AS (
        SELECT unnest($periode_starts::DATE[]) AS periode_start
    ),
    gefilterd AS (
        SELECT date_trunc($duckdb_eenheid, datum) AS periode_start, bedrag_eur
        FROM gold.transacties_effectief
        WHERE ($categorie::VARCHAR IS NULL OR categorie = $categorie)
          AND ($subcategorie::VARCHAR IS NULL OR subcategorie = $subcategorie)
          AND (len($afzenders::VARCHAR[]) = 0 OR list_contains($afzenders, afzender))
          AND (len($eigen_rekeningen::VARCHAR[]) = 0 OR tegenrekening IS NULL OR NOT list_contains($eigen_rekeningen, tegenrekening))
    )
    SELECT
        p.periode_start::DATE AS periode_start,
        COALESCE(SUM(CASE WHEN g.bedrag_eur > 0 THEN g.bedrag_eur ELSE 0 END), 0)::DOUBLE AS inkomsten,
        COALESCE(SUM(CASE WHEN g.bedrag_eur < 0 THEN -g.bedrag_eur ELSE 0 END), 0)::DOUBLE AS uitgaven,
        COALESCE(SUM(g.bedrag_eur), 0)::DOUBLE AS totaal
    FROM perioden p
    LEFT JOIN gefilterd g ON g.periode_start = p.periode_start
    GROUP BY p.periode_start
    ORDER BY p.periode_start
"""


def periode_start(vandaag: date, granulariteit: str) -> date:
    if granulariteit == "dag":
        return vandaag
    if granulariteit == "week":
        return vandaag - timedelta(days=vandaag.weekday())
    if granulariteit == "maand":
        return vandaag.replace(day=1)
    if granulariteit == "jaar":
        return vandaag.replace(month=1, day=1)
    raise ValueError(f"Onbekende granulariteit: {granulariteit}")


def _volgende_maand(eerste_van_maand: date, aantal_maanden: int) -> date:
    maand_index = eerste_van_maand.month - 1 + aantal_maanden
    jaar = eerste_van_maand.year + maand_index // 12
    maand = maand_index % 12 + 1
    return date(jaar, maand, 1)


def _volgende_periode(start: date, granulariteit: str, n: int) -> date:
    if granulariteit == "dag":
        return start + timedelta(days=n)
    if granulariteit == "week":
        return start + timedelta(weeks=n)
    if granulariteit == "maand":
        return _volgende_maand(start, n)
    if granulariteit == "jaar":
        return date(start.year + n, start.month, start.day)
    raise ValueError(f"Onbekende granulariteit: {granulariteit}")


def periode_starts_tussen(granulariteit: str, vanaf: date, tot: date) -> list[date]:
    """Alle periode-starts (getrunceerd op granulariteit) tussen vanaf en tot, inclusief beide."""
    start = periode_start(vanaf, granulariteit)
    eind = periode_start(tot, granulariteit)
    resultaat = []
    n = 0
    while True:
        p = _volgende_periode(start, granulariteit, n)
        if p > eind:
            break
        resultaat.append(p)
        n += 1
    return resultaat
