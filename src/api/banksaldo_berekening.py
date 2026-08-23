"""Schatting van het actuele banksaldo tussen twee bank-exports in.

Een plat gemiddelde ("X euro per dag") bleek geen goede aanname: vaste
lasten en salaris vallen op specifieke dagen van de maand (bv. hypotheek op
de 1e, salaris rond de 20e-25e), dus het banksaldo beweegt schoksgewijs
i.p.v. gelijkmatig. Dit bouwt in plaats daarvan een profiel van de
gemiddelde nétto mutatie per dag-van-de-maand (over de laatste
`LOOKBACK_MAANDEN` maanden) en telt de dagen tussen het laatst bekende
saldo en vandaag daaruit op — zodat "we zitten net vóór de hypotheek-
afschrijving" of "het salaris is net binnengekomen" wél meetelt.

Gedeeld tussen het banksaldo-endpoint en de vermogensberekening, zodat de
aanname maar op één plek staat.
"""

from datetime import date, timedelta

import duckdb
import pandas as pd

from src.api.queries import SQL_LAATSTE_SALDO

LOOKBACK_MAANDEN = 12


def _maanden_geleden(d: date, aantal: int) -> date:
    maand_index = d.month - 1 - aantal
    jaar = d.year + maand_index // 12
    maand = maand_index % 12 + 1
    return date(jaar, maand, min(d.day, 28))


def _dag_van_maand_profiel(con: duckdb.DuckDBPyConnection, vanaf: date) -> dict[int, float]:
    """Gemiddelde nétto mutatie per dag-van-de-maand (1-31): som van alle
    transacties op die dag-van-de-maand, gedeeld door het aantal distincte
    kalendermaanden waarin die dag daadwerkelijk voorkwam (dus dag 31 wordt
    niet kunstmatig verlaagd door 'm te delen door maanden zonder 31e)."""
    df = con.execute(
        "SELECT datum, bedrag_eur::DOUBLE AS bedrag_eur FROM gold.transacties WHERE datum >= $vanaf",
        {"vanaf": vanaf},
    ).df()
    if df.empty:
        return {}
    datums = pd.to_datetime(df["datum"])
    df["dag"] = datums.dt.day
    df["maand_sleutel"] = datums.dt.to_period("M")
    totaal_per_dag = df.groupby("dag")["bedrag_eur"].sum()
    maanden_per_dag = df.groupby("dag")["maand_sleutel"].nunique()
    return (totaal_per_dag / maanden_per_dag).to_dict()


def _geschatte_mutatie(profiel: dict[int, float], vanaf_exclusief: date, tot_inclusief: date) -> float:
    totaal = 0.0
    d = vanaf_exclusief + timedelta(days=1)
    while d <= tot_inclusief:
        totaal += profiel.get(d.day, 0.0)
        d += timedelta(days=1)
    return totaal


def bereken_banksaldo(con: duckdb.DuckDBPyConnection, vandaag: date | None = None) -> dict:
    vandaag = vandaag or date.today()
    resultaat = con.execute(SQL_LAATSTE_SALDO).fetchone()
    if resultaat is None:
        return {"bedrag": None, "datum": None, "geschat_bedrag": None}

    bedrag, datum = resultaat
    if vandaag <= datum:
        return {"bedrag": bedrag, "datum": datum, "geschat_bedrag": bedrag}

    profiel = _dag_van_maand_profiel(con, _maanden_geleden(vandaag, LOOKBACK_MAANDEN))
    mutatie = _geschatte_mutatie(profiel, datum, vandaag)
    geschat_bedrag = round(bedrag + mutatie, 2)

    return {"bedrag": bedrag, "datum": datum, "geschat_bedrag": geschat_bedrag}
