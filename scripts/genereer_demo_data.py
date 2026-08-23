"""Genereert alle dummy-data voor de demo-omgeving (zie docker-compose.demo.yml):
een fictieve ING-bankexport, categorisatie-regels, een abonnementen-config en
een inboedel-CSV. Alle namen/bedragen zijn verzonnen — bedoeld om de app te
kunnen laten zien zonder ook maar iets echts prijs te geven.

Los te draaien: python -m scripts.genereer_demo_data
Schrijft alles naar demo/ (genegeerd in git — bij twijfel opnieuw genereren
i.p.v. handmatig bewerken, dan blijft dit script de bron van waarheid).
"""

import hashlib
import random
from datetime import date
from pathlib import Path

DEMO_ROOT = Path(__file__).resolve().parents[1] / "demo"
LANDING_DIR = DEMO_ROOT / "data" / "landing" / "transacties" / "ing"
INBOEDEL_DIR = DEMO_ROOT / "data" / "inboedel"
CONFIG_DIR = DEMO_ROOT / "config"

EIGEN_REKENING = "NL00DEMO0123456789"
VANDAAG = date.today()
START = date(VANDAAG.year - 3, 6, 1)

random.seed(42)

_iban_cache: dict[str, str] = {}


def _iban(naam: str) -> str:
    """Deterministische neppe IBAN per naam (stabiele hash, niet Python's
    ingebouwde hash() die per proces randomiseert), zodat afzender-
    consolidatie (die op tegenrekening groepeert) zich in de demo net zo
    gedraagt als in het echt — en het script bij elke run dezelfde data geeft."""
    if naam not in _iban_cache:
        digest = int(hashlib.md5(naam.encode("utf-8")).hexdigest(), 16)
        _iban_cache[naam] = f"NL{10 + digest % 90}DEMO{digest % (10**10 - 10**9) + 10**9}"
    return _iban_cache[naam]


def _maanddagen(start: date, eind: date, dag: int, jitter: int = 2) -> list[date]:
    """Eén datum per maand rond `dag`, met wat jitter — simuleert dat een
    automatische incasso niet exact op dezelfde kalenderdag valt."""
    resultaat = []
    huidig = date(start.year, start.month, 1)
    while huidig <= eind:
        d = min(dag + random.randint(-jitter, jitter), 28)
        d = max(d, 1)
        poging = date(huidig.year, huidig.month, d)
        if start <= poging <= eind:
            resultaat.append(poging)
        maand = huidig.month + 1
        jaar = huidig.year + (1 if maand > 12 else 0)
        maand = 1 if maand > 12 else maand
        huidig = date(jaar, maand, 1)
    return resultaat


class Rijen:
    def __init__(self):
        self.rijen: list[dict] = []
        self.saldo = 4200.0

    def voeg_toe(self, datum: date, naam: str, bedrag: float, code: str, mutatiesoort: str, mededelingen: str = ""):
        self.saldo += bedrag
        self.rijen.append({
            "Datum": datum.strftime("%Y%m%d"),
            "Naam / Omschrijving": naam,
            "Rekening": EIGEN_REKENING,
            "Tegenrekening": _iban(naam),
            "Code": code,
            "Af Bij": "Bij" if bedrag >= 0 else "Af",
            "Bedrag (EUR)": f"{abs(bedrag):.2f}".replace(".", ","),
            "Mutatiesoort": mutatiesoort,
            "Mededelingen": mededelingen,
            "Saldo na mutatie": f"{self.saldo:.2f}".replace(".", ","),
            "Tag": "",
        })

    def maandelijks(self, naam: str, dag: int, bedrag_reeks, code: str, mutatiesoort: str, jitter: int = 2):
        """bedrag_reeks: functie(maand_index) -> bedrag, of een vast getal."""
        for i, d in enumerate(_maanddagen(START, VANDAAG, dag, jitter)):
            bedrag = bedrag_reeks(i) if callable(bedrag_reeks) else bedrag_reeks
            self.voeg_toe(d, naam, bedrag, code, mutatiesoort)

    def jaarlijks(self, naam: str, maand: int, dag: int, bedrag_reeks, code: str, mutatiesoort: str):
        for jaar in range(START.year, VANDAAG.year + 1):
            try:
                d = date(jaar, maand, dag)
            except ValueError:
                continue
            if START <= d <= VANDAAG:
                jaar_index = jaar - START.year
                bedrag = bedrag_reeks(jaar_index) if callable(bedrag_reeks) else bedrag_reeks
                self.voeg_toe(d, naam, bedrag, code, mutatiesoort)

    def verspreid(self, namen_bedragen: list[tuple[str, tuple[float, float]]], per_maand: tuple[int, int], code: str, mutatiesoort: str):
        """Willekeurig verspreide, onregelmatige transacties — voor
        boodschappen/winkelen/uit eten, expres NIET als abonnement herkenbaar
        (wisselende bedragen, geen vast interval)."""
        huidig = date(START.year, START.month, 1)
        while huidig <= VANDAAG:
            aantal = random.randint(*per_maand)
            for _ in range(aantal):
                dag = random.randint(1, 27)
                try:
                    d = date(huidig.year, huidig.month, dag)
                except ValueError:
                    continue
                if not (START <= d <= VANDAAG):
                    continue
                naam, (lo, hi) = random.choice(namen_bedragen)
                bedrag = -round(random.uniform(lo, hi), 2)
                self.voeg_toe(d, naam, bedrag, code, mutatiesoort)
            maand = huidig.month + 1
            jaar = huidig.year + (1 if maand > 12 else 0)
            huidig = date(jaar, 1 if maand > 12 else maand, 1)


