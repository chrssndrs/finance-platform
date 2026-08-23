"""Eenmalige import van de bestaande inboedel-spreadsheet (CSV-export) naar
inboedel.artikelen. Draait NIET als onderdeel van de reguliere pipeline —
dit is de eenmalige startpunt-input; nieuwe artikelen komen daarna via de
frontend binnen. Idempotent: slaat de import over als de tabel al rijen
bevat, tenzij forceer=True.

De bron-CSV bevat ook een aantal afgeleide/berekende kolommen (Leeftijd,
Prio, Afschrijving, Afgeschreven, %Leven, Restwaarde) die hier bewust NIET
worden overgenomen — dat zijn momentopnames die stilaan verouderen; de API
berekent ze live uit datum + bedrag + levensduur. Serienummer wordt ook niet
overgenomen (buiten de afgesproken velden, en vrijwel altijd leeg).

Verwacht formaat: zie config/inboedel_import.example.csv (dummy-data, veilig
voor git — je eigen inboedel-CSV hoort thuis in data/inboedel/, dat staat in
.gitignore).

Los te draaien: python -m src.pipeline.inboedel.importeer_csv <pad-naar-csv>
"""

import csv
import logging
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

import duckdb

logger = logging.getLogger(__name__)


@dataclass
class ImportResultaat:
    aantal_gelezen: int
    aantal_geimporteerd: int
    aantal_overgeslagen: int


def _parse_bedrag(raw: str) -> float | None:
    raw = raw.strip().replace("€", "").strip()
    if not raw:
        return None
    raw = raw.replace(".", "").replace(",", ".")
    try:
        return float(raw)
    except ValueError:
        logger.warning("Kon bedrag niet parsen: %r", raw)
        return None


def _parse_datum(raw: str) -> date | None:
    raw = raw.strip()
    if not raw:
        return None
    try:
        return datetime.strptime(raw, "%d-%m-%Y").date()
    except ValueError:
        logger.warning("Kon datum niet parsen: %r", raw)
        return None


def _parse_int(raw: str) -> int | None:
    raw = raw.strip()
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def _parse_tekst(raw: str) -> str | None:
    raw = raw.strip()
    return raw or None


def run_import(con: duckdb.DuckDBPyConnection, csv_pad: Path, forceer: bool = False) -> ImportResultaat:
    bestaand = con.execute("SELECT COUNT(*) FROM inboedel.artikelen").fetchone()[0]
    if bestaand > 0 and not forceer:
        logger.info("inboedel.artikelen bevat al %d rijen — import overgeslagen", bestaand)
        return ImportResultaat(aantal_gelezen=0, aantal_geimporteerd=0, aantal_overgeslagen=0)

    rijen = []
    aantal_gelezen = 0
    aantal_overgeslagen = 0
    with open(csv_pad, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            aantal_gelezen += 1
            omschrijving = _parse_tekst(row.get("Omschrijving", ""))
            # de spreadsheet-footer ("132;;;;€ 43.918,85;...") en lege
            # restrijen hebben geen (echte) omschrijving
            if not omschrijving or omschrijving.isdigit():
                aantal_overgeslagen += 1
                continue

            rijen.append((
                omschrijving,
                _parse_tekst(row.get("Merk", "")),
                _parse_tekst(row.get("Model", "")),
                _parse_tekst(row.get("Winkel", "")),
                _parse_bedrag(row.get("Bedrag", "")),
                _parse_datum(row.get("Datum", "")),
                _parse_int(row.get("Levensduur", "")),
                datetime.now(),
            ))

    con.executemany(
        """INSERT INTO inboedel.artikelen
           (omschrijving, merk, model, winkel, bedrag, datum, levensduur_maanden, aangemaakt_op)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        rijen,
    )
    logger.info("inboedel: %d artikelen geïmporteerd uit %s (%d overgeslagen)", len(rijen), csv_pad, aantal_overgeslagen)

    return ImportResultaat(
        aantal_gelezen=aantal_gelezen,
        aantal_geimporteerd=len(rijen),
        aantal_overgeslagen=aantal_overgeslagen,
    )


if __name__ == "__main__":
    import sys

    from src.pipeline import schema
    from src.pipeline.paths import DATA_ROOT, DB_PAD

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")

    standaard_pad = DATA_ROOT / "data" / "inboedel" / "import.csv"
    pad = Path(sys.argv[1]) if len(sys.argv) > 1 else standaard_pad
    forceer = "--forceer" in sys.argv

    con = duckdb.connect(str(DB_PAD))
    try:
        schema.init_schemas(con)
        print(run_import(con, pad, forceer=forceer))
    finally:
        con.close()
