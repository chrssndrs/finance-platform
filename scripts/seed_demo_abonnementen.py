"""Zet de demo-abonnementen in een staat die alle vier nieuwe flows laat zien
(zie de "Nieuwe wensen" abonnementen-checklist): een openstaande
nieuw-abonnement-aanbeveling, een geweigerde aanbeveling die niet terugkomt,
een prijswijziging-aanbeveling, en een puur handmatig abonnement.

Draai dit ná `python -m scripts.genereer_demo_data` + een eerste
`python main.py`-run tegen demo/ (die run levert de 'nieuw'-aanbevelingen op
die dit script accepteert/weigert). Draai main.py daarna nogmaals, zodat de
Autoclub NL-prijswijziging gedetecteerd wordt.

Los te draaien: python -m scripts.seed_demo_abonnementen
"""

from datetime import date, timedelta

import duckdb

from src.api.queries_abonnementen import SQL_ABONNEMENT_INVOEGEN_VAN_AANBEVELING
from src.pipeline.paths import DB_PAD

# Blijft bewust open — laat de "nieuw abonnement gevonden"-aanbeveling zien.
NIET_ACCEPTEREN = {"CloudGuard Backup"}
# Wordt geweigerd — laat zien dat een weigering niet terugkomt na een her-run.
WEIGEREN = {("StroomDirect", 95.00)}


def main() -> None:
    con = duckdb.connect(str(DB_PAD))
    try:
        open_nieuw = con.execute("""
            SELECT id, afzender, voorgesteld_bedrag FROM abonnementen.aanbevelingen
            WHERE type = 'nieuw' AND status = 'open'
        """).fetchall()

        aantal_geaccepteerd = 0
        aantal_geweigerd = 0
        for id_, afzender, bedrag in open_nieuw:
            sleutel = (afzender, round(float(bedrag), 2))
            if afzender in NIET_ACCEPTEREN:
                continue
            if sleutel in WEIGEREN:
                con.execute(
                    "UPDATE abonnementen.aanbevelingen SET status='geweigerd', afgehandeld_op=now() WHERE id=?",
                    [id_],
                )
                aantal_geweigerd += 1
                continue
            con.execute(SQL_ABONNEMENT_INVOEGEN_VAN_AANBEVELING, {"id": id_})
            con.execute(
                "UPDATE abonnementen.aanbevelingen SET status='geaccepteerd', afgehandeld_op=now() WHERE id=?",
                [id_],
            )
            aantal_geaccepteerd += 1
        print(f"{aantal_geaccepteerd} aanbevelingen geaccepteerd, {aantal_geweigerd} geweigerd, "
              f"{len(NIET_ACCEPTEREN)} bewust open gelaten")

        # Autoclub NL: handmatig invoegen op een oude prijs (i.p.v. accepteren
        # op de huidige) — de eerstvolgende pipeline-run vindt dan zelf dat de
        # prijs inmiddels gestegen is en stelt een prijswijziging voor.
        oudste = con.execute("""
            SELECT bedrag_eur, datum FROM gold.transacties
            WHERE afzender = 'Autoclub NL' ORDER BY datum ASC LIMIT 1
        """).fetchone()
        if oudste:
            oud_bedrag, oude_datum = oudste
            con.execute("""
                INSERT INTO abonnementen.abonnementen
                    (afzender, naam, categorie, subcategorie, bedrag, interval,
                     eerste_afschrijving, laatste_afschrijving, eerstvolgende_afschrijving,
                     aantal_transacties, bron, aangemaakt_op)
                VALUES ('Autoclub NL', 'Autoclub NL — lidmaatschap', 'Verzekeringen', 'Overig',
                        ?, 'jaarlijks', ?, ?, ?, 1, 'handmatig', now())
            """, [abs(float(oud_bedrag)), oude_datum, oude_datum, oude_datum + timedelta(days=365)])
            print(f"Autoclub NL handmatig toegevoegd op oude prijs €{abs(float(oud_bedrag)):.2f} ({oude_datum})")

        # Puur handmatig abonnement, geen bank-koppeling.
        con.execute("""
            INSERT INTO abonnementen.abonnementen
                (afzender, naam, categorie, subcategorie, bedrag, interval, eerstvolgende_afschrijving,
                 bron, aangemaakt_op)
            VALUES (NULL, 'Sportschool FitPunt (contant)', 'Vrije tijd', 'Sport', 39.00, 'maandelijks', ?,
                    'handmatig', now())
        """, [date.today() + timedelta(days=10)])
        print("Sportschool FitPunt (puur handmatig, geen bank-koppeling) toegevoegd")
    finally:
        con.close()


if __name__ == "__main__":
    main()
