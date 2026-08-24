"""Zet een demo-verzamelfactuur neer (gekoppeld + gesplitst) zodat de nieuwe
Verzamelfacturen-module ook in de demo iets laat zien.

Draai dit ná `python -m scripts.genereer_demo_data` + een eerste
`python main.py`-run tegen demo/.

Los te draaien: python -m scripts.seed_demo_verzamelfacturen
"""

import duckdb

from src.pipeline.paths import DATA_ROOT, DB_PAD


def main() -> None:
    con = duckdb.connect(str(DB_PAD))
    try:
        rij = con.execute("""
            SELECT transactie_id, bedrag_eur FROM gold.transacties
            WHERE afzender = 'Verhuurder Woningen'
            ORDER BY datum DESC LIMIT 1
        """).fetchone()
        if rij is None:
            print("Geen 'Verhuurder Woningen'-transactie gevonden in de demo-data — overgeslagen.")
            return
        transactie_id, bedrag_eur = rij
        totaalbedrag = abs(float(bedrag_eur))

        locatie = con.execute(
            "SELECT verzamelfacturen_locatie FROM instellingen.instellingen WHERE id = 1"
        ).fetchone()[0]
        map_pad = DATA_ROOT / locatie
        map_pad.mkdir(parents=True, exist_ok=True)
        bestandsnaam = "demo_huurspecificatie.txt"
        (map_pad / bestandsnaam).write_text(
            "Demo-huurspecificatie\nHuur: 1100,00\nServicekosten: 100,00\nParkeerplaats: 50,00\n"
        )

        factuur_id = con.execute("""
            INSERT INTO verzamelfacturen.facturen
                (bestandsnaam, origineel_bestandsnaam, bron, totaalbedrag, transactie_id, status, geupload_op)
            VALUES (?, ?, 'Verhuurder Woningen', ?, ?, 'gesplitst', now())
            RETURNING id
        """, [bestandsnaam, "huurspecificatie_augustus.txt", totaalbedrag, transactie_id]).fetchone()[0]

        regels = [
            ("Kale huur", -1100.00, "Wonen", "Huur"),
            ("Servicekosten", -100.00, "Wonen", "Servicekosten"),
            ("Parkeerplaats", -50.00, "Wonen", "Overig"),
        ]
        for omschrijving, bedrag, categorie, subcategorie in regels:
            con.execute("""
                INSERT INTO verzamelfacturen.regels (factuur_id, omschrijving, bedrag, categorie, subcategorie, aangemaakt_op)
                VALUES (?, ?, ?, ?, ?, now())
            """, [factuur_id, omschrijving, bedrag, categorie, subcategorie])

        print(f"Demo-verzamelfactuur aangemaakt (id={factuur_id}), gekoppeld aan transactie {transactie_id} "
              f"({totaalbedrag:.2f}), gesplitst in {len(regels)} regels.")
    finally:
        con.close()


if __name__ == "__main__":
    main()
