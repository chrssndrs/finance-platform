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


class TellingInvoer(BaseModel):
    coupure: float
    aantal: int


class TellingenInvoer(BaseModel):
    tellingen: list[TellingInvoer]


class Locatie(BaseModel):
    id: int
    naam: str
    tellingen: list[Telling]
    totaal: float


class ContantGeldResponse(BaseModel):
    coupures: list[float]
    locaties: list[Locatie]
    totaal_algemeen: float
