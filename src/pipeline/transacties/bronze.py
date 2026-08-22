import hashlib
import logging
from dataclasses import dataclass, field
from pathlib import Path

import duckdb
import pandas as pd

from src.pipeline.paths import LANDING_ROOT

logger = logging.getLogger(__name__)

LANDING_DIR_TRANSACTIES_ING = LANDING_ROOT / "transacties" / "ing"


@dataclass
class BestandResultaat:
    bestandsnaam: str
    verwerkt: bool
    aantal_rijen: int


@dataclass
class BronzeResultaat:
    bestanden_gevonden: int
    bestanden_verwerkt: int
    bestanden_overgeslagen: int
    rijen_ingelezen: int
    resultaten: list[BestandResultaat] = field(default_factory=list)


def bestand_hash(pad: Path) -> str:
    h = hashlib.sha256()
    with open(pad, "rb") as f:
        h.update(f.read())
    return h.hexdigest()


def rij_hash(row: pd.Series) -> str:
    inhoud = "|".join(str(v) for v in row.values)
    return hashlib.sha256(inhoud.encode("utf-8")).hexdigest()


def _zorg_voor_bronze_tabel(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("""
        CREATE TABLE IF NOT EXISTS bronze.transacties_ing (
            "Datum" VARCHAR,
            "Naam / Omschrijving" VARCHAR,
            "Rekening" VARCHAR,
            "Tegenrekening" VARCHAR,
            "Code" VARCHAR,
            "Af Bij" VARCHAR,
            "Bedrag (EUR)" VARCHAR,
            "Mutatiesoort" VARCHAR,
            "Mededelingen" VARCHAR,
            "Saldo na mutatie" VARCHAR,
            "Tag" VARCHAR,
            rij_hash VARCHAR,
            bronbestand VARCHAR,
            ingelezen_op TIMESTAMP
        )
    """)


def verwerk_bestand(pad: Path, con: duckdb.DuckDBPyConnection) -> BestandResultaat:
    bestandsnaam = Path(pad).name
    hash_ = bestand_hash(pad)

    al_verwerkt = con.execute(
        "SELECT COUNT(*) FROM meta.landing_bestanden_log WHERE content_hash = ?",
        [hash_],
    ).fetchone()[0]

    if al_verwerkt > 0:
        logger.info("Overslaan (al eerder verwerkt): %s", bestandsnaam)
        return BestandResultaat(bestandsnaam=bestandsnaam, verwerkt=False, aantal_rijen=0)

    df = pd.read_csv(pad, dtype=str, sep=";")
    df["rij_hash"] = df.apply(rij_hash, axis=1)
    df["bronbestand"] = bestandsnaam
    df["ingelezen_op"] = pd.Timestamp.now()

    try:
        con.execute("BEGIN TRANSACTION")
        con.register("df_temp", df)
        con.execute("INSERT INTO bronze.transacties_ing SELECT * FROM df_temp")
        con.execute(
            """INSERT INTO meta.landing_bestanden_log
               (bestandsnaam, content_hash, aantal_rijen, verwerkt_op, status)
               VALUES (?, ?, ?, ?, ?)""",
            [bestandsnaam, hash_, len(df), pd.Timestamp.now(), "success"],
        )
        con.execute("COMMIT")
        logger.info("Verwerkt: %s (%d rijen)", bestandsnaam, len(df))
        return BestandResultaat(bestandsnaam=bestandsnaam, verwerkt=True, aantal_rijen=len(df))
    except Exception:
        con.execute("ROLLBACK")
        logger.exception("FOUT bij %s", bestandsnaam)
        raise


def run_bronze(
    con: duckdb.DuckDBPyConnection,
    landing_dir: Path = LANDING_DIR_TRANSACTIES_ING,
) -> BronzeResultaat:
    _zorg_voor_bronze_tabel(con)

    csv_bestanden = sorted(landing_dir.glob("*.csv"))
    logger.info("Gevonden bestanden: %d", len(csv_bestanden))

    resultaten = [verwerk_bestand(pad, con) for pad in csv_bestanden]

    return BronzeResultaat(
        bestanden_gevonden=len(csv_bestanden),
        bestanden_verwerkt=sum(1 for r in resultaten if r.verwerkt),
        bestanden_overgeslagen=sum(1 for r in resultaten if not r.verwerkt),
        rijen_ingelezen=sum(r.aantal_rijen for r in resultaten),
        resultaten=resultaten,
    )
