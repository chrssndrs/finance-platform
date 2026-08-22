import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routers import rapportage

app = FastAPI(title="Finance Platform API")

# CORS_ORIGINS: kommagescheiden lijst, bv. "http://localhost:3000,http://192.168.1.140:3000"
# zodat de frontend ook vanaf andere apparaten op je netwerk (telefoon, tablet) mag praten
# met de API. Standaard alleen localhost, voor lokale development.
cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(rapportage.router)
