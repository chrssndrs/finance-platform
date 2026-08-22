from datetime import date

SQL_CATEGORIEEN = """
    SELECT DISTINCT categorie, subcategorie
    FROM gold.transacties
    ORDER BY categorie, subcategorie
"""

SQL_MAANDTOTALEN = """
    WITH maanden AS (
        SELECT unnest($maand_starts::DATE[]) AS maand_start
    ),
    gefilterd AS (
        SELECT date_trunc('month', datum) AS maand_start, bedrag_eur
        FROM gold.transacties
        WHERE ($categorie::VARCHAR IS NULL OR categorie = $categorie)
          AND ($subcategorie::VARCHAR IS NULL OR subcategorie = $subcategorie)
    )
    SELECT
        strftime(m.maand_start, '%Y-%m') AS maand,
        COALESCE(SUM(CASE WHEN g.bedrag_eur > 0 THEN g.bedrag_eur ELSE 0 END), 0)::DOUBLE AS inkomsten,
        COALESCE(SUM(CASE WHEN g.bedrag_eur < 0 THEN -g.bedrag_eur ELSE 0 END), 0)::DOUBLE AS uitgaven,
        COALESCE(SUM(g.bedrag_eur), 0)::DOUBLE AS totaal
    FROM maanden m
    LEFT JOIN gefilterd g ON g.maand_start = m.maand_start
    GROUP BY m.maand_start
    ORDER BY m.maand_start
"""


def _volgende_maand(eerste_van_maand: date, aantal_maanden: int) -> date:
    maand_index = eerste_van_maand.month - 1 + aantal_maanden
    jaar = eerste_van_maand.year + maand_index // 12
    maand = maand_index % 12 + 1
    return date(jaar, maand, 1)


def maand_starts(aantal: int, vandaag: date | None = None) -> list[date]:
    huidige_maand = (vandaag or date.today()).replace(day=1)
    return [_volgende_maand(huidige_maand, -i) for i in range(aantal - 1, -1, -1)]
