from dataclasses import dataclass

import duckdb

SQL_BANK_OPHALEN = """
    SELECT bank, naam, locatie, separator, datum_kolom, datum_formaat,
           omschrijving_kolom, rekening_kolom, tegenrekening_kolom,
           bedrag_kolom, bedrag_decimaal_teken, richting_kolom,
           richting_negatief_waarde, mededelingen_kolom, saldo_kolom
    FROM instellingen.banken WHERE bank = $bank
"""

SQL_BANKEN = """
    SELECT bank, naam, locatie, separator, datum_kolom, datum_formaat,
           omschrijving_kolom, rekening_kolom, tegenrekening_kolom,
           bedrag_kolom, bedrag_decimaal_teken, richting_kolom,
           richting_negatief_waarde, mededelingen_kolom, saldo_kolom,
           laatst_gebruikt_op
    FROM instellingen.banken
    ORDER BY laatst_gebruikt_op DESC NULLS LAST, naam
"""


@dataclass
class BankConfig:
    bank: str
    naam: str
    locatie: str
    separator: str
    datum_kolom: str
    datum_formaat: str
    omschrijving_kolom: str
    rekening_kolom: str
    tegenrekening_kolom: str | None
    bedrag_kolom: str
    bedrag_decimaal_teken: str
    richting_kolom: str | None
    richting_negatief_waarde: str | None
    mededelingen_kolom: str | None
    saldo_kolom: str | None = None


def _naar_bank_config(rij: tuple) -> BankConfig:
    (
        bank, naam, locatie, separator, datum_kolom, datum_formaat,
        omschrijving_kolom, rekening_kolom, tegenrekening_kolom,
        bedrag_kolom, bedrag_decimaal_teken, richting_kolom,
        richting_negatief_waarde, mededelingen_kolom, saldo_kolom,
    ) = rij[:15]
    return BankConfig(
        bank=bank, naam=naam, locatie=locatie, separator=separator,
        datum_kolom=datum_kolom, datum_formaat=datum_formaat,
        omschrijving_kolom=omschrijving_kolom, rekening_kolom=rekening_kolom,
        tegenrekening_kolom=tegenrekening_kolom, bedrag_kolom=bedrag_kolom,
        bedrag_decimaal_teken=bedrag_decimaal_teken, richting_kolom=richting_kolom,
        richting_negatief_waarde=richting_negatief_waarde,
        mededelingen_kolom=mededelingen_kolom, saldo_kolom=saldo_kolom,
    )


def laad_bank_config(con: duckdb.DuckDBPyConnection, bank: str) -> BankConfig:
    rij = con.execute(SQL_BANK_OPHALEN, {"bank": bank}).fetchone()
    if rij is None:
        raise ValueError(f"Onbekende bank {bank!r} — niet geregistreerd in instellingen.banken")
    return _naar_bank_config(rij)


def alle_bank_configs(con: duckdb.DuckDBPyConnection) -> list[BankConfig]:
    return [_naar_bank_config(rij) for rij in con.execute(SQL_BANKEN).fetchall()]


def beschikbare_banken(con: duckdb.DuckDBPyConnection) -> list[dict]:
    rijen = con.execute("SELECT bank, naam, laatst_gebruikt_op FROM instellingen.banken ORDER BY laatst_gebruikt_op DESC NULLS LAST, naam").fetchall()
    return [{"bank": bank, "naam": naam, "laatst_gebruikt_op": laatst_gebruikt_op} for bank, naam, laatst_gebruikt_op in rijen]
