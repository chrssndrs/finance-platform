from typing import Literal

from pydantic import BaseModel


class Instellingen(BaseModel):
    planning_drempel_modus: Literal["maanden", "percentage"]
    planning_drempel_waarde: float
    verzamelfacturen_locatie: str
    data_te_oud_na_dagen: float
    trend_venster_maanden: int


class InstellingenInvoer(BaseModel):
    planning_drempel_modus: Literal["maanden", "percentage"]
    planning_drempel_waarde: float
    verzamelfacturen_locatie: str
    data_te_oud_na_dagen: float
    trend_venster_maanden: int


class InstellingenResponse(BaseModel):
    instellingen: Instellingen
