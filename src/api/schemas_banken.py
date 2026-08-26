from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class BankRegistratie(BaseModel):
    bank: str
    naam: str
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
    locatie: str
    laatst_gebruikt_op: datetime | None


class BankenResponse(BaseModel):
    banken: list[Bank]


class KolomDetectie(BaseModel):
    kolommen: list[str]


class BankBestand(BaseModel):
    bestandsnaam: str
    grootte_bytes: int
    aangemaakt_op: datetime


class BankBestandenResponse(BaseModel):
    bestanden: list[BankBestand]


class BestandVerwijderdResponse(BaseModel):
    pipeline_samenvatting: str
