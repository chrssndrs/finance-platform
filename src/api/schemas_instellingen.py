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
    verzamelfacturen_locatie: str
    data_te_oud_na_dagen: float
    trend_venster_maanden: int


class InstellingenInvoer(BaseModel):
    bank: str
    export_locatie: str
    planning_drempel_modus: Literal["maanden", "percentage"]
    planning_drempel_waarde: float
    verzamelfacturen_locatie: str
    data_te_oud_na_dagen: float
    trend_venster_maanden: int


class InstellingenResponse(BaseModel):
    instellingen: Instellingen
    beschikbare_banken: list[BeschikbareBank]
