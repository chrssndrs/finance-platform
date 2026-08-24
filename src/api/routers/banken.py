import io
import re
from pathlib import Path

import duckdb
import pandas as pd
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile

from src.api.deps import get_db, get_write_db
from src.api.queries_banken import (
    SQL_BANK_INVOEGEN,
    SQL_BANK_LAATST_GEBRUIKT_ZETTEN,
    SQL_BANK_OPHALEN,
    SQL_BANKEN,
)
from src.api.routers.instellingen import _valideer_locatie
from src.api.schemas_banken import Bank, BankenResponse, BankRegistratie, KolomDetectie
from src.pipeline.paths import DATA_ROOT

router = APIRouter(prefix="/api/banken")

MAX_BESTAND_BYTES = 50 * 1024 * 1024
BANK_SLUG_PATROON = re.compile(r"^[a-z0-9][a-z0-9-]{0,31}$")


def _naar_bank(rij: tuple) -> Bank:
    (
        bank, naam, locatie, separator, datum_kolom, datum_formaat,
        omschrijving_kolom, rekening_kolom, tegenrekening_kolom,
        bedrag_kolom, bedrag_decimaal_teken, richting_kolom,
        richting_negatief_waarde, mededelingen_kolom, saldo_kolom, laatst_gebruikt_op,
    ) = rij
    return Bank(
        bank=bank, naam=naam, locatie=locatie, separator=separator,
        datum_kolom=datum_kolom, datum_formaat=datum_formaat,
        omschrijving_kolom=omschrijving_kolom, rekening_kolom=rekening_kolom,
        tegenrekening_kolom=tegenrekening_kolom, bedrag_kolom=bedrag_kolom,
        bedrag_decimaal_teken=bedrag_decimaal_teken, richting_kolom=richting_kolom,
        richting_negatief_waarde=richting_negatief_waarde,
        mededelingen_kolom=mededelingen_kolom, saldo_kolom=saldo_kolom,
        laatst_gebruikt_op=laatst_gebruikt_op,
    )


def _decodeer(inhoud: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return inhoud.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise HTTPException(status_code=400, detail="Kon de tekst-codering van het bestand niet herkennen.")


@router.get("", response_model=BankenResponse)
def get_banken(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> BankenResponse:
    rijen = con.execute(SQL_BANKEN).fetchall()
    return BankenResponse(banken=[_naar_bank(r) for r in rijen])


@router.post("/detecteer-kolommen", response_model=KolomDetectie)
async def post_detecteer_kolommen(
    bestand: UploadFile,
    separator: str = Form(...),
) -> KolomDetectie:
    inhoud = await bestand.read()
    if len(inhoud) > MAX_BESTAND_BYTES:
        raise HTTPException(status_code=400, detail="Bestand mag maximaal 50 MB zijn.")
    tekst = _decodeer(inhoud)
    try:
        kolommen = pd.read_csv(io.StringIO(tekst), sep=separator, nrows=0).columns.tolist()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Kon de kolommen niet lezen: {e}") from e
    if not kolommen:
        raise HTTPException(status_code=400, detail="Geen kolommen gevonden — klopt de separator?")
    return KolomDetectie(kolommen=kolommen)


@router.post("", response_model=Bank)
def post_bank(
    invoer: BankRegistratie,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Bank:
    if not BANK_SLUG_PATROON.match(invoer.bank):
        raise HTTPException(
            status_code=400,
            detail="Bank-code mag alleen kleine letters, cijfers en '-' bevatten (max 32 tekens).",
        )
    if con.execute(SQL_BANK_OPHALEN, {"bank": invoer.bank}).fetchone() is not None:
        raise HTTPException(status_code=400, detail=f"Bank {invoer.bank!r} bestaat al.")
    if not invoer.naam.strip():
        raise HTTPException(status_code=400, detail="Naam is verplicht.")
    if not invoer.locatie.strip():
        raise HTTPException(status_code=400, detail="Locatie is verplicht.")
    _valideer_locatie(invoer.locatie, "Locatie")

    con.execute(SQL_BANK_INVOEGEN, invoer.model_dump())
    (DATA_ROOT / invoer.locatie).mkdir(parents=True, exist_ok=True)
    rij = con.execute(SQL_BANK_OPHALEN, {"bank": invoer.bank}).fetchone()
    return _naar_bank(rij)


@router.post("/{bank}/upload", response_model=Bank)
async def post_bank_upload(
    bank: str,
    bestand: UploadFile,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Bank:
    rij = con.execute(SQL_BANK_OPHALEN, {"bank": bank}).fetchone()
    if rij is None:
        raise HTTPException(status_code=404, detail="Bank niet gevonden.")
    bank_config = _naar_bank(rij)

    inhoud = await bestand.read()
    if len(inhoud) > MAX_BESTAND_BYTES:
        raise HTTPException(status_code=400, detail="Bestand mag maximaal 50 MB zijn.")

    map_pad = DATA_ROOT / bank_config.locatie
    map_pad.mkdir(parents=True, exist_ok=True)
    oorspronkelijke_naam = Path(bestand.filename or "export.csv").name
    doel_pad = map_pad / oorspronkelijke_naam
    if doel_pad.exists():
        stem, suffix = Path(oorspronkelijke_naam).stem, Path(oorspronkelijke_naam).suffix
        doel_pad = map_pad / f"{stem}_{pd.Timestamp.now().strftime('%Y%m%d%H%M%S')}{suffix}"
    doel_pad.write_bytes(inhoud)

    con.execute(SQL_BANK_LAATST_GEBRUIKT_ZETTEN, {"bank": bank})
    rij = con.execute(SQL_BANK_OPHALEN, {"bank": bank}).fetchone()
    return _naar_bank(rij)
