"""Portfolio-waardeberekening: leest transacties + gecachte koersen/
wisselkoersen en berekent de waardeontwikkeling on-the-fly (geen
gematerialiseerde tabel — bij dit datavolume ruim snel genoeg, en zo hoeft er
nergens iets ongeldig gemaakt te worden zodra een transactie wijzigt).
"""

from datetime import date

import duckdb
import pandas as pd

TEKEN = {"koop": 1, "verkoop": -1}


def _laad_dataframes(con: duckdb.DuckDBPyConnection) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    # Expliciete AS-aliassen nodig: DuckDB's .df() gebruikt de kolomnaam die
    # de cast-expressie oplevert, niet vanzelfsprekend de oorspronkelijke
    # kolomnaam (i.t.t. fetchall(), waar toch positioneel uitgepakt wordt).
    transacties = con.execute("""
        SELECT datum, type, code, naam, aantal::DOUBLE AS aantal,
               prijs_per_stuk::DOUBLE AS prijs_per_stuk, valuta
        FROM beleggingen.transacties
    """).df()
    koersen = con.execute("""
        SELECT code, datum, slotkoers::DOUBLE AS slotkoers FROM beleggingen.koersen
    """).df()
    wisselkoersen = con.execute("""
        SELECT valuta, datum, koers::DOUBLE AS koers FROM beleggingen.wisselkoersen
    """).df()
    # Als pandas Timestamp (niet .dt.date) laten — twee kolommen van
    # object-dtype `date`-waarden (bv. van twee verschillende beurskalenders)
    # sorteren/mergen niet betrouwbaar bij een concat/reindex; datetime64 doet
    # dat wel. Pas op de uiteindelijke API-grens terug naar `date` omzetten.
    for df in (transacties, koersen, wisselkoersen):
        if not df.empty:
            df["datum"] = pd.to_datetime(df["datum"])
    return transacties, koersen, wisselkoersen


def _fx_serie(wisselkoersen: pd.DataFrame, valuta: str, datums: pd.Series) -> pd.Series | None:
    if valuta == "EUR":
        return None
    fx_rijen = wisselkoersen[wisselkoersen["valuta"] == valuta].sort_values("datum")
    if fx_rijen.empty:
        return None
    fx = fx_rijen.set_index("datum")["koers"]
    return fx.reindex(datums).ffill().bfill()


def bereken_portfolio_reeks(
    con: duckdb.DuckDBPyConnection, code_filter: str | None = None,
    vanaf: date | None = None, tot: date | None = None,
) -> list[tuple[object, float]]:
    """Waarde van de (gefilterde of totale) portfolio per dag waarop er
    koersdata is. Gefilterd op één code: de waarde van díe positie alleen
    (aantal-in-bezit x koers) — begint op 0 vóór de eerste aankoop, eindigt
    op 0 ná volledige verkoop. Geen filter: som over alle codes.

    vanaf/tot knippen alleen de GETOONDE reeks in — de positie-opbouw zelf
    (cumsum van alle transacties) rekent altijd vanaf het allereerste begin
    door, anders zou een venster dat na de eerste aankoop begint een
    verkeerd (te lage) aantal-in-bezit laten zien.
    """
    transacties, koersen, wisselkoersen = _laad_dataframes(con)
    if code_filter:
        transacties = transacties[transacties["code"] == code_filter]
    if transacties.empty:
        return []

    codes = transacties["code"].unique().tolist()
    reeksen = []

    for code in codes:
        code_transacties = transacties[transacties["code"] == code].sort_values("datum")
        code_koersen = koersen[koersen["code"] == code].sort_values("datum")
        if code_koersen.empty:
            continue

        delta = code_transacties["type"].map(TEKEN) * code_transacties["aantal"]
        positie_per_dag = delta.groupby(code_transacties["datum"]).sum().cumsum()

        datums = code_koersen["datum"]
        positie = positie_per_dag.reindex(datums, method="ffill").fillna(0)
        prijzen = code_koersen.set_index("datum")["slotkoers"].reindex(datums)

        waarde = positie.to_numpy() * prijzen.to_numpy()
        valuta = code_transacties["valuta"].iloc[-1] if not code_transacties.empty else "EUR"
        fx = _fx_serie(wisselkoersen, valuta, datums)
        if fx is not None:
            waarde = waarde / fx.to_numpy()

        reeksen.append(pd.Series(waarde, index=pd.Index(datums, name="datum")))

    if not reeksen:
        return []

    # Elke reeks staat op de handelsdagen van zijn eigen beurs — op een
    # Amsterdamse feestdag waarop de NASDAQ wel open is (bv. 1 mei, 2e
    # paasdag) mist VUSA.AS dan een datum die AAPL wel heeft. Zonder ffill()
    # zou die dag als 0 meetellen i.p.v. de laatst bekende waarde, wat het
    # totaal tijdelijk kelderde.
    totaal = pd.concat(reeksen, axis=1).sort_index().ffill().fillna(0).sum(axis=1)
    eerste_transactiedatum = transacties["datum"].min()
    totaal = totaal[totaal.index >= eerste_transactiedatum]
    if vanaf is not None:
        totaal = totaal[totaal.index >= pd.Timestamp(vanaf)]
    if tot is not None:
        totaal = totaal[totaal.index <= pd.Timestamp(tot)]
    return [(datum.date(), waarde) for datum, waarde in totaal.items()]


