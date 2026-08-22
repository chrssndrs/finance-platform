from pydantic import BaseModel


class CategorieGroep(BaseModel):
    categorie: str
    subcategorieen: list[str]


class CategorieenResponse(BaseModel):
    categorieen: list[CategorieGroep]


class MaandTotaal(BaseModel):
    maand: str
    inkomsten: float
    uitgaven: float
    totaal: float


class MaandTotalenResponse(BaseModel):
    categorie: str | None
    subcategorie: str | None
    periode_maanden: int
    reeks: list[MaandTotaal]
