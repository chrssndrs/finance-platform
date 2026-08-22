# Finance Platform

Zelfgebouwd platform voor persoonlijke financiën: banktransacties importeren,
automatisch categoriseren, en bevragen via een simpele webinterface. Gebouwd
als vervanging van Firefly III, met volledige controle over datamodellering en
categorisatielogica.

## Architectuur

- **DuckDB** (`db/finance.duckdb`) — één bestand, medallion-pattern per domein-schema:
  `landing → bronze → silver → gold`. Momenteel is het `transacties`-domein
  (ING CSV-import) geïmplementeerd.
- **Pipeline** (`main.py`) — Python-orchestrator, draait de stappen
  bronze → silver → gold, fail-fast. Bedoeld om nachtelijk via cron te draaien.
- **API** (`src/api/`) — read-only FastAPI-laag; opent per request een
  read-only DuckDB-connectie (nooit een langlevende), zodat de nachtelijke
  pipeline nooit geblokkeerd wordt.
- **Frontend** (`frontend/`) — Next.js/TypeScript/Tailwind, één rapportscherm
  met filters (categorie/subcategorie/periode) en een gestapelde
  inkomsten/uitgaven-grafiek per maand.
- **Categorisatie** (`config/categorisatie_regels.yaml`) — Firefly III-stijl
  regel-engine: regex-matching met prioriteit, plus handmatige overrides die
  nooit worden overschreven door een pipeline-run.

Alle writes lopen uitsluitend via de pipeline — nooit via de API/webapp — om
DuckDB write-lock conflicten te voorkomen (DuckDB is single-writer-XOR-readers
op bestandsniveau).

## Lokaal draaien (zonder Docker)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp config/categorisatie_regels.example.yaml config/categorisatie_regels.yaml
# pas config/categorisatie_regels.yaml aan naar je eigen bank-export/winkels

mkdir -p data/landing/transacties/ing
# zet je ING CSV-exports in data/landing/transacties/ing/

python main.py                    # draait de pipeline eenmalig
```

API en frontend voor development:

```bash
python -m uvicorn src.api.main:app --reload --port 8000

cd frontend && npm install && npm run dev
```

De notebooks in `notebooks/` zijn dunne wrappers rond dezelfde pipeline-code
(`src/pipeline/`), handig voor interactief werk en verificatie.

## Draaien met Docker

```bash
cp .env.example .env
cp config/categorisatie_regels.example.yaml config/categorisatie_regels.yaml
```

Pas `.env` aan:
- `FINANCE_DATA_ROOT` — map (bv. een NAS-share) met daarin `db/` en `data/landing/`
- `FINANCE_CONFIG_ROOT` — map met je eigen `categorisatie_regels.yaml`
- `NEXT_PUBLIC_API_BASE_URL` — adres waarop de browser de API bereikt (bv. `http://jouw-nas:8000`)

```bash
docker compose build
docker compose up -d
```

Dit start drie services:
- `pipeline` — draait `main.py` elke nacht om 03:00 via cron in de container
- `api` — FastAPI op poort 8000
- `frontend` — Next.js op poort 3000

Landing-CSV's, de database en je persoonlijke categorisatie-regels blijven
buiten de image — alles loopt via de gemounte `FINANCE_DATA_ROOT`/`FINANCE_CONFIG_ROOT`.

Wijzig je `NEXT_PUBLIC_API_BASE_URL`? Bouw dan de frontend opnieuw
(`NEXT_PUBLIC_*`-vars worden tijdens de build ingebakken):

```bash
docker compose build frontend && docker compose up -d frontend
```

## Projectstructuur

```
main.py                    # pipeline-orchestrator
src/pipeline/               # bronze/silver/gold per domein
src/api/                    # read-only FastAPI-laag
frontend/                   # Next.js-rapportage
notebooks/                  # interactieve wrappers rond src/pipeline/
config/                     # categorisatie-regels (jouw versie: git-ignored)
data/landing/                # bronbestanden (git-ignored)
db/                          # DuckDB-bestand (git-ignored)
docker-compose.yml, Dockerfile, frontend/Dockerfile
```
