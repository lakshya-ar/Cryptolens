// Grab the unified host injected by Render, or default to local proxies
let BASE = import.meta.env.VITE_API_BASE || "/api";

// Format host into a proper HTTPS URL with /api pathing
if (BASE && !BASE.startsWith('http') && !BASE.startsWith('/')) {
  BASE = `https://${BASE}/api`;
} else if (BASE.startsWith('http') && !BASE.endsWith('/api')) {
  BASE += '/api';
}

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

// Handle WebSocket connection directly through the same single backend host
let WS = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

if (WS && !WS.startsWith('ws')) {
  // Point directly to the unified /ws endpoint in FastAPI
  WS = `wss://${WS}/ws`;
} else if (WS === "ws://localhost:8000") {
  WS = "ws://localhost:8000/ws";
}

export const WS_URL = WS;