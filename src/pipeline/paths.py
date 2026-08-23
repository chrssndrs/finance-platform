import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_ROOT = Path(os.environ.get("FINANCE_DATA_ROOT", PROJECT_ROOT))
DB_PAD = DATA_ROOT / "db" / "finance.duckdb"
LANDING_ROOT = DATA_ROOT / "data" / "landing"
LOGOS_PAD = DATA_ROOT / "data" / "logos"

CONFIG_ROOT = Path(os.environ.get("FINANCE_CONFIG_ROOT", PROJECT_ROOT / "config"))
