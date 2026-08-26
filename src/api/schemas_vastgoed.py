from datetime import date

from pydantic import BaseModel


class LocatieInvoer(BaseModel):
    adres: str


class Locatie(BaseModel):
    id: int
    adres: str


class LocatiesResponse(BaseModel):
    locaties: list[Locatie]


class WaardeInvoer(BaseModel):
    locatie_id: int
    datum: date
    waarde: float
    bron: str | None = None
    opmerking: str | None = None


class Waarde(BaseModel):
    id: int
    locatie_id: int
    datum: date
    waarde: float
    bron: str | None
    opmerking: str | None


class WaardenResponse(BaseModel):
    waardes: list[Waarde]
