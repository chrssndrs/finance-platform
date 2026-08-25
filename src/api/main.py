import os
from contextlib import asynccontextmanager

import duckdb
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.api.routers import (
    abonnementen,
    banken,
    beleggingen,
    contantgeld,
    hypotheek,
    inboedel,
    instellingen,
    overzicht,
    planning,
    rapportage,
    vastgoed,
    verzamelfacturen,
)
from src.pipeline import schema
from src.pipeline.paths import DB_PAD, LOGOS_PAD


@asynccontextmanager
async def lifespan(app: FastAPI):
    # idempotent (CREATE ... IF NOT EXISTS) — nodig zodat de API ook op een
    # verse install werkt vóórdat de pipeline ooit gedraaid heeft (bv.
    # inboedel.artikelen moet bestaan voordat je er iets aan kunt toevoegen).
    con = duckdb.connect(str(DB_PAD))
    try:
        schema.init_schemas(con)
    finally:
        con.close()
    yield


app = FastAPI(title="Finance Platform API", lifespan=lifespan)

# gedownloade abonnement-logo's (zie src/pipeline/abonnementen/detectie.py) —
# map moet bestaan vóórdat StaticFiles hem mount, ook bij een verse install
# zonder ooit gedraaide pipeline.
LOGOS_PAD.mkdir(parents=True, exist_ok=True)
app.mount("/logos", StaticFiles(directory=str(LOGOS_PAD)), name="logos")

# CORS_ORIGINS: kommagescheiden lijst, bv. "http://localhost:3000,http://192.168.1.140:3000"
# zodat de frontend ook vanaf andere apparaten op je netwerk (telefoon, tablet) mag praten
# met de API. Standaard alleen localhost, voor lokale development.
cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(rapportage.router)
app.include_router(inboedel.router)
app.include_router(abonnementen.router)
app.include_router(instellingen.router)
app.include_router(vastgoed.router)
app.include_router(beleggingen.router)
app.include_router(hypotheek.router)
app.include_router(overzicht.router)
app.include_router(planning.router)
app.include_router(verzamelfacturen.router)
app.include_router(banken.router)
app.include_router(contantgeld.router)
