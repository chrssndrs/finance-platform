import mimetypes
import uuid
from pathlib import Path

import duckdb
from fastapi import APIRouter, Depends, Form, HTTPException, Response, UploadFile
from fastapi.responses import FileResponse

from src.api.deps import get_db, get_write_db
from src.api.queries_verzamelfacturen import (
    SQL_AANTAL_REGELS_VOOR_FACTUUR,
    SQL_FACTUREN,
    SQL_FACTUUR_BIJWERKEN,
    SQL_FACTUUR_INVOEGEN,
    SQL_FACTUUR_OPHALEN,
    SQL_FACTUUR_STATUS_ZETTEN,
    SQL_FACTUUR_VERWIJDEREN,
    SQL_REGEL_BIJWERKEN,
    SQL_REGEL_INVOEGEN,
    SQL_REGEL_OPHALEN,
    SQL_REGEL_VERWIJDEREN,
    SQL_REGELS_VOOR_FACTUUR,
)
from src.api.schemas_verzamelfacturen import (
    Factuur,
    FactuurBijwerken,
    FactuurMetRegels,
    FacturenResponse,
    Regel,
    RegelInvoer,
)
from src.pipeline.paths import DATA_ROOT

router = APIRouter(prefix="/api/verzamelfacturen")

MAX_BESTAND_BYTES = 20 * 1024 * 1024


def _naar_factuur(id_, bestandsnaam, origineel_bestandsnaam, bron, totaalbedrag, transactie_id, status, geupload_op) -> Factuur:
    return Factuur(
        id=id_, bestandsnaam=bestandsnaam, origineel_bestandsnaam=origineel_bestandsnaam,
        bron=bron, totaalbedrag=totaalbedrag, transactie_id=transactie_id,
        status=status, geupload_op=geupload_op,
    )


def _naar_regel(id_, factuur_id, omschrijving, bedrag, categorie, subcategorie) -> Regel:
    return Regel(id=id_, factuur_id=factuur_id, omschrijving=omschrijving, bedrag=bedrag, categorie=categorie, subcategorie=subcategorie)


def _verzamelfacturen_map(con: duckdb.DuckDBPyConnection) -> Path:
    locatie = con.execute("SELECT verzamelfacturen_locatie FROM instellingen.instellingen WHERE id = 1").fetchone()[0]
    return DATA_ROOT / locatie


def _herbereken_status(con: duckdb.DuckDBPyConnection, factuur_id: int) -> None:
    aantal_regels = con.execute(SQL_AANTAL_REGELS_VOOR_FACTUUR, {"factuur_id": factuur_id}).fetchone()[0]
    if aantal_regels > 0:
        nieuwe_status = "gesplitst"
    else:
        transactie_id = con.execute(SQL_FACTUUR_OPHALEN, {"id": factuur_id}).fetchone()[4]
        nieuwe_status = "gematcht" if transactie_id else "nieuw"
    con.execute(SQL_FACTUUR_STATUS_ZETTEN, {"id": factuur_id, "status": nieuwe_status})


