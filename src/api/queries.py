from datetime import date, timedelta

SQL_CATEGORIEEN = """
    SELECT DISTINCT categorie, subcategorie
    FROM gold.transacties
    ORDER BY categorie, subcategorie
"""

SQL_AFZENDERS = """
    SELECT DISTINCT afzender
    FROM gold.transacties
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

SQL_ABONNEMENTEN = """
    SELECT afzender, bedrag, interval, eerstvolgende_afschrijving, logo_bestand
    FROM gold.abonnementen
    ORDER BY eerstvolgende_afschrijving ASC
"""

# Genormaliseerd naar een maandbedrag, zodat abonnementen met verschillende
# intervallen bij elkaar opgeteld een zinvol totaal geven.
INTERVAL_NAAR_MAAND_FACTOR = {
    "wekelijks": 52 / 12,
    "maandelijks": 1,
    "per_kwartaal": 1 / 3,
    "jaarlijks": 1 / 12,
}

SQL_TRANSACTIES = """
    SELECT transactie_id, datum, afzender, bedrag_eur::DOUBLE, mededelingen
    FROM gold.transacties
    WHERE ($categorie::VARCHAR IS NULL OR categorie = $categorie)
      AND ($subcategorie::VARCHAR IS NULL OR subcategorie = $subcategorie)
      AND ($afzender::VARCHAR IS NULL OR afzender = $afzender)
      AND ($vanaf::DATE IS NULL OR datum >= $vanaf)
      AND ($tot::DATE IS NULL OR datum <= $tot)
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
        FROM gold.transacties
        WHERE ($categorie::VARCHAR IS NULL OR categorie = $categorie)
          AND ($subcategorie::VARCHAR IS NULL OR subcategorie = $subcategorie)
          AND ($afzender::VARCHAR IS NULL OR afzender = $afzender)
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


def _periode_start(vandaag: date, granulariteit: str) -> date:
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
    start = _periode_start(vanaf, granulariteit)
    eind = _periode_start(tot, granulariteit)
    resultaat = []
    n = 0
    while True:
        p = _volgende_periode(start, granulariteit, n)
        if p > eind:
            break
        resultaat.append(p)
        n += 1
    return resultaat
