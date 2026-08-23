from datetime import date

from pydantic import BaseModel


class Woning(BaseModel):
    adres: str


class WoningInvoer(BaseModel):
    adres: str


class WaardeInvoer(BaseModel):
    datum: date
    waarde: float
    bron: str | None = None
    opmerking: str | None = None


class Waarde(BaseModel):
    id: int
    datum: date
    waarde: float
    bron: str | None
    opmerking: str | None


class WaardenResponse(BaseModel):
    waardes: list[Waarde]
