"""Download Binance 1m klines using binance-historical-data and load to PostgreSQL."""
from __future__ import annotations

import argparse
import os
import sys
import pandas as pd
import psycopg2
import psycopg2.extras
from datetime import date

# The package promised in the project proposal Tech Stack table
from binance_historical_data import BinanceDataDumper

from app.config import ASSETS, SYMBOLS, DATA_DIR, DATABASE_URL

SCHEMA = """
CREATE TABLE IF NOT EXISTS klines_1m (
    symbol       VARCHAR(10) NOT NULL,
    ts           TIMESTAMP NOT NULL,
    open         DOUBLE PRECISION,
    high         DOUBLE PRECISION,
    low          DOUBLE PRECISION,
    close        DOUBLE PRECISION,
    volume       DOUBLE PRECISION,
    quote_volume DOUBLE PRECISION,
    trades       BIGINT,
    PRIMARY KEY (symbol, ts)
);
"""

def _parse_csv_to_tuples(filepath: str, symbol: str) -> list[tuple]:
    cols = ["open_time", "open", "high", "low", "close", "volume", 
            "close_time", "quote_volume", "count", "taker_buy_volume", 
            "taker_buy_quote_volume", "ignore"]
    
    with open(filepath, 'r') as f:
        first_line = f.readline().lower()
    has_header = "open_time" in first_line

    df = pd.read_csv(filepath, names=cols, header=0 if has_header else None)
    
    sample = float(df["open_time"].iloc[0])
    unit = "us" if sample > 1e14 else "ms"
    df["ts"] = pd.to_datetime(df["open_time"].astype("int64"), unit=unit)
    
    df.insert(0, "symbol", symbol)
    df.rename(columns={"count": "trades"}, inplace=True)
    
    subset = df[["symbol", "ts", "open", "high", "low", "close", "volume", "quote_volume", "trades"]]
    return [tuple(x) for x in subset.to_numpy()]

def ingest(symbols: list[str], start: str, end: str) -> None:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute(SCHEMA)
    conn.commit()

    dump_dir = os.path.join(DATA_DIR, "binance_dump")
    start_date = date(int(start.split("-")[0]), int(start.split("-")[1]), 1)
    end_date = date(int(end.split("-")[0]), int(end.split("-")[1]), 28)

    data_dumper = BinanceDataDumper(
        path_dir_where_to_dump=dump_dir,
        asset_class="spot",
        data_type="klines",
        data_frequency="1m",
    )

    total_rows = 0
    insert_query = """
        INSERT INTO klines_1m (symbol, ts, open, high, low, close, volume, quote_volume, trades)
        VALUES %s ON CONFLICT (symbol, ts) DO NOTHING
    """

    for symbol in symbols:
        pair = ASSETS[symbol]
        print(f"Downloading {pair} via binance-historical-data...")
        
        data_dumper.dump_data(
            tickers=[pair],
            date_start=start_date,
            date_end=end_date,
            is_to_update_existing=False
        )
        
        pair_dir = os.path.join(dump_dir, "spot", "monthly", "klines", pair, "1m")
        if not os.path.exists(pair_dir):
            continue
            
        csv_files = [f for f in os.listdir(pair_dir) if f.endswith('.zip') or f.endswith('.csv')]
        
        print(f"Loading {len(csv_files)} files into PostgreSQL for {symbol}...")
        for file in csv_files:
            filepath = os.path.join(pair_dir, file)
            data_tuples = _parse_csv_to_tuples(filepath, symbol)
            
            psycopg2.extras.execute_values(cur, insert_query, data_tuples)
            conn.commit()
            total_rows += len(data_tuples)
                
    cur.close()
    conn.close()
    print(f"\nDone. Ingested {total_rows} total rows into PostgreSQL.")

def main() -> None:
    p = argparse.ArgumentParser(description="Download Binance 1m klines into PostgreSQL.")
    p.add_argument("--start", required=True, help="start month, YYYY-MM")
    p.add_argument("--end", default=date.today().strftime("%Y-%m"), help="end month, YYYY-MM")
    p.add_argument("--symbols", nargs="*", default=SYMBOLS, help=f"subset of {SYMBOLS}")
    args = p.parse_args()

    bad = [s for s in args.symbols if s not in ASSETS]
    if bad:
        p.error(f"unknown symbols {bad}; choose from {SYMBOLS}")

    print(f"Ingesting {args.symbols} for {args.start}..{args.end}")
    ingest(args.symbols, args.start, args.end)

if __name__ == "__main__":
    main()