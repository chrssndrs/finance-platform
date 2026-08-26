from datetime import date

from pydantic import BaseModel


class LeningdeelInvoer(BaseModel):
    locatie_id: int
    naam: str
    type: str
    hoofdsom: float
    rente_percentage: float
    startdatum: date
    looptijd_maanden: int
    rentevast_tot: date | None = None


class Leningdeel(BaseModel):
    id: int
    locatie_id: int | None
    naam: str
    type: str
    hoofdsom: float
    rente_percentage: float
    startdatum: date
    looptijd_maanden: int
    rentevast_tot: date | None
    actuele_schuld: float


class LeningdelenResponse(BaseModel):
    leningdelen: list[Leningdeel]


class SchuldPunt(BaseModel):
    datum: date
    schuld: float


class SchuldResponse(BaseModel):
    reeks: list[SchuldPunt]
    actuele_schuld_totaal: float
