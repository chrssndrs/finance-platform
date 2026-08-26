import logging

import duckdb
import pandas as pd

from src.pipeline import schema
from src.pipeline.abonnementen import detectie as abonnementen
from src.pipeline.beleggingen import koersen
from src.pipeline.transacties import bronze, gold, silver

logger = logging.getLogger(__name__)


class PipelineStapGefaald(Exception):
    def __init__(self, stap: str, oorzaak: Exception):
        super().__init__(f"Stap {stap!r} gefaald: {oorzaak}")
        self.stap = stap
        self.oorzaak = oorzaak


def run_pipeline(con: duckdb.DuckDBPyConnection, forceer_silver: bool = False) -> dict:
    """Draait bronze -> silver -> gold -> abonnementen -> koersen op de
    gegeven connectie (fail-fast per stap). Gebruikt door zowel de
    nachtelijke cron (main.py) als de bank-upload-endpoint (meteen
    verwerken na een handmatige upload).

    forceer_silver: negeert de "geen nieuwe bestanden -> silver overslaan"-
    optimalisatie hieronder. Nodig voor een handmatige "pipeline opnieuw
    draaien"-knop en na het verwijderen van een fout geüpload bestand — in
    beide gevallen zijn er geen NIEUWE bestanden, maar moet silver/gold wel
    opnieuw volledig herberekend worden (silver/gold herbouwen sowieso altijd
    volledig vanaf bronze, dus dit is de enige manier om een verwijderd
    bestand daadwerkelijk uit de downstream-tabellen te laten verdwijnen).
    """
    gestart_op = pd.Timestamp.now()
    schema.init_schemas(con)
    resultaten: dict = {}

    logger.info("Start stap: bronze")
    try:
        resultaten["bronze"] = bronze.run_bronze(con)
    except Exception as e:
        logger.exception("Stap 'bronze' gefaald — pipeline gestopt (fail-fast)")
        schema.log_run(con, gestart_op, "gefaald", "bronze gefaald")
        raise PipelineStapGefaald("bronze", e) from e
    logger.info("Stap 'bronze' geslaagd: %s", resultaten["bronze"])

    if resultaten["bronze"].bestanden_verwerkt == 0 and not forceer_silver:
        logger.info("Geen nieuwe bronze-data — silver overgeslagen (zou identieke output geven)")
    else:
        logger.info("Start stap: silver")
        try:
            resultaten["silver"] = silver.run_silver(con)
        except Exception as e:
            logger.exception("Stap 'silver' gefaald — pipeline gestopt (fail-fast)")
            schema.log_run(con, gestart_op, "gefaald", "silver gefaald")
            raise PipelineStapGefaald("silver", e) from e
        logger.info("Stap 'silver' geslaagd: %s", resultaten["silver"])

    logger.info("Start stap: gold")
    try:
        resultaten["gold"] = gold.run_gold(con)
    except Exception as e:
        logger.exception("Stap 'gold' gefaald — pipeline gestopt (fail-fast)")
        schema.log_run(con, gestart_op, "gefaald", "gold gefaald")
        raise PipelineStapGefaald("gold", e) from e
    logger.info("Stap 'gold' geslaagd: %s", resultaten["gold"])

    logger.info("Start stap: abonnementen")
    try:
        resultaten["abonnementen"] = abonnementen.run_abonnementen(con)
    except Exception as e:
        logger.exception("Stap 'abonnementen' gefaald — pipeline gestopt (fail-fast)")
        schema.log_run(con, gestart_op, "gefaald", "abonnementen gefaald")
        raise PipelineStapGefaald("abonnementen", e) from e
    logger.info("Stap 'abonnementen' geslaagd: %s", resultaten["abonnementen"])

    logger.info("Start stap: koersen")
    try:
        resultaten["koersen"] = koersen.run_koersen(con)
    except Exception as e:
        logger.exception("Stap 'koersen' gefaald — pipeline gestopt (fail-fast)")
        schema.log_run(con, gestart_op, "gefaald", "koersen gefaald")
        raise PipelineStapGefaald("koersen", e) from e
    logger.info("Stap 'koersen' geslaagd: %s", resultaten["koersen"])

    logger.info("Pipeline geslaagd. Samenvatting: %s", resultaten)
    schema.log_run(con, gestart_op, "geslaagd", str(resultaten))
    return resultaten
