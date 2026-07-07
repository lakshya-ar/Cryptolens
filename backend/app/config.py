"""Central configuration for CryptoLens backend."""
from pathlib import Path

# Project layout ------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent
DATA_DIR = PROJECT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "cryptolens.duckdb"

# Assets --------------------------------------------------------------------
# display symbol -> Binance USDT trading pair
ASSETS: dict[str, str] = {
    "BTC": "BTCUSDT",
    "ETH": "ETHUSDT",
    "BNB": "BNBUSDT",
    "SOL": "SOLUSDT",
    "XRP": "XRPUSDT",
}
SYMBOLS = list(ASSETS.keys())

# Resolutions ---------------------------------------------------------------
RESOLUTIONS = {
    "1m": "1 minute",
    "1h": "1 hour",
    "1d": "1 day",
}

# Binance public data portal
VISION_BASE = "https://data.binance.vision/data/spot/monthly/klines"
