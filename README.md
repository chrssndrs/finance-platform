# Finance Platform

Zelfgebouwd platform voor persoonlijke financiën: banktransacties importeren,
automatisch categoriseren, en overzichtelijk terugvinden via een webinterface.

Voor een uitgebreide uitleg van alle logica erachter (hoe categorisatie
werkt, hoe het banksaldo geschat wordt, hoe de hypotheekberekening werkt,
etc.) — zie [docs/LOGICA.md](docs/LOGICA.md).

## Functionaliteiten

- **Banktransacties** — bank-exports worden automatisch gecategoriseerd aan de
  hand van eigen regels, met handmatige overrides die nooit worden
  overschreven.
- **Bank-exports uploaden** — via het upload-menu in de webinterface. Meerdere
  banken worden ondersteund (incl. spaarrekeningen); een nieuwe bank voeg je
  zelf toe met een eenmalige koppeling van de kolomnamen, en kunt u later
  altijd aanpassen. Een upload wordt direct verwerkt.
- **Verzamelfacturen** — één factuur met meerdere posten uploaden en splitsen
  in losse regels, met automatisch matchen op bedrag tegen de bijbehorende
  transactie. Bereikbaar via het upload-menu.
- **Spullen** — huisraad bijhouden (winkel, prijs, aankoopdatum, verwachte
  levensduur, categorie); een artikel is met één klik aan te maken vanuit een
  transactie, met winkel/prijs/datum al ingevuld.
- **Vaste lasten** — terugkerende abonnementen worden automatisch herkend,
  inclusief logo en prijswijzigingen.
- **Beleggingen** — transacties, meerdere portefeuilles en posities bijhouden
  met actuele koersen en winst/verlies-percentage.
- **Woning** — woningwaarde én hypotheek-leningdelen/schuldverloop per pand,
  op één pagina.
- **Planning** — verwacht toekomstige kosten, zoals bijna-versleten spullen
  die aan vervanging toe zijn, met een "is dit haalbaar?"-check.
- **Cash** — contant geld bijhouden per locatie, uitgesplitst per coupure.
- **Sparen** — spaarrekeningsaldo's (inclusief geschat actueel saldo), met
  een alias en spaardoel per rekening.
- **Overzicht & Vermogen** — een zelf samen te stellen widget-dashboard, plus
  een aparte Vermogen-pagina met de totale vermogensopbouw en een
  maandelijkse mutatie-geschiedenis.
- **Rapportage** — filterbare grafieken en overzichten per categorie en
  periode, met een doorzoekbare transactie-tabel en detailweergave.

## Installatie (met Docker)

```bash
cp .env.example .env
cp config/categorisatie_regels.example.yaml config/categorisatie_regels.yaml
```

Pas `.env` aan:
- `FINANCE_DATA_ROOT` — map waarin je data komt te staan (bv. een NAS-share)
- `FINANCE_CONFIG_ROOT` — map met je eigen `categorisatie_regels.yaml`
- `NEXT_PUBLIC_API_BASE_URL` — adres waarop je de webinterface bereikt, bv.
  `http://192.168.1.140:8000` als je 'm ook vanaf je telefoon wilt gebruiken

Start het platform:

```bash
docker compose build
docker compose up -d
```

De webinterface is daarna bereikbaar op poort 3000. Nieuwe bank-exports of
verzamelfacturen upload je vanaf dat moment gewoon via het upload-menu — een
losse map met CSV's klaarzetten is niet nodig.

Wijzig je `NEXT_PUBLIC_API_BASE_URL` achteraf? Bouw dan de webinterface
opnieuw:

```bash
docker compose build frontend && docker compose up -d frontend
```

## Lokaal draaien (zonder Docker)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp config/categorisatie_regels.example.yaml config/categorisatie_regels.yaml
# pas config/categorisatie_regels.yaml aan naar je eigen situatie

python main.py                    # verwerkt eenmalig alle klaarstaande data
python -m uvicorn src.api.main:app --reload --port 8000

cd frontend && npm install && npm run dev
```
