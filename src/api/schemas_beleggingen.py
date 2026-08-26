from datetime import date

from pydantic import BaseModel


class PortefeuilleInvoer(BaseModel):
    naam: str


class Portefeuille(BaseModel):
    id: int
    naam: str


class PortefeuillesResponse(BaseModel):
    portefeuilles: list[Portefeuille]


class TransactieInvoer(BaseModel):
    portefeuille_id: int
    datum: date
    type: str
    code: str
    naam: str | None = None
    aantal: float
    prijs_per_stuk: float
    valuta: str = "EUR"
    kosten: float | None = None


class Transactie(BaseModel):
    id: int
    portefeuille_id: int
    datum: date
    type: str
    code: str
    naam: str | None
    aantal: float
    prijs_per_stuk: float
    valuta: str
    kosten: float | None


class TransactiesResponse(BaseModel):
    transacties: list[Transactie]


class ZoekResultaat(BaseModel):
    symbol: str
    naam: str
    beurs: str


class ZoekResponse(BaseModel):
    resultaten: list[ZoekResultaat]


class PortfolioPunt(BaseModel):
    datum: date
    waarde: float


class PortfolioResponse(BaseModel):
    code: str | None
    reeks: list[PortfolioPunt]


class Positie(BaseModel):
    code: str
    naam: str
    aantal: float
    gem_aankoopprijs: float
    valuta: str
    laatste_koers: float | None
    huidige_waarde: float | None
    resultaat: float | None


class PositiesResponse(BaseModel):
    posities: list[Positie]