def genereer_transacties() -> Rijen:
    r = Rijen()

    # --- vaste, terugkerende posten ---
    r.maandelijks("Werkgever B.V.", 25, lambda i: 2820 + (i % 3) * 15, "GT", "Salaris")
    r.maandelijks("Verhuurder Woningen", 1, -1250, "GT", "Overschrijving")
    r.maandelijks("StroomDirect", 5, lambda i: -round(95 + 60 * abs(((i % 12) - 6) / 6), 2), "IC", "Incasso algemeen doorlopend")
    r.maandelijks("WaterFlow", 10, -24.50, "IC", "Incasso algemeen doorlopend")
    r.maandelijks("Eigen Spaarrekening", 26, -300, "GT", "Overschrijving")
    r.maandelijks("ZekerVerzekerd", 2, -145.50, "IC", "Incasso algemeen doorlopend")
    r.maandelijks("Parkeerplus", 18, -25.00, "IC", "Incasso algemeen doorlopend")
    r.maandelijks("FilmFlex", 20, -12.99, "IC", "Incasso algemeen doorlopend")
    # prijswijziging halverwege — laat zien waarom abonnementen.yaml nuttig is
    r.maandelijks("BeatStream", 8, lambda i: -9.99 if i < 20 else -11.99, "IC", "Incasso algemeen doorlopend")
    r.maandelijks("TeleConnect", 15, lambda i: -42.50 if i < 18 else -45.99, "IC", "Incasso algemeen doorlopend")

    # jaarlijks, prijs stijgt ieder jaar — met maar 3-4 jaar historie precies
    # het scenario waarvoor de handmatige override in abonnementen.yaml is bedoeld
    r.jaarlijks("Autoclub NL", 4, 14, lambda j: -(89 + j * 5), "IC", "Incasso algemeen doorlopend")

    # --- onregelmatig, bewust NIET subscription-achtig ---
    r.verspreid(
        [("Dagmarkt", (12, 65)), ("Broodhoek", (3, 14))],
        per_maand=(6, 10),
        code="BA",
        mutatiesoort="Betaalautomaat",
    )
    r.verspreid(
        [
            ("KledingKast", (18, 90)),
            ("TechHoek", (25, 320)),
            ("FietsWereld", (8, 140)),
            ("Huisstijl Meubels", (40, 650)),
            ("GroeneTuin", (10, 75)),
        ],
        per_maand=(0, 2),
        code="BA",
        mutatiesoort="Betaalautomaat",
    )
    r.verspreid(
        [("Pastabar Novara", (18, 62)), ("Sushi Kade", (22, 70)), ("KoffieKade", (3, 9))],
        per_maand=(1, 4),
        code="BA",
        mutatiesoort="Betaalautomaat",
    )
    r.verspreid(
        [("PitStop Tank", (45, 78))],
        per_maand=(1, 3),
        code="BA",
        mutatiesoort="Betaalautomaat",
    )
    r.verspreid(
        [("Geldautomaat", (20, 60))],
        per_maand=(0, 2),
        code="GM",
        mutatiesoort="Geldopname",
    )

    r.rijen.sort(key=lambda row: row["Datum"])
    return r


def schrijf_transacties_csv(r: Rijen) -> Path:
    LANDING_DIR.mkdir(parents=True, exist_ok=True)
    pad = LANDING_DIR / "demo_transacties.csv"
    kolommen = [
        "Datum", "Naam / Omschrijving", "Rekening", "Tegenrekening", "Code",
        "Af Bij", "Bedrag (EUR)", "Mutatiesoort", "Mededelingen", "Saldo na mutatie", "Tag",
    ]
    with open(pad, "w", encoding="utf-8", newline="") as f:
        f.write(";".join(kolommen) + "\n")
        for row in r.rijen:
            f.write(";".join(row[k] for k in kolommen) + "\n")
    print(f"{len(r.rijen)} transacties -> {pad}")
    return pad


