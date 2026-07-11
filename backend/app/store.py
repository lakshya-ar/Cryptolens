"""PostgreSQL access layer and Pandas resampling."""
from __future__ import annotations

from datetime import datetime
import pandas as pd
import psycopg2

from .config import ASSETS, RESOLUTIONS, DATABASE_URL

class DataUnavailable(RuntimeError):
    """Raised when the database has not been built yet."""

def get_connection():
    try:
        return psycopg2.connect(DATABASE_URL)
    except psycopg2.OperationalError:
        raise DataUnavailable("Database not reachable. Check your PostgreSQL connection.")

def coverage() -> list[dict]:
    """Per-symbol time coverage and row counts."""
    query = "SELECT symbol, min(ts) AS start, max(ts) AS end, count(*) AS rows FROM klines_1m GROUP BY symbol ORDER BY symbol"
    conn = get_connection()
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    df["start"] = df["start"].astype(str)
    df["end"] = df["end"].astype(str)
    return df.to_dict("records")

def pick_resolution(start: datetime, end: datetime, coarse_ok: bool = False) -> str:
    span_days = (end - start).total_seconds() / 86400
    if coarse_ok:
        if span_days > 400: return "1mo"
        if span_days > 75: return "1w"
        if span_days > 8: return "1d"
        if span_days > 0.9: return "1h"
        return "1m"
    if span_days <= 3: return "1m"
    if span_days <= 60: return "1h"
    return "1d"

def ohlcv(symbol: str, start: datetime, end: datetime, resolution: str) -> pd.DataFrame:
    """Fetches 1m data and uses Pandas resampling for higher resolutions."""
    if symbol not in ASSETS:
        raise ValueError(f"unknown symbol {symbol}")
    
    query = "SELECT ts, open, high, low, close, volume FROM klines_1m WHERE symbol = %s AND ts >= %s AND ts <= %s ORDER BY ts"
    
    conn = get_connection()
    df = pd.read_sql_query(query, conn, params=(symbol, start, end))
    conn.close()
    
    if df.empty:
        return df
        
    df.set_index("ts", inplace=True)

    if resolution == "1m":
        return df.reset_index()

    # Pandas resample operations
    res_map = {"1h": "1h", "1d": "1D", "1w": "1W", "1mo": "ME"}
    rule = res_map.get(resolution, "1D")

    # Aggregate using pandas
    resampled = df.resample(rule).agg({
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        'volume': 'sum'
    }).dropna()

    return resampled.reset_index()

def closes(symbols: list[str], start: datetime, end: datetime, resolution: str) -> pd.DataFrame:
    """Wide frame of bucketed close prices: index=ts, one column per symbol."""
    frames = []
    for sym in symbols:
        df = ohlcv(sym, start, end, resolution)
        if not df.empty:
            df = df.set_index("ts")["close"].rename(sym)
            frames.append(df)
            
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, axis=1).sort_index()

def full_range(symbol: str) -> tuple[datetime, datetime] | None:
    query = "SELECT min(ts) AS start, max(ts) AS end FROM klines_1m WHERE symbol = %s"
    conn = get_connection()
    df = pd.read_sql_query(query, conn, params=(symbol,))
    conn.close()
    
    if df.empty or pd.isna(df.iloc[0]["start"]):
        return None
    return df.iloc[0]["start"].to_pydatetime(), df.iloc[0]["end"].to_pydatetime()