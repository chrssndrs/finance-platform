"""Schatting van het actuele banksaldo tussen twee bank-exports in: het
laatst bekende saldo (uit de meest recente transactie met een
saldo_na_mutatie) geëxtrapoleerd met de gemiddelde nétto dagelijkse mutatie
(inkomsten min uitgaven, niet alleen uitgaven — salaris e.d. beïnvloedt het
saldo net zo goed) over de laatste `LOOKBACK_DAGEN` dagen. Gedeeld tussen
het banksaldo-endpoint en de vermogensberekening, zodat de aanname maar op
één plek staat.
"""

from datetime import date, timedelta

import duckdb

from src.api.queries import SQL_LAATSTE_SALDO, SQL_NETTO_MUTATIE_VANAF

LOOKBACK_DAGEN = 90


def bereken_banksaldo(con: duckdb.DuckDBPyConnection, vandaag: date | None = None) -> dict:
    vandaag = vandaag or date.today()
    resultaat = con.execute(SQL_LAATSTE_SALDO).fetchone()
    if resultaat is None:
        return {"bedrag": None, "datum": None, "geschat_bedrag": None}

    bedrag, datum = resultaat
    dagen_sinds = (vandaag - datum).days
    if dagen_sinds <= 0:
        return {"bedrag": bedrag, "datum": datum, "geschat_bedrag": bedrag}

    vanaf = vandaag - timedelta(days=LOOKBACK_DAGEN)
    (netto,) = con.execute(SQL_NETTO_MUTATIE_VANAF, {"vanaf": vanaf}).fetchone()
    gemiddelde_per_dag = (netto or 0.0) / LOOKBACK_DAGEN
    geschat_bedrag = round(bedrag + gemiddelde_per_dag * dagen_sinds, 2)

    return {"bedrag": bedrag, "datum": datum, "geschat_bedrag": geschat_bedrag}
