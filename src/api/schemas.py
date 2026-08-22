from datetime import date, datetime

from pydantic import BaseModel


class CategorieGroep(BaseModel):
    categorie: str
    subcategorieen: list[str]


class CategorieenResponse(BaseModel):
    categorieen: list[CategorieGroep]


class WinkelsResponse(BaseModel):
    winkels: list[str]


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
    winkel: str | None
    granulariteit: str
    aantal: int
    reeks: list[PeriodeTotaal]
