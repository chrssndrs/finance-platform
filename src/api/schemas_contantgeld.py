from datetime import date, datetime

from pydantic import BaseModel

# Standaard eurocoupures, oplopend — bepaalt ook de kolomvolgorde in de
# frontend (die dit uit de GET-response overneemt i.p.v. zelf te hardcoden).
COUPURES: list[float] = [
    0.01, 0.02, 0.05, 0.10, 0.20, 0.50,
    1.00, 2.00,
    5.00, 10.00, 20.00, 50.00, 100.00, 200.00, 500.00,
]


class LocatieInvoer(BaseModel):
    naam: str


class Telling(BaseModel):
    coupure: float
    aantal: int


class Locatie(BaseModel):
    id: int
    naam: str
    tellingen: list[Telling]
    totaal: float


class ContantGeldResponse(BaseModel):
    coupures: list[float]
    locaties: list[Locatie]
    totaal_algemeen: float


class TellingCorrectie(BaseModel):
    coupure: float
    aantal: int  # nieuwe ABSOLUTE aantal — de backend berekent zelf de delta


class CoupureRegel(BaseModel):
    coupure: float
    aantal: int  # positief aantal betrokken bij deze mutatie


class VerplaatsingInvoer(BaseModel):
    van_locatie_id: int
    naar_locatie_id: int
    datum: date
    omschrijving: str | None = None
    regels: list[CoupureRegel]


class UitgaveInvoer(BaseModel):
    locatie_id: int
    datum: date
    omschrijving: str
    categorie: str | None = None
    subcategorie: str | None = None
    regels: list[CoupureRegel]


class MutatieRegelUit(BaseModel):
    coupure: float
    aantal: int


class Mutatie(BaseModel):
    id: int
    type: str
    datum: date
    locatie_naam: str | None
    van_locatie_naam: str | None
    naar_locatie_naam: str | None
    omschrijving: str | None
    categorie: str | None
    subcategorie: str | None
    bedrag: float
    aangemaakt_op: datetime
    regels: list[MutatieRegelUit]


class HistorieResponse(BaseModel):
    mutaties: list[Mutatie]