CATEGORISATIE_REGELS = """\
# Demo-regels — verzonnen namen, zelfde patroon als een echte
# categorisatie_regels.yaml (zie config/categorisatie_regels.example.yaml).
regels:
  - categorie: Boodschappen
    subcategorie: Supermarkt
    prioriteit: 10
    winkel: Dagmarkt
    patroon: "dagmarkt"

  - categorie: Boodschappen
    subcategorie: Lokaal/Boer
    prioriteit: 10
    winkel: Broodhoek
    patroon: "broodhoek"

  - categorie: Wonen
    subcategorie: Huur/Hypotheek
    prioriteit: 10
    patroon: "verhuurder woningen"

  - categorie: Wonen
    subcategorie: Energie
    prioriteit: 10
    patroon: "stroomdirect"

  - categorie: Wonen
    subcategorie: Water
    prioriteit: 10
    patroon: "waterflow"

  - categorie: Verzekeringen
    subcategorie: Zorgverzekering
    prioriteit: 10
    patroon: "zekerverzekerd"

  - categorie: Verzekeringen
    subcategorie: Overig
    prioriteit: 10
    patroon: "autoclub nl"

  - categorie: Abonnementen
    subcategorie: Streaming
    prioriteit: 10
    patroon: "filmflex|beatstream"

  - categorie: Abonnementen
    subcategorie: Telecom
    prioriteit: 10
    patroon: "teleconnect"

  - categorie: Vervoer
    subcategorie: Brandstof/Parkeren
    prioriteit: 10
    patroon: "pitstop tank|parkeerplus"

  - categorie: Winkelen
    subcategorie: Kleding
    prioriteit: 10
    winkel: KledingKast
    patroon: "kledingkast"

  - categorie: Winkelen
    subcategorie: Elektronica
    prioriteit: 10
    winkel: TechHoek
    patroon: "techhoek"

  - categorie: Winkelen
    subcategorie: Sport
    prioriteit: 10
    winkel: FietsWereld
    patroon: "fietswereld"

  - categorie: Winkelen
    subcategorie: Interieur/Huis
    prioriteit: 10
    winkel: Huisstijl Meubels
    patroon: "huisstijl meubels"

  - categorie: Wonen
    subcategorie: Tuin
    prioriteit: 10
    patroon: "groenetuin"

  - categorie: Vrije tijd
    subcategorie: Uit eten/Bezorgen
    prioriteit: 10
    patroon: "pastabar novara|sushi kade|koffiekade"

  - categorie: Sparen/Beleggen
    subcategorie: Overboeking eigen rekening
    prioriteit: 5
    patroon: "eigen spaarrekening"

  - categorie: Inkomen
    subcategorie: Salaris
    prioriteit: 10
    patroon: "werkgever b\\\\.v\\\\."

  - categorie: Contant
    subcategorie: Geldopname
    prioriteit: 10
    patroon: "geldautomaat"
"""

ABONNEMENTEN_CONFIG = """\
# Demo-config — laat dezelfde twee gevallen zien als in de echte
# abonnementen.yaml: een naam-hint en een volledige override voor een
# jaarlijks abonnement met te weinig historie voor automatische detectie.
abonnementen:
  - afzender: "Autoclub NL"
    naam: "Autoclub NL — lidmaatschap"
    interval: jaarlijks

genegeerd: []
"""

INBOEDEL_CSV = """\
Omschrijving;Merk;Model;Winkel;Bedrag;Datum;Levensduur;Serienummer
Wasmachine;Whirltech;WT200;TechHoek;€\t489,00;15-03-2022;60;
Laptop;Novadyne;Air 13;TechHoek;€\t1.099,00;02-09-2023;60;NVD-993217
Bank;Huisstijl;Como 3-zits;Huisstijl Meubels;€\t899,00;20-06-2021;120;
Fiets;RollFast;Cruiser 7;FietsWereld;€\t649,00;10-05-2024;120;
Koffiemachine;BrewPoint;Cassia;Dagmarkt;€\t219,00;05-01-2025;60;
Televisie;Novadyne;OLED55;TechHoek;€\t799,00;18-11-2022;96;
"""


def schrijf_configs():
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    (CONFIG_DIR / "categorisatie_regels.yaml").write_text(CATEGORISATIE_REGELS, encoding="utf-8")
    (CONFIG_DIR / "abonnementen.yaml").write_text(ABONNEMENTEN_CONFIG, encoding="utf-8")
    print(f"configs -> {CONFIG_DIR}")


def schrijf_inboedel_csv() -> Path:
    INBOEDEL_DIR.mkdir(parents=True, exist_ok=True)
    pad = INBOEDEL_DIR / "import.csv"
    pad.write_text(INBOEDEL_CSV, encoding="utf-8")
    print(f"inboedel-CSV -> {pad}")
    return pad


if __name__ == "__main__":
    r = genereer_transacties()
    schrijf_transacties_csv(r)
    schrijf_configs()
    schrijf_inboedel_csv()
