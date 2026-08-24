import duckdb
from fastapi import APIRouter, Depends, HTTPException

from src.api.deps import get_db, get_write_db
from src.api.schemas_instellingen import Instellingen, InstellingenInvoer, InstellingenResponse
from src.pipeline.paths import DATA_ROOT

router = APIRouter(prefix="/api/instellingen")


def _valideer_locatie(locatie: str, veldnaam: str) -> None:
    # Moet binnen de gemounte data-root blijven — de container ziet toch
    # niets daarbuiten, dus alles anders is hoe dan ook een doodlopend pad,
    # en ".."-padtraversal willen we sowieso niet toestaan.
    kandidaat = (DATA_ROOT / locatie).resolve()
    if not kandidaat.is_relative_to(DATA_ROOT.resolve()):
        raise HTTPException(
            status_code=400,
            detail=f"{veldnaam} moet binnen de gemounte data-map blijven (geen '..').",
        )


@router.get("", response_model=InstellingenResponse)
def get_instellingen(con: duckdb.DuckDBPyConnection = Depends(get_db)) -> InstellingenResponse:
    (
        planning_drempel_modus, planning_drempel_waarde,
        verzamelfacturen_locatie, data_te_oud_na_dagen, trend_venster_maanden,
    ) = con.execute(
        """SELECT planning_drempel_modus, planning_drempel_waarde,
                  verzamelfacturen_locatie, data_te_oud_na_dagen, trend_venster_maanden
           FROM instellingen.instellingen WHERE id = 1"""
    ).fetchone()
    return InstellingenResponse(
        instellingen=Instellingen(
            planning_drempel_modus=planning_drempel_modus,
            planning_drempel_waarde=planning_drempel_waarde,
            verzamelfacturen_locatie=verzamelfacturen_locatie,
            data_te_oud_na_dagen=data_te_oud_na_dagen,
            trend_venster_maanden=trend_venster_maanden,
        ),
    )


@router.put("", response_model=InstellingenResponse)
def put_instellingen(
    invoer: InstellingenInvoer,
    con: duckdb.DuckDBPyConnection = Depends(get_write_db),
) -> InstellingenResponse:
    if invoer.planning_drempel_waarde <= 0:
        raise HTTPException(status_code=400, detail="Planning-drempelwaarde moet groter dan 0 zijn.")
    if not invoer.verzamelfacturen_locatie.strip():
        raise HTTPException(status_code=400, detail="Locatie voor verzamelfacturen mag niet leeg zijn.")
    _valideer_locatie(invoer.verzamelfacturen_locatie, "Locatie voor verzamelfacturen")
    if invoer.data_te_oud_na_dagen <= 0:
        raise HTTPException(status_code=400, detail="'Te oud na' moet groter dan 0 zijn.")
    if invoer.trend_venster_maanden <= 0:
        raise HTTPException(status_code=400, detail="Trend-venster moet groter dan 0 zijn.")

    con.execute(
        """UPDATE instellingen.instellingen
           SET planning_drempel_modus = ?, planning_drempel_waarde = ?,
               verzamelfacturen_locatie = ?, data_te_oud_na_dagen = ?, trend_venster_maanden = ?,
               aangepast_op = now()
           WHERE id = 1""",
        [
            invoer.planning_drempel_modus, invoer.planning_drempel_waarde,
            invoer.verzamelfacturen_locatie, invoer.data_te_oud_na_dagen, invoer.trend_venster_maanden,
        ],
    )
    return InstellingenResponse(
        instellingen=Instellingen(
            planning_drempel_modus=invoer.planning_drempel_modus,
            planning_drempel_waarde=invoer.planning_drempel_waarde,
            verzamelfacturen_locatie=invoer.verzamelfacturen_locatie,
            data_te_oud_na_dagen=invoer.data_te_oud_na_dagen,
            trend_venster_maanden=invoer.trend_venster_maanden,
        ),
    )
