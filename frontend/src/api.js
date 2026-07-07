const BASE = "/api";

async function get(path, params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== "");
  const qs = new URLSearchParams(entries).toString();
  const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json();
}

export const api = {
  meta: () => get("/meta"),
  ohlcv: (p) => get("/ohlcv", p),
  volatility: (p) => get("/volatility", p),
  correlation: (p) => get("/correlation", p),
  correlationPair: (p) => get("/correlation/pair", p),
  patterns: (p) => get("/patterns", p),
  depth: (p) => get("/depth", p),
};

export const WS_URL = "ws://localhost:8080";
