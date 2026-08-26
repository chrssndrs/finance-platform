from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class BankRegistratie(BaseModel):
    bank: str
    naam: str
    locatie: str
    separator: str
    datum_kolom: str
    datum_formaat: str
    omschrijving_kolom: str
    rekening_kolom: str
    tegenrekening_kolom: str | None = None
    bedrag_kolom: str
    bedrag_decimaal_teken: str
    richting_kolom: str | None = None
    richting_negatief_waarde: str | None = None
    mededelingen_kolom: str | None = None
    saldo_kolom: str | None = None
    rekening_type: Literal["betaalrekening", "spaarrekening"] = "betaalrekening"


class Bank(BankRegistratie):
    laatst_gebruikt_op: datetime | None


class BankenResponse(BaseModel):
    banken: list[Bank]


class KolomDetectie(BaseModel):
    kolommen: list[str]
