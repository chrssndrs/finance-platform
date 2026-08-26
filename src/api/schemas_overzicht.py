from datetime import date

from pydantic import BaseModel


class VermogenOnderdeel(BaseModel):
    label: str
    bedrag: float
    laatst_bijgewerkt: date | None
    type: str
    is_geschat: bool = False


class VermogenResponse(BaseModel):
    totaal: float
    onderdelen: list[VermogenOnderdeel]


class VermogenPerMaandPunt(BaseModel):
    maand: str
    vermogen: float
    mutatie: float | None


class VermogenPerMaandResponse(BaseModel):
    maanden: list[VermogenPerMaandPunt]


class WidgetInvoer(BaseModel):
    titel: str | None = None
    categorie: str | None = None
    subcategorie: str | None = None
    afzender: str | None = None
    granulariteit: str = "maand"
    periode_modus: str = "relatief"
    periode_aantal: int | None = None
    periode_eenheid: str | None = None
    periode_vanaf: date | None = None
    periode_tot: date | None = None
    weergave: str = "grafiek"
    volgorde: int = 0


class Widget(BaseModel):
    id: int
    titel: str | None
    categorie: str | None
    subcategorie: str | None
    afzender: str | None
    granulariteit: str
    periode_modus: str
    periode_aantal: int | None
    periode_eenheid: str | None
    periode_vanaf: date | None
    periode_tot: date | None
    weergave: str
    volgorde: int


class WidgetenResponse(BaseModel):
    widgets: list[Widget]
