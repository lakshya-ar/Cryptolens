import { useState } from "react";
import { Plot } from "../plot.jsx";
import { Panel, Status, Stat } from "./ui.jsx";
import { useApp } from "../state.jsx";
import { api } from "../api";
import { useFetch } from "../hooks";
import { COLORS, baseLayout, plotConfig } from "../theme";

const SCENARIOS = ["normal", "stress", "crash"];
// Traffic-light metaphor, but darkened for AA contrast on white and
// separated in luminance so the three states survive colour-blind viewing.
const SCEN_COLOR = { normal: "#1a7f37", stress: "#9a6700", crash: "#cf222e" };
const pct = (x) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);

const SCEN_GLOW = { normal: "ok", stress: "warn", crash: "crit" };

/** View 4 — Volatility Engine: risk analytics with normal/stress/crash tail risk. */
export default function VolatilityEngine({ index = 0 }) {
  const { asset, window } = useApp();
  const [scenario, setScenario] = useState("normal");

  const { data, loading, error } = useFetch(
    () => api.volatility({ symbol: asset, start: window.start, end: window.end, resolution: "auto" }),
    [asset, window.start, window.end]
  );

  const sc = data?.scenarios?.[scenario];
  const thresholds = ["0.05", "0.10", "0.15", "0.20"];

  const rollFig = {
    data: [
      {
        type: "scatter",
        mode: "lines",
        x: (data?.rolling ?? []).map((r) => r.ts),
        y: (data?.rolling ?? []).map((r) => r.vol),
        line: { color: COLORS.accent, width: 1.5 },
        hovertemplate: "%{x|%b %d}  %{y:.1%}<extra></extra>",
      },
    ],
    layout: baseLayout({
      height: 104,
      margin: { l: 46, r: 10, t: 4, b: 28 },
      xaxis: { type: "date", gridcolor: COLORS.grid },
      yaxis: { tickformat: ".0%", gridcolor: COLORS.grid },
    }),
  };

  const probFig = {
    data: [
      {
        type: "bar",
        x: thresholds.map((t) => `${Math.round(+t * 100)}%`),
        y: thresholds.map((t) => sc?.drop_probs?.[t] ?? 0),
        marker: { color: SCEN_COLOR[scenario] },
        hovertemplate: "≥%{x} drop:  %{y:.2%}<extra></extra>",
      },
    ],
    layout: baseLayout({
      height: 112,
      margin: { l: 46, r: 10, t: 4, b: 30 },
      xaxis: {
        title: { text: `drop within one ${data?.resolution ?? ""} bar`, font: { size: 10 } },
        gridcolor: COLORS.grid,
      },
      yaxis: { tickformat: ".1%", gridcolor: COLORS.grid },
    }),
  };

  return (
    <Panel
      index={index}
      glow={data ? SCEN_GLOW[scenario] : undefined}
      className="span-2"
      title="Volatility Engine"
      subtitle={data ? `ann. vol ${pct(data.annualized_vol)}` : "risk analytics"}
      actions={
        <div className="seg">
          {SCENARIOS.map((s) => (
            <button key={s} className={scenario === s ? "active" : ""} onClick={() => setScenario(s)}>
              {s}
            </button>
          ))}
        </div>
      }
    >
      <Status loading={loading} error={error} empty={data && !data.scenarios}>
        {data && (
          <>
            <div style={{ color: COLORS.muted, fontSize: 11, margin: "2px 0 2px" }}>
              Rolling annualized volatility
            </div>
            <Plot data={rollFig.data} layout={rollFig.layout} config={plotConfig} style={{ width: "100%" }} useResizeHandler />
            <div style={{ color: COLORS.muted, fontSize: 11, margin: "6px 0 2px" }}>
              P(drop ≥ threshold) — <b style={{ color: SCEN_COLOR[scenario] }}>{scenario}</b> scenario
            </div>
            <Plot data={probFig.data} layout={probFig.layout} config={plotConfig} style={{ width: "100%" }} useResizeHandler />
            <div className="stats-row">
              <Stat label="VaR 95%" num={sc?.var95} format={(v) => `${(v * 100).toFixed(1)}%`} tone="down" />
              <Stat label="VaR 99%" num={sc?.var99} format={(v) => `${(v * 100).toFixed(1)}%`} tone="down" />
              <Stat label="CVaR 95%" num={sc?.cvar95} format={(v) => `${(v * 100).toFixed(1)}%`} tone="down" />
              <Stat label="Kurtosis" num={data.distribution.kurtosis} format={(v) => v.toFixed(2)} />
            </div>
          </>
        )}
      </Status>
    </Panel>
  );
}
