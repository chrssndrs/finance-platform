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


class MaandTotaal(BaseModel):
    maand: str
    inkomsten: float
    uitgaven: float
    totaal: float


class MaandTotalenResponse(BaseModel):
    categorie: str | None
    subcategorie: str | None
    winkel: str | None
    periode_maanden: int
    reeks: list[MaandTotaal]
