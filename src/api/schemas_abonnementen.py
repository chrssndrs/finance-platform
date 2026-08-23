from datetime import date

from pydantic import BaseModel


class AbonnementInvoer(BaseModel):
    naam: str
    afzender: str | None = None
    categorie: str | None = None
    subcategorie: str | None = None
    bedrag: float
    interval: str
    eerstvolgende_afschrijving: date
    domein: str | None = None


class Abonnement(BaseModel):
    id: int
    naam: str
    afzender: str | None
    categorie: str | None
    subcategorie: str | None
    bedrag: float
    interval: str
    logo_url: str | None
    eerstvolgende_afschrijving: date
    dagen_tot_afschrijving: int
    bron: str


class AbonnementenResponse(BaseModel):
    abonnementen: list[Abonnement]
    totaal_per_maand: float


class Aanbeveling(BaseModel):
    id: int
    type: str
    afzender: str
    naam: str
    categorie: str | None
    subcategorie: str | None
    logo_url: str | None
    huidig_bedrag: float | None
    voorgesteld_bedrag: float
    interval: str | None
    eerstvolgende_afschrijving: date | None
    aantal_transacties: int | None


class AanbevelingenResponse(BaseModel):
    aanbevelingen: list[Aanbeveling]
