import duckdb
from fastapi import APIRouter, Depends

from src.api.deps import get_db, get_write_db
from src.api.schemas_sparen import HandmatigSaldoInvoer, SparenResponse, SpaarRekening
from src.api.sparen_berekening import bereken_spaarrekeningen

router = APIRouter(prefix="/api/sparen")


def _sparen_response(con: duckdb.DuckDBPyConnection) -> SparenResponse:
    rekeningen = [SpaarRekening(**r) for r in bereken_spaarrekeningen(con)]
    handmatig_rij = con.execute("SELECT bedrag::DOUBLE, aangepast_op FROM overzicht.sparen WHERE id = 1").fetchone()
    handmatig_saldo, aangepast_op = handmatig_rij if handmatig_rij else (0.0, None)
    totaal = round(sum(r.geschat_saldo for r in rekeningen) + handmatig_saldo, 2)
    return SparenResponse(
        rekeningen=rekeningen,
        handmatig_saldo=handmatig_saldo,
        handmatig_aangepast_op=aangepast_op.date() if aangepast_op else None,
        totaal=totaal,
    )


@router.get("", response_model=SparenResponse)
def get_sparen(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> SparenResponse:
    return _sparen_response(con)


@router.put("/handmatig", response_model=SparenResponse)
def put_handmatig(
    invoer: HandmatigSaldoInvoer, con: duckdb.DuckDBPyConnection = Depends(get_write_db)
) -> SparenResponse:
    con.execute(
        "UPDATE overzicht.sparen SET bedrag = $bedrag, aangepast_op = now() WHERE id = 1",
        {"bedrag": invoer.bedrag},
    )
    return _sparen_response(con)
