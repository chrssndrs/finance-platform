from datetime import date
from typing import Literal

from pydantic import BaseModel


class PlanningItemInvoer(BaseModel):
    omschrijving: str
    bedrag: float
    datum: date | None = None


class PlanningItem(BaseModel):
    id: int | None
    omschrijving: str
    bedrag: float
    datum: date | None
    bron: Literal["handmatig", "inboedel"]
    artikel_id: int | None
    is_afgeschreven: bool = False


class PlanningResponse(BaseModel):
    items: list[PlanningItem]


class MagicDatumResponse(BaseModel):
    haalbaar_op: date | None
    nu_al_haalbaar: bool
    huidig_liquide_vermogen: float
    gemiddeld_netto_maandelijks: float


class InboedelKostenPerMaandPunt(BaseModel):
    maand: str
    bedrag: float


class InboedelKostenPerMaandResponse(BaseModel):
    maanden: list[InboedelKostenPerMaandPunt]
