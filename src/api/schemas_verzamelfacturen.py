from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class RegelInvoer(BaseModel):
    omschrijving: str
    bedrag: float
    categorie: str | None = None
    subcategorie: str | None = None


class Regel(RegelInvoer):
    id: int
    factuur_id: int


class FactuurBijwerken(BaseModel):
    bron: str
    totaalbedrag: float | None = None
    transactie_id: str | None = None


class Factuur(BaseModel):
    id: int
    bestandsnaam: str
    origineel_bestandsnaam: str | None
    bron: str
    totaalbedrag: float | None
    transactie_id: str | None
    status: Literal["nieuw", "gematcht", "gesplitst"]
    geupload_op: datetime


class FactuurMetRegels(Factuur):
    regels: list[Regel]


class FacturenResponse(BaseModel):
    facturen: list[Factuur]
