"""Idempotent data bootstrap, run at service startup (not build time).

On Render the build phase runs outside the private network and cannot reach the
managed Postgres, so ingestion must happen at runtime. This script:
  1. waits for the database to become reachable,
  2. ingests the starter dataset only if `klines_1m` is empty,
  3. otherwise exits fast (so cold starts stay quick).

Window is configurable via the INGEST_START / INGEST_END env vars (YYYY-MM).
"""
from __future__ import annotations

import os
import time

import psycopg2

from app.config import DATABASE_URL, SYMBOLS
from ingestion.download import ingest

START = os.environ.get("INGEST_START", "2024-01")
END = os.environ.get("INGEST_END", "2024-03")


def _row_count(retries: int = 10, delay: float = 3.0) -> int:
    """Rows in klines_1m, or -1 if the DB never became reachable."""
    for attempt in range(retries):
        try:
            conn = psycopg2.connect(DATABASE_URL)
        except psycopg2.OperationalError as exc:
            print(f"[bootstrap] DB not reachable yet ({attempt + 1}/{retries}): {exc}", flush=True)
            time.sleep(delay)
            continue
        try:
            cur = conn.cursor()
            cur.execute("SELECT to_regclass('public.klines_1m')")
            if cur.fetchone()[0] is None:
                return 0
            cur.execute("SELECT count(*) FROM klines_1m")
            return int(cur.fetchone()[0])
        finally:
            conn.close()
    return -1


def main() -> None:
    n = _row_count()
    if n > 0:
        print(f"[bootstrap] klines_1m already has {n} rows — skipping ingestion.", flush=True)
        return
    if n < 0:
        print("[bootstrap] gave up waiting for the database; skipping ingestion.", flush=True)
        return
    print(f"[bootstrap] empty database — ingesting {SYMBOLS} for {START}..{END}", flush=True)
    try:
        ingest(SYMBOLS, START, END)
    except Exception as exc:  # never take the web process down over ingestion
        print(f"[bootstrap] ingestion failed: {exc}", flush=True)


if __name__ == "__main__":
    main()
