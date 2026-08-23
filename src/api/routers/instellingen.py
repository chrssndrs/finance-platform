import duckdb
from fastapi import APIRouter, Depends, HTTPException

from src.api.deps import get_db, get_write_db
from src.api.schemas_instellingen import (
    BeschikbareBank,
    Instellingen,
    InstellingenInvoer,
    InstellingenResponse,
)
from src.pipeline.bank_config import beschikbare_banken
from src.pipeline.paths import DATA_ROOT

router = APIRouter(prefix="/api/instellingen")


def _bank_naam(bank: str, banken: list[dict]) -> str:
    for b in banken:
        if b["bank"] == bank:
            return b["naam"]
    return bank


def _valideer_export_locatie(export_locatie: str) -> None:
    # Moet binnen de gemounte data-root blijven — de container ziet toch
    # niets daarbuiten, dus alles anders is hoe dan ook een doodlopend pad,
    # en ".."-padtraversal willen we sowieso niet toestaan.
    kandidaat = (DATA_ROOT / export_locatie).resolve()
    if not kandidaat.is_relative_to(DATA_ROOT.resolve()):
        raise HTTPException(
            status_code=400,
            detail="Locatie moet binnen de gemounte data-map blijven (geen '..').",
        )


@router.get("", response_model=InstellingenResponse)
def get_instellingen(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> InstellingenResponse:
    bank, export_locatie = con.execute(
        "SELECT bank, export_locatie FROM instellingen.instellingen WHERE id = 1"
    ).fetchone()
    banken = beschikbare_banken()
    return InstellingenResponse(
        instellingen=Instellingen(bank=bank, bank_naam=_bank_naam(bank, banken), export_locatie=export_locatie),
        beschikbare_banken=[BeschikbareBank(**b) for b in banken],
    )


@router.put("", response_model=InstellingenResponse)
def put_instellingen(
    invoer: InstellingenInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> InstellingenResponse:
    banken = beschikbare_banken()
    if invoer.bank not in {b["bank"] for b in banken}:
        raise HTTPException(status_code=400, detail=f"Onbekende bank {invoer.bank!r}.")
    if not invoer.export_locatie.strip():
        raise HTTPException(status_code=400, detail="Locatie mag niet leeg zijn.")
    _valideer_export_locatie(invoer.export_locatie)

    con.execute(
        "UPDATE instellingen.instellingen SET bank = ?, export_locatie = ?, aangepast_op = now() WHERE id = 1",
        [invoer.bank, invoer.export_locatie],
    )
    return InstellingenResponse(
        instellingen=Instellingen(
            bank=invoer.bank, bank_naam=_bank_naam(invoer.bank, banken), export_locatie=invoer.export_locatie,
        ),
        beschikbare_banken=[BeschikbareBank(**b) for b in banken],
    )
