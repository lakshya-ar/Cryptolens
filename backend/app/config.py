"""Central configuration for CryptoLens backend."""
import os
from pathlib import Path

# Project layout ------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent
DATA_DIR = PROJECT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# PostgreSQL Connection String 
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/cryptolens")

# Comma-separated allowed CORS origins
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

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
    "1w": "1 week",
    "1mo": "1 month",
}

# Binance public data portal
VISION_BASE = "https://data.binance.vision/data/spot/monthly/klines"