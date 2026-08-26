from datetime import date

from pydantic import BaseModel


class InboedelArtikelInvoer(BaseModel):
    omschrijving: str
    merk: str | None = None
    model: str | None = None
    winkel: str | None = None
    bedrag: float | None = None
    datum: date | None = None
    levensduur_maanden: int | None = None
    serienummer: str | None = None
    wordt_vervangen: bool = True


class InboedelArtikel(BaseModel):
    id: int
    omschrijving: str
    merk: str | None
    model: str | None
    winkel: str | None
    bedrag: float | None
    datum: date | None
    levensduur_maanden: int | None
    serienummer: str | None
    wordt_vervangen: bool
    leeftijd_maanden: float | None
    percentage_leven: float | None
    restwaarde: float | None
    is_afgeschreven: bool
    maanden_tot_afschrijving: float | None
    kosten_per_dag: float | None


class InboedelArtikelenResponse(BaseModel):
    artikelen: list[InboedelArtikel]


class InboedelOptiesResponse(BaseModel):
    merken: list[str]
    winkels: list[str]
