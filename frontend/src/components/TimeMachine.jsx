import { Plot } from "../plot.jsx";
import { Panel, Status } from "./ui.jsx";
import { useApp } from "../state.jsx";
import { api } from "../api";
import { useFetch } from "../hooks";
import { COLORS, ASSET_COLOR, baseLayout, plotConfig } from "../theme";

/**
 * View 1 — The Time Machine: multi-resolution temporal explorer.
 * A compressed full-history overview with a range-slider brush drives the
 * shared window; the detail panel renders candlesticks + volume at the
 * auto-selected resolution.
 */
// Quick-zoom presets. The backend maps each resulting span to a readable
// candle resolution (5Y→monthly, 1Y→weekly, 1M→daily, 1W/1D→hourly).
const PRESETS = [
  { label: "5Y", days: 5 * 365 },
  { label: "1Y", days: 365 },
  { label: "1M", days: 30 },
  { label: "1W", days: 7 },
  { label: "1D", days: 1 },
];
const RES_LABEL = { "1mo": "monthly", "1w": "weekly", "1d": "daily", "1h": "hourly", "1m": "1-min" };

export default function TimeMachine({ index = 0 }) {
  const { asset, meta, window, setWindow, events } = useApp();
  const cov = meta?.coverage?.find((c) => c.symbol === asset);

  // Jump the shared window to the last `days` of available data.
  const applyPreset = (days) => {
    if (!cov) return;
    const end = new Date(cov.end.replace(" ", "T"));
    const lo = new Date(cov.start.replace(" ", "T"));
    const start = new Date(Math.max(lo.getTime(), end.getTime() - days * 86400000));
    setWindow({ start: start.toISOString(), end: end.toISOString() });
  };

  const overview = useFetch(
    () => api.ohlcv({ symbol: asset, start: cov.start, end: cov.end, resolution: "1d" }),
    [asset, cov?.start, cov?.end],
    !!cov
  );

  const detail = useFetch(
    () => api.ohlcv({ symbol: asset, start: window.start, end: window.end, resolution: "auto" }),
    [asset, window.start, window.end],
    !!window
  );

  const onRelayout = (e) => {
    if (e["xaxis.autorange"] && cov) {
      setWindow({ start: cov.start, end: cov.end });
      return;
    }
    const s = e["xaxis.range[0]"] ?? e["xaxis.range"]?.[0];
    const en = e["xaxis.range[1]"] ?? e["xaxis.range"]?.[1];
    if (s && en) {
      setWindow({ start: new Date(s).toISOString(), end: new Date(en).toISOString() });
    }
  };

  const oc = overview.data?.candles ?? [];
  const color = ASSET_COLOR[asset] ?? COLORS.accent;
  const overviewFig = {
    data: [
      {
        type: "scatter",
        mode: "lines",
        x: oc.map((c) => c.ts),
        y: oc.map((c) => c.close),
        line: { color, width: 1.2 },
        fill: "tozeroy",
        fillcolor: color + "18",
        hovertemplate: "%{x|%b %Y}  $%{y:,.0f}<extra></extra>",
      },
    ],
    layout: baseLayout({
      height: 110,
      dragmode: false,
      uirevision: asset,
      // Same left/right margins as the detail chart so both x-axes align.
      margin: { l: 54, r: 12, t: 4, b: 8 },
      xaxis: {
        type: "date",
        gridcolor: COLORS.grid,
        rangeslider: { visible: true, thickness: 0.45, bgcolor: COLORS.panelHead, bordercolor: COLORS.border },
        range: [window.start, window.end],
      },
      yaxis: { visible: false, fixedrange: true },
    }),
  };

  const dc = detail.data?.candles ?? [];

  // What-If trigger timestamps that fall inside the current window, drawn as
  // markers above the candles (linked view: the pattern scan annotates the
  // timeline).
  const t0 = new Date(window.start).getTime();
  const t1 = new Date(window.end).getTime();
  const evTs = (events ?? []).filter((t) => {
    const x = new Date(t.replace(" ", "T")).getTime();
    return x >= t0 && x <= t1;
  });
  const maxHigh = dc.length ? Math.max(...dc.map((c) => c.high)) : 0;

  const detailFig = {
    data: [
      {
        type: "candlestick",
        x: dc.map((c) => c.ts),
        open: dc.map((c) => c.open),
        high: dc.map((c) => c.high),
        low: dc.map((c) => c.low),
        close: dc.map((c) => c.close),
        increasing: { line: { color: COLORS.up } },
        decreasing: { line: { color: COLORS.down } },
        yaxis: "y",
      },
      {
        type: "bar",
        x: dc.map((c) => c.ts),
        y: dc.map((c) => c.volume),
        marker: {
          color: dc.map((c) =>
            c.close >= c.open ? "rgba(38,166,154,0.45)" : "rgba(239,83,80,0.45)"
          ),
        },
        yaxis: "y2",
      },
      ...(evTs.length && dc.length
        ? [
            {
              type: "scatter",
              mode: "markers",
              x: evTs,
              y: evTs.map(() => maxHigh * 1.02),
              marker: { symbol: "triangle-down", size: 7, color: "#9a6700" },
              name: "what-if trigger",
              hovertemplate: "What-If trigger  %{x|%b %d, %H:%M}<extra></extra>",
              yaxis: "y",
            },
          ]
        : []),
    ],
    layout: baseLayout({
      height: 384,
      uirevision: "detail",
      margin: { l: 54, r: 12, t: 4, b: 22 },
      xaxis: { type: "date", gridcolor: COLORS.grid, rangeslider: { visible: false } },
      yaxis: { domain: [0.24, 1], gridcolor: COLORS.grid, tickprefix: "$" },
      yaxis2: { domain: [0, 0.17], gridcolor: COLORS.grid },
    }),
  };

  return (
    <Panel
      index={index}
      className="span-6"
      title="The Time Machine"
      subtitle={`Temporal explorer · ${RES_LABEL[detail.data?.resolution] ?? "…"} candles · brush the slider or use the presets`}
      actions={
        <div className="seg">
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => applyPreset(p.days)} disabled={!cov}>
              {p.label}
            </button>
          ))}
        </div>
      }
    >
      <Status loading={overview.loading} error={overview.error}>
        <Plot
          data={overviewFig.data}
          layout={overviewFig.layout}
          config={plotConfig}
          onRelayout={onRelayout}
          style={{ width: "100%" }}
          useResizeHandler
        />
      </Status>
      <Status loading={detail.loading} error={detail.error} empty={dc.length === 0}>
        <Plot
          data={detailFig.data}
          layout={detailFig.layout}
          config={plotConfig}
          style={{ width: "100%" }}
          useResizeHandler
        />
      </Status>
    </Panel>
  );
}
