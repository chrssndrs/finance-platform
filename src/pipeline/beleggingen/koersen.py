import logging
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta

import duckdb
import pandas as pd
import requests

logger = logging.getLogger(__name__)

# Yahoo Finance's chart-endpoint is niet officieel gedocumenteerd (het is de
# bron achter de populaire yfinance-library), maar werkt zonder API-sleutel
# en zonder blokkade met een gewone browser-User-Agent — geverifieerd vóór
# de bouw van deze module (zie het plan-bestand). Stooq, het meest gebruikte
# alternatief, blokkeert inmiddels automatische requests actief (JS proof-
# of-work-uitdaging); die blokkade wordt hier bewust niet omzeild.
CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{code}"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
PAUZE_TUSSEN_REQUESTS = 0.5


@dataclass
class KoersenResultaat:
    aantal_codes: int
    aantal_koersen_opgehaald: int
    aantal_wisselkoersen_opgehaald: int
    aantal_mislukt: int


def _naar_unix(d: date) -> int:
    return int(datetime(d.year, d.month, d.day).timestamp())


def _haal_chart_op(code: str, vanaf: date, tot: date) -> tuple[list[tuple[date, float]], str | None]:
    """Dagelijkse slotkoersen voor `code` (een Yahoo Finance-ticker, of een
    valutapaar zoals 'EURUSD=X'). Fail-soft: bij een netwerkfout, onbekende
    ticker of onverwachte respons wordt een lege lijst teruggegeven en een
    waarschuwing gelogd — dit raakt een externe, niet-officiële bron en mag
    de pipeline nooit laten stuklopen.
    """
    if vanaf > tot:
        return [], None
    try:
        response = requests.get(
            CHART_URL.format(code=code),
            params={"period1": _naar_unix(vanaf), "period2": _naar_unix(tot + timedelta(days=1)), "interval": "1d"},
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        response.raise_for_status()
        resultaat = response.json()["chart"]["result"][0]
        valuta = resultaat["meta"].get("currency")
        tijdstempels = resultaat.get("timestamp") or []
        sloten = resultaat["indicators"]["quote"][0].get("close") or []
        koersen = [(datetime.fromtimestamp(t).date(), c) for t, c in zip(tijdstempels, sloten) if c is not None]
        return koersen, valuta
    except (requests.RequestException, KeyError, IndexError, TypeError, ValueError):
        logger.warning("Koersen ophalen mislukt voor %s", code, exc_info=True)
        return [], None


def _upsert(con: duckdb.DuckDBPyConnection, tabel: str, sleutelkolom: str, sleutelwaarde: str,
            waardekolom: str, rijen: list[tuple[date, float]]) -> int:
    if not rijen:
        return 0
    df = pd.DataFrame(rijen, columns=["datum", waardekolom])
    df[sleutelkolom] = sleutelwaarde
    con.register("koersen_upsert_temp", df[[sleutelkolom, "datum", waardekolom]])
    con.execute(f"""
        INSERT INTO {tabel} ({sleutelkolom}, datum, {waardekolom})
        SELECT {sleutelkolom}, datum, {waardekolom} FROM koersen_upsert_temp
        ON CONFLICT ({sleutelkolom}, datum) DO UPDATE SET {waardekolom} = excluded.{waardekolom}
    """)
    con.unregister("koersen_upsert_temp")
    return len(df)


def _volgende_ophaaldatum(con: duckdb.DuckDBPyConnection, tabel: str, sleutelkolom: str, sleutelwaarde: str,
                           vroegste_nodig: date | None) -> date | None:
    laatste = con.execute(
        f"SELECT MAX(datum) FROM {tabel} WHERE {sleutelkolom} = ?", [sleutelwaarde]
    ).fetchone()[0]
    if laatste is not None:
        return laatste + timedelta(days=1)
    return vroegste_nodig


def ververs_koersen_voor_code(con: duckdb.DuckDBPyConnection, code: str) -> str | None:
    """Haalt (incrementeel) koersen op voor één code — gebruikt door de API
    zodra een transactie met een nieuwe code wordt toegevoegd, zodat niet op
    de nachtelijke pipeline-run gewacht hoeft te worden. Retourneert de
    valuta zodra bekend (of None als het ophalen mislukte), zodat de
    aanroeper `beleggingen.transacties.valuta` kan bijwerken.
    """
    vroegste = con.execute(
        "SELECT MIN(datum) FROM beleggingen.transacties WHERE code = ?", [code]
    ).fetchone()[0]
    vanaf = _volgende_ophaaldatum(con, "beleggingen.koersen", "code", code, vroegste)
    vandaag = date.today()
    if vanaf is None or vanaf > vandaag:
        return None

    koersen, valuta = _haal_chart_op(code, vanaf, vandaag)
    _upsert(con, "beleggingen.koersen", "code", code, "slotkoers", koersen)
    if valuta:
        con.execute("UPDATE beleggingen.transacties SET valuta = ? WHERE code = ?", [valuta, code])
        if valuta != "EUR":
            _ververs_wisselkoers(con, valuta)
    return valuta


def _ververs_wisselkoers(con: duckdb.DuckDBPyConnection, valuta: str) -> int:
    vroegste = con.execute(
        "SELECT MIN(datum) FROM beleggingen.transacties WHERE valuta = ?", [valuta]
    ).fetchone()[0]
    vanaf = _volgende_ophaaldatum(con, "beleggingen.wisselkoersen", "valuta", valuta, vroegste)
    vandaag = date.today()
    if vanaf is None or vanaf > vandaag:
        return 0
    koersen, _ = _haal_chart_op(f"EUR{valuta}=X", vanaf, vandaag)
    return _upsert(con, "beleggingen.wisselkoersen", "valuta", valuta, "koers", koersen)


def run_koersen(con: duckdb.DuckDBPyConnection) -> KoersenResultaat:
    codes = [r[0] for r in con.execute("SELECT DISTINCT code FROM beleggingen.transacties").fetchall()]

    aantal_koersen = 0
    aantal_mislukt = 0
    valutas_gezien: set[str] = set()

    for code in codes:
        vroegste = con.execute(
            "SELECT MIN(datum) FROM beleggingen.transacties WHERE code = ?", [code]
        ).fetchone()[0]
        vanaf = _volgende_ophaaldatum(con, "beleggingen.koersen", "code", code, vroegste)
        vandaag = date.today()
        if vanaf is None or vanaf > vandaag:
            continue

        koersen, valuta = _haal_chart_op(code, vanaf, vandaag)
        if not koersen:
            aantal_mislukt += 1
        aantal_koersen += _upsert(con, "beleggingen.koersen", "code", code, "slotkoers", koersen)
        if valuta:
            valutas_gezien.add(valuta)
            con.execute("UPDATE beleggingen.transacties SET valuta = ? WHERE code = ?", [valuta, code])
        time.sleep(PAUZE_TUSSEN_REQUESTS)

    aantal_wisselkoersen = 0
    for valuta in valutas_gezien - {"EUR"}:
        aantal_wisselkoersen += _ververs_wisselkoers(con, valuta)
        time.sleep(PAUZE_TUSSEN_REQUESTS)

    resultaat = KoersenResultaat(
        aantal_codes=len(codes),
        aantal_koersen_opgehaald=aantal_koersen,
        aantal_wisselkoersen_opgehaald=aantal_wisselkoersen,
        aantal_mislukt=aantal_mislukt,
    )
    logger.info("Koersen-stap klaar: %s", resultaat)
    return resultaat