@router.get("/facturen", response_model=FacturenResponse)
def get_facturen(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> FacturenResponse:
    rijen = con.execute(SQL_FACTUREN).fetchall()
    return FacturenResponse(facturen=[_naar_factuur(*rij) for rij in rijen])


@router.get("/facturen/{factuur_id}", response_model=FactuurMetRegels)
def get_factuur(factuur_id: int, con: duckdb.DuckDBPyConnection = Depends(get_db)) -> FactuurMetRegels:
    rij = con.execute(SQL_FACTUUR_OPHALEN, {"id": factuur_id}).fetchone()
    if rij is None:
        raise HTTPException(status_code=404, detail="Verzamelfactuur niet gevonden.")
    regels = con.execute(SQL_REGELS_VOOR_FACTUUR, {"factuur_id": factuur_id}).fetchall()
    return FactuurMetRegels(**_naar_factuur(*rij).model_dump(), regels=[_naar_regel(*r) for r in regels])


@router.get("/facturen/{factuur_id}/bestand")
def get_factuur_bestand(factuur_id: int, con: duckdb.DuckDBPyConnection = Depends(get_db)) -> FileResponse:
    rij = con.execute(SQL_FACTUUR_OPHALEN, {"id": factuur_id}).fetchone()
    if rij is None:
        raise HTTPException(status_code=404, detail="Verzamelfactuur niet gevonden.")
    bestandsnaam = rij[1]
    pad = _verzamelfacturen_map(con) / bestandsnaam
    if not pad.is_file():
        raise HTTPException(status_code=404, detail="Bestand niet (meer) aanwezig op schijf.")
    media_type = mimetypes.guess_type(bestandsnaam)[0] or "application/octet-stream"
    return FileResponse(pad, media_type=media_type)


@router.post("/facturen", response_model=Factuur)
async def post_factuur(
    bestand: UploadFile,
    bron: str = Form(...),
    totaalbedrag: float | None = Form(None),
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Factuur:
    if not bron.strip():
        raise HTTPException(status_code=400, detail="Bron is verplicht (bv. 'Bol.com' of 'Creditcard ICS').")
    inhoud = await bestand.read()
    if len(inhoud) > MAX_BESTAND_BYTES:
        raise HTTPException(status_code=400, detail="Bestand mag maximaal 20 MB zijn.")

    map_pad = _verzamelfacturen_map(con)
    map_pad.mkdir(parents=True, exist_ok=True)
    extensie = Path(bestand.filename or "").suffix
    # Willekeurige bestandsnaam op schijf i.p.v. de originele — voorkomt
    # padtraversal/overschrijven via een kwaadwillige bestandsnaam en
    # botsingen tussen gelijknamige uploads; de originele naam blijft
    # bewaard in de kolom origineel_bestandsnaam voor weergave.
    bestandsnaam = f"{uuid.uuid4().hex}{extensie}"
    (map_pad / bestandsnaam).write_bytes(inhoud)

    nieuw_id = con.execute(
        SQL_FACTUUR_INVOEGEN,
        {
            "bestandsnaam": bestandsnaam,
            "origineel_bestandsnaam": bestand.filename,
            "bron": bron.strip(),
            "totaalbedrag": totaalbedrag,
        },
    ).fetchone()[0]
    rij = con.execute(SQL_FACTUUR_OPHALEN, {"id": nieuw_id}).fetchone()
    return _naar_factuur(*rij)


@router.put("/facturen/{factuur_id}", response_model=Factuur)
def put_factuur(
    factuur_id: int,
    invoer: FactuurBijwerken,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Factuur:
    if not invoer.bron.strip():
        raise HTTPException(status_code=400, detail="Bron is verplicht.")
    resultaat = con.execute(
        SQL_FACTUUR_BIJWERKEN,
        {
            "id": factuur_id, "bron": invoer.bron.strip(),
            "totaalbedrag": invoer.totaalbedrag, "transactie_id": invoer.transactie_id,
        },
    ).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Verzamelfactuur niet gevonden.")
    # een net ontkoppelde factuur (transactie_id -> NULL) kan niet meer
    # 'gesplitst' zijn — herbereken status op basis van regels + koppeling.
    _herbereken_status(con, factuur_id)
    rij = con.execute(SQL_FACTUUR_OPHALEN, {"id": factuur_id}).fetchone()
    return _naar_factuur(*rij)


@router.delete("/facturen/{factuur_id}", status_code=204)
def delete_factuur(factuur_id: int, con: duckdb.DuckDBPyConnection = Depends(get_write_db)) -> Response:
    rij = con.execute(SQL_FACTUUR_OPHALEN, {"id": factuur_id}).fetchone()
    if rij is None:
        raise HTTPException(status_code=404, detail="Verzamelfactuur niet gevonden.")
    bestandsnaam = rij[1]
    con.execute("DELETE FROM verzamelfacturen.regels WHERE factuur_id = $id", {"id": factuur_id})
    con.execute(SQL_FACTUUR_VERWIJDEREN, {"id": factuur_id})
    pad = _verzamelfacturen_map(con) / bestandsnaam
    if pad.is_file():
        pad.unlink()
    return Response(status_code=204)


@router.post("/facturen/{factuur_id}/regels", response_model=Regel)
def post_regel(
    factuur_id: int,
    invoer: RegelInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Regel:
    if con.execute(SQL_FACTUUR_OPHALEN, {"id": factuur_id}).fetchone() is None:
        raise HTTPException(status_code=404, detail="Verzamelfactuur niet gevonden.")
    nieuw_id = con.execute(
        SQL_REGEL_INVOEGEN,
        {
            "factuur_id": factuur_id, "omschrijving": invoer.omschrijving, "bedrag": invoer.bedrag,
            "categorie": invoer.categorie, "subcategorie": invoer.subcategorie,
        },
    ).fetchone()[0]
    _herbereken_status(con, factuur_id)
    rij = con.execute(SQL_REGEL_OPHALEN, {"id": nieuw_id}).fetchone()
    return _naar_regel(*rij)


@router.put("/regels/{regel_id}", response_model=Regel)
def put_regel(
    regel_id: int,
    invoer: RegelInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> Regel:
    resultaat = con.execute(
        SQL_REGEL_BIJWERKEN,
        {
            "id": regel_id, "omschrijving": invoer.omschrijving, "bedrag": invoer.bedrag,
            "categorie": invoer.categorie, "subcategorie": invoer.subcategorie,
        },
    ).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Regel niet gevonden.")
    rij = con.execute(SQL_REGEL_OPHALEN, {"id": regel_id}).fetchone()
    return _naar_regel(*rij)


@router.delete("/regels/{regel_id}", status_code=204)
def delete_regel(regel_id: int, con: duckdb.DuckDBPyConnection = Depends(get_write_db)) -> Response:
    resultaat = con.execute(SQL_REGEL_VERWIJDEREN, {"id": regel_id}).fetchone()
    if resultaat is None:
        raise HTTPException(status_code=404, detail="Regel niet gevonden.")
    factuur_id = resultaat[0]
    _herbereken_status(con, factuur_id)
    return Response(status_code=204)