def bereken_posities(con: duckdb.DuckDBPyConnection) -> list[dict]:
    """Huidige posities: alleen codes met een nog-open (niet volledig
    verkochte) hoeveelheid."""
    transacties, koersen, wisselkoersen = _laad_dataframes(con)
    if transacties.empty:
        return []

    resultaten = []
    for code, groep in transacties.groupby("code"):
        groep = groep.sort_values("datum")
        delta = groep["type"].map(TEKEN) * groep["aantal"]
        aantal_in_bezit = delta.sum()
        if aantal_in_bezit <= 1e-6:
            continue

        koop_rijen = groep[groep["type"] == "koop"]
        totaal_gekocht = koop_rijen["aantal"].sum()
        totale_koopkosten = (koop_rijen["aantal"] * koop_rijen["prijs_per_stuk"]).sum()
        gem_aankoopprijs = totale_koopkosten / totaal_gekocht if totaal_gekocht else 0.0

        code_koersen = koersen[koersen["code"] == code].sort_values("datum")
        laatste_koers = float(code_koersen["slotkoers"].iloc[-1]) if not code_koersen.empty else None
        valuta = groep["valuta"].iloc[-1]
        namen = groep["naam"].dropna()
        naam = namen.iloc[-1] if not namen.empty else code

        huidige_waarde = None
        resultaat = None
        if laatste_koers is not None:
            resultaat_native = aantal_in_bezit * laatste_koers - totale_koopkosten
            huidige_waarde_native = aantal_in_bezit * laatste_koers
            if valuta == "EUR":
                huidige_waarde = huidige_waarde_native
                resultaat = resultaat_native
            else:
                fx_rijen = wisselkoersen[wisselkoersen["valuta"] == valuta].sort_values("datum")
                if not fx_rijen.empty:
                    laatste_fx = float(fx_rijen["koers"].iloc[-1])
                    huidige_waarde = huidige_waarde_native / laatste_fx
                    resultaat = resultaat_native / laatste_fx

        resultaten.append({
            "code": code,
            "naam": naam,
            "aantal": float(aantal_in_bezit),
            "gem_aankoopprijs": float(gem_aankoopprijs),
            "valuta": valuta,
            "laatste_koers": laatste_koers,
            "huidige_waarde": huidige_waarde,
            "resultaat": resultaat,
        })

    resultaten.sort(key=lambda p: p["huidige_waarde"] or 0, reverse=True)
    return resultaten
