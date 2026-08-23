from datetime import date, datetime

from pydantic import BaseModel


class CategorieGroep(BaseModel):
    categorie: str
    subcategorieen: list[str]


class CategorieenResponse(BaseModel):
    categorieen: list[CategorieGroep]


class AfzendersResponse(BaseModel):
    afzenders: list[str]


class StatusResponse(BaseModel):
    laatste_refresh: datetime | None
    laatste_transactie: date | None


class PeriodeTotaal(BaseModel):
    periode_start: date
    inkomsten: float
    uitgaven: float
    totaal: float


class TotalenResponse(BaseModel):
    categorie: str | None
    subcategorie: str | None
    afzender: str | None
    granulariteit: str
    vanaf: date | None
    tot: date | None
    reeks: list[PeriodeTotaal]


class Transactie(BaseModel):
    transactie_id: str
    datum: date
    afzender: str
    bedrag_eur: float
    mededelingen: str | None


class TransactiesResponse(BaseModel):
    transacties: list[Transactie]
