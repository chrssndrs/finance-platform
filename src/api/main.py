from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routers import rapportage

app = FastAPI(title="Finance Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(rapportage.router)
