from datetime import date, datetime

from pydantic import BaseModel


class CategorieGroep(BaseModel):
    categorie: str
    subcategorieen: list[str]


class CategorieenResponse(BaseModel):
    categorieen: list[CategorieGroep]


class AfzendersResponse(BaseModel):
    afzenders: list[str]


class StatusResponse(BaseModel):
    laatste_refresh: datetime | None
    laatste_transactie: date | None


class PeriodeTotaal(BaseModel):
    periode_start: date
    inkomsten: float
    uitgaven: float
    totaal: float
    verwachte_inkomsten: float = 0
    verwachte_uitgaven: float = 0


class TotalenResponse(BaseModel):
    categorie: str | None
    subcategorie: str | None
    afzenders: list[str]
    granulariteit: str
    vanaf: date | None
    tot: date | None
    reeks: list[PeriodeTotaal]


class Transactie(BaseModel):
    transactie_id: str
    datum: date
    afzender: str
    bedrag_eur: float
    mededelingen: str | None


class TransactiesResponse(BaseModel):
    transacties: list[Transactie]


class Banksaldo(BaseModel):
    bedrag: float | None
    datum: date | None
    geschat_bedrag: float | None


class OngecategoriseerdAfzender(BaseModel):
    afzender: str
    aantal: int
    totaalbedrag: float


class OngecategoriseerdResponse(BaseModel):
    afzenders: list[OngecategoriseerdAfzender]


class AfzenderCategorieInvoer(BaseModel):
    categorie: str
    subcategorie: str | None = None


class TransactieDetail(BaseModel):
    transactie_id: str
    datum: date
    naam_omschrijving: str
    afzender: str
    winkel: str | None
    rekening: str | None
    tegenrekening: str | None
    mededelingen: str | None
    bedrag_eur: float
    saldo_na_mutatie: float | None
    categorie: str
    subcategorie: str
    handmatig_overschreven: bool
    bronbestand: str | None
    ruwe_rij: dict[str, str | None] | None

