from pydantic import BaseModel


class BeschikbareBank(BaseModel):
    bank: str
    naam: str


class Instellingen(BaseModel):
    bank: str
    bank_naam: str
    export_locatie: str


class InstellingenInvoer(BaseModel):
    bank: str
    export_locatie: str


class InstellingenResponse(BaseModel):
    instellingen: Instellingen
    beschikbare_banken: list[BeschikbareBank]
