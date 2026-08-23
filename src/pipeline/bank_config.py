from dataclasses import dataclass

import yaml

from src.pipeline.paths import CONFIG_ROOT

BANKEN_DIR = CONFIG_ROOT / "banken"


@dataclass
class BankConfig:
    bank: str
    naam: str
    separator: str
    kolommen: list[str]
    datum_kolom: str
    datum_formaat: str
    omschrijving_kolom: str
    rekening_kolom: str
    tegenrekening_kolom: str
    bedrag_kolom: str
    bedrag_decimaal_teken: str
    richting_kolom: str
    richting_negatief_waarde: str
    mededelingen_kolom: str
    saldo_kolom: str | None = None


def laad_bank_config(bank: str) -> BankConfig:
    pad = BANKEN_DIR / f"{bank}.yaml"
    if not pad.exists():
        raise ValueError(f"Onbekende bank {bank!r} — geen config gevonden op {pad}")
    with open(pad, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return BankConfig(
        bank=data["bank"],
        naam=data["naam"],
        separator=data["separator"],
        kolommen=data["kolommen"],
        datum_kolom=data["datum_kolom"],
        datum_formaat=data["datum_formaat"],
        omschrijving_kolom=data["omschrijving_kolom"],
        rekening_kolom=data["rekening_kolom"],
        tegenrekening_kolom=data["tegenrekening_kolom"],
        bedrag_kolom=data["bedrag_kolom"],
        bedrag_decimaal_teken=data["bedrag_decimaal_teken"],
        richting_kolom=data["richting_kolom"],
        richting_negatief_waarde=data["richting_negatief_waarde"],
        mededelingen_kolom=data["mededelingen_kolom"],
        saldo_kolom=data.get("saldo_kolom"),
    )


def beschikbare_banken() -> list[dict]:
    """Scant config/banken/*.yaml — een nieuwe bank toevoegen verschijnt
    hierdoor vanzelf in de instellingenpagina, zonder code-wijziging."""
    if not BANKEN_DIR.exists():
        return []
    resultaat = []
    for pad in sorted(BANKEN_DIR.glob("*.yaml")):
        with open(pad, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        resultaat.append({"bank": data["bank"], "naam": data["naam"]})
    return resultaat
