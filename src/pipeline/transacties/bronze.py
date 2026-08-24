import hashlib
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path

import duckdb
import pandas as pd

from src.pipeline.bank_config import BankConfig, alle_bank_configs
from src.pipeline.paths import DATA_ROOT

logger = logging.getLogger(__name__)


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
    # Bank-agnostisch: de ruwe CSV-rij wordt als JSON bewaard (kolomnaam ->
    # waarde) i.p.v. als vaste, bank-specifieke kolommen — zo geeft een
    # bank-wissel of een tweede bank nooit een DDL-conflict met wat er al
    # in deze tabel staat. silver.py doet de veldextractie, per rij aan de
    # hand van de bank-config die bij die rij's `bank`-waarde hoort.
    con.execute("""
        CREATE TABLE IF NOT EXISTS bronze.transacties (
            bank VARCHAR NOT NULL,
            ruwe_rij VARCHAR NOT NULL,
            rij_hash VARCHAR,
            bronbestand VARCHAR,
            ingelezen_op TIMESTAMP
        )
    """)


def _migreer_indien_nodig(con: duckdb.DuckDBPyConnection) -> int:
    """Eenmalige migratie vanaf de oude, ING-specifieke bronze.transacties_ing
    naar het nieuwe, bank-agnostische bronze.transacties. rij_hash blijft
    ongewijzigd (berekend over dezelfde ruwe kolomwaarden), dus de bestaande
    content-hashes in meta.landing_bestanden_log blijven geldig — een
    volgende run herkent oude bestanden nog steeds als 'al verwerkt' i.p.v.
    ze dubbel te importeren. Idempotent: slaat over als de nieuwe tabel al
    rijen bevat, of als de oude tabel niet (meer) bestaat.
    """
    (aantal_bestaand,) = con.execute("SELECT count(*) FROM bronze.transacties").fetchone()
    if aantal_bestaand > 0:
        return 0

    bestaat_oud = con.execute("""
        SELECT count(*) FROM information_schema.tables
        WHERE table_schema = 'bronze' AND table_name = 'transacties_ing'
    """).fetchone()[0]
    if not bestaat_oud:
        return 0

    oud = con.execute('SELECT * FROM bronze.transacties_ing').df()
    if oud.empty:
        return 0

    kolom_kolommen = [c for c in oud.columns if c not in ("rij_hash", "bronbestand", "ingelezen_op")]
    # oud[kolom_kolommen] zijn VARCHAR-kolommen die NULL kunnen bevatten — via
    # pandas komt dat als NaN (float) binnen, en json.dumps zet een NaN niet
    # om naar JSON-null maar naar het niet-standaard token `NaN`, dat er bij
    # json.loads() als Python-float uitkomt i.p.v. None. Expliciet naar None
    # omzetten voorkomt dat downstream (.strip() op een float) crasht.
    kolommen_df = oud[kolom_kolommen].astype(object).where(oud[kolom_kolommen].notna(), None)
    migratie_df = pd.DataFrame({
        "bank": "ing",
        "ruwe_rij": kolommen_df.apply(lambda r: json.dumps(r.to_dict(), ensure_ascii=False), axis=1),
        "rij_hash": oud["rij_hash"],
        "bronbestand": oud["bronbestand"],
        "ingelezen_op": oud["ingelezen_op"],
    })
    con.register("bronze_migratie_temp", migratie_df)
    con.execute("INSERT INTO bronze.transacties SELECT * FROM bronze_migratie_temp")
    con.unregister("bronze_migratie_temp")
    con.execute("DROP TABLE bronze.transacties_ing")

    logger.info("Gemigreerd van bronze.transacties_ing naar bronze.transacties: %d rijen", len(oud))
    return len(oud)




def verwerk_bestand(pad: Path, bank_config: BankConfig, con: duckdb.DuckDBPyConnection) -> BestandResultaat:
    bestandsnaam = Path(pad).name
    hash_ = bestand_hash(pad)

    al_verwerkt = con.execute(
        "SELECT COUNT(*) FROM meta.landing_bestanden_log WHERE content_hash = ?",
        [hash_],
    ).fetchone()[0]

    if al_verwerkt > 0:
        logger.info("Overslaan (al eerder verwerkt): %s", bestandsnaam)
        return BestandResultaat(bestandsnaam=bestandsnaam, verwerkt=False, aantal_rijen=0)

    df = pd.read_csv(pad, dtype=str, sep=bank_config.separator)
    rij_hashes = df.apply(rij_hash, axis=1)
    # lege cellen komen ondanks dtype=str als NaN (float) binnen — expliciet
    # naar None, anders zet json.dumps dat om naar het niet-standaard token
    # `NaN` i.p.v. JSON-null, en komt er bij json.loads() weer een Python-
    # float uit i.p.v. None (zie ook _migreer_indien_nodig hierboven).
    json_df = df.astype(object).where(df.notna(), None)
    ruwe_rijen = json_df.apply(lambda r: json.dumps(r.to_dict(), ensure_ascii=False), axis=1)

    insert_df = pd.DataFrame({
        "bank": bank_config.bank,
        "ruwe_rij": ruwe_rijen,
        "rij_hash": rij_hashes,
        "bronbestand": bestandsnaam,
        "ingelezen_op": pd.Timestamp.now(),
    })

    try:
        con.execute("BEGIN TRANSACTION")
        con.register("df_temp", insert_df)
        con.execute("INSERT INTO bronze.transacties SELECT * FROM df_temp")
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
    finally:
        con.unregister("df_temp")


def run_bronze(con: duckdb.DuckDBPyConnection) -> BronzeResultaat:
    _zorg_voor_bronze_tabel(con)
    _migreer_indien_nodig(con)

    banken = alle_bank_configs(con)
    resultaten: list[BestandResultaat] = []
    totaal_gevonden = 0

    for bank_config in banken:
        landing_dir = DATA_ROOT / bank_config.locatie
        csv_bestanden = sorted(landing_dir.glob("*.csv")) if landing_dir.exists() else []
        logger.info(
            "Gevonden bestanden: %d (bank=%s, locatie=%s)", len(csv_bestanden), bank_config.bank, landing_dir
        )
        totaal_gevonden += len(csv_bestanden)
        resultaten.extend(verwerk_bestand(pad, bank_config, con) for pad in csv_bestanden)

    return BronzeResultaat(
        bestanden_gevonden=totaal_gevonden,
        bestanden_verwerkt=sum(1 for r in resultaten if r.verwerkt),
        bestanden_overgeslagen=sum(1 for r in resultaten if not r.verwerkt),
        rijen_ingelezen=sum(r.aantal_rijen for r in resultaten),
        resultaten=resultaten,
    )
