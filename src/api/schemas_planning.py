from datetime import date
from typing import Literal

from pydantic import BaseModel


class PlanningItemInvoer(BaseModel):
    omschrijving: str
    bedrag: float
    datum: date


class PlanningItem(BaseModel):
    id: int | None
    omschrijving: str
    bedrag: float
    datum: date
    bron: Literal["handmatig", "inboedel"]
    artikel_id: int | None


class PlanningResponse(BaseModel):
    items: list[PlanningItem]
