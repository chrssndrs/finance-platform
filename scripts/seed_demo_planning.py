"""Zet wat demo-data neer voor de Planning-module: een handmatige geplande
inkomst, en een inboedel-artikel dat al (bijna) afgeschreven is zodat de
nieuwe "verwacht"-laag ook in de demo iets laat zien.

Draai dit ná `python -m scripts.genereer_demo_data` + een eerste
`python main.py`-run tegen demo/.

Los te draaien: python -m scripts.seed_demo_planning
"""

from datetime import date, timedelta

import duckdb

from src.pipeline.paths import DB_PAD


def main() -> None:
    con = duckdb.connect(str(DB_PAD))
    try:
        # Wasmachine, 6 jaar geleden gekocht met een levensduur van 6 jaar —
        # net (of net niet) afgeschreven, laat de rollover-logica zien.
        con.execute("""
            INSERT INTO inboedel.artikelen (omschrijving, merk, bedrag, datum, levensduur_maanden, aangemaakt_op)
            VALUES ('Wasmachine', 'Bosch', 649.00, ?, 72, now())
        """, [date.today() - timedelta(days=72 * 30)])
        print("Wasmachine (bijna afgeschreven) toegevoegd aan demo-inboedel")

        con.execute("""
            INSERT INTO planning.items (omschrijving, bedrag, datum, aangemaakt_op)
            VALUES ('Verwachte belastingteruggave', 420.00, ?, now())
        """, [date.today() + timedelta(days=20)])
        print("Handmatige planningspost (belastingteruggave) toegevoegd")
    finally:
        con.close()


if __name__ == "__main__":
    main()
