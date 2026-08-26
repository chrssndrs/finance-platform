from datetime import date

from pydantic import BaseModel


class SpaarRekening(BaseModel):
    bank: str
    naam: str
    rekening: str
    saldo: float
    datum: date
    geschat_saldo: float
    alias: str | None
    doelbedrag: float | None


class SpaarRekeningDoelInvoer(BaseModel):
    alias: str | None = None
    doelbedrag: float | None = None


class HandmatigSaldoInvoer(BaseModel):
    bedrag: float


class SparenResponse(BaseModel):
    rekeningen: list[SpaarRekening]
    handmatig_saldo: float
    handmatig_aangepast_op: date | None
    totaal: float
