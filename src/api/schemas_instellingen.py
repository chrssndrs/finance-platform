from typing import Literal

from pydantic import BaseModel


class BeschikbareBank(BaseModel):
    bank: str
    naam: str


class Instellingen(BaseModel):
    bank: str
    bank_naam: str
    export_locatie: str
    planning_drempel_modus: Literal["maanden", "percentage"]
    planning_drempel_waarde: float


class InstellingenInvoer(BaseModel):
    bank: str
    export_locatie: str
    planning_drempel_modus: Literal["maanden", "percentage"]
    planning_drempel_waarde: float


class InstellingenResponse(BaseModel):
    instellingen: Instellingen
    beschikbare_banken: list[BeschikbareBank]
