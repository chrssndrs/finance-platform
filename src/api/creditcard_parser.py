import re
from dataclasses import dataclass
from datetime import date, datetime

# Matcht de aankondigingszin die het exacte bedrag, de datum en de rekening
# noemt van de incasso die dit afschrift gaat veroorzaken op de gekoppelde
# betaalrekening — dit is het doelbedrag/de doeltransactie om de gesplitste
# regels aan te koppelen.
_DOEL_PATROON = re.compile(
    r"Op (\d{2}-\d{2}-\d{4}) schrijven wij €([\d.,]+) af van uw betaalrekening met nummer ([A-Z0-9 ]+)\."
)

# Matcht elke boekingsregel: datum, omschrijving, type, bedrag. 'Incasso' is
# de aflossing van de VORIGE periode (niet een aankoop van deze periode) en
# wordt hieronder expliciet overgeslagen.
_REGEL_PATROON = re.compile(
    r"^(\d{2}-\d{2}-\d{4})\s+(.+?)\s+(Incasso|Betaling|Ontvangst)\s+([+-][\d.,]+)$",
    re.MULTILINE,
)


@dataclass
class GeparsteRegel:
    datum: date
    omschrijving: str
    bedrag: float


@dataclass
class CreditcardAfschrift:
    doel_datum: date
    doel_bedrag: float  # positief: bedrag dat van de betaalrekening wordt afgeschreven
    doel_rekening: str
    regels: list[GeparsteRegel]


def _bedrag_naar_float(s: str) -> float:
    return float(s.replace(".", "").replace(",", "."))


def _datum_naar_date(s: str) -> date:
    return datetime.strptime(s, "%d-%m-%Y").date()


def parse_ing_creditcard(tekst: str) -> CreditcardAfschrift | None:
    """Herkent een ING Creditcard More-afschrift en haalt de individuele
    aankopen eruit. Geeft None terug als het formaat niet herkend wordt of
    er geen bruikbare regels uit komen — de upload valt dan gewoon terug
    op handmatige invoer, zoals altijd."""
    if "ING Creditcard" not in tekst:
        return None
    doel_match = _DOEL_PATROON.search(tekst)
    if doel_match is None:
        return None
    doel_datum_str, doel_bedrag_str, doel_rekening_ruw = doel_match.groups()

    regels = [
        GeparsteRegel(
            datum=_datum_naar_date(datum_str),
            omschrijving=omschrijving.strip(),
            bedrag=_bedrag_naar_float(bedrag_str),
        )
        for datum_str, omschrijving, type_, bedrag_str in _REGEL_PATROON.findall(tekst)
        if type_ != "Incasso"
    ]
    if not regels:
        return None

    return CreditcardAfschrift(
        doel_datum=_datum_naar_date(doel_datum_str),
        doel_bedrag=_bedrag_naar_float(doel_bedrag_str),
        doel_rekening=doel_rekening_ruw.replace(" ", "").strip().upper(),
        regels=regels,
    )
