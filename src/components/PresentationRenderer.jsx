import { useState, useMemo, useRef, useCallback, useEffect, startTransition, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProject, saveProject, createVersion, renameVersion, deleteVersion, restoreVersion, createNamedShareLink } from "../store";
import { calculateAll, project20Years, fmtEuro, fmtNum, getDynamicHeroCards, getPhaseCalcItems } from "../calcEngine";
import { C } from "../colors";
import { ThemeProvider, useTheme } from "../ThemeContext";
import { resolveTheme } from "../themes";
import Icon from "./Icons";
import { useFocusTrap } from "../useFocusTrap";
import { getVal, setVal } from "../utils";

const MarketAnalysis = lazy(() => import("./MarketAnalysis"));
const PdfExport = lazy(() => import("./PdfExport"));
const PhaseVisual = lazy(() => import("./PhaseVisuals"));

/* ── Style Constants ── */
const F = "Calibri, sans-serif";
const S = {
  labelSmall: { fontFamily: F, fontSize: "0.7rem", letterSpacing: "0.5px", textTransform: "uppercase", color: "#B0B0A6" },
  labelTiny: { fontFamily: F, fontSize: "0.7rem", letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700 },
  valueText: { fontFamily: F, fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.1 },
  cardBase: { borderRadius: "7px", padding: "0.45rem 0.5rem", background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))" },
  sectionHeading: { fontFamily: F, fontSize: "0.7rem", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem" },
  flexCenter: { display: "flex", alignItems: "center", justifyContent: "center" },
  pillBtn: { borderRadius: "2rem", fontFamily: F, fontSize: "0.7rem", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", transition: "all 0.3s", whiteSpace: "nowrap" },
};

function getPhaseColor(phase, T) {
  const map = { gold: T.gold, green: T.green, navy: T.navyLight };
  return map[phase?.color] || T.gold;
}

const INVEST_MAP = {
  analyse: "investPhase1", pv: "investPhase2", speicher: "investPhase3",
  waerme: "investPhase4", ladeinfra: "investPhase5", bess: "investPhase6",
};

/* ── Config Group Definitions ── */
const CONFIG_GROUPS = [
  { title: "ENERGIEPROFIL", icon: "bolt", sliders: [
    { path: ["energy", "stromverbrauch"], label: "Stromverbrauch", unit: "MWh/a", min: 500, max: 100000, step: 500 },
    { path: ["energy", "gasverbrauch"], label: "Gasverbrauch", unit: "MWh/a", min: 0, max: 50000, step: 500 },
    { path: ["energy", "strompreis"], label: "Strompreis", unit: "ct/kWh", min: 8, max: 40, step: 0.5, dec: 1 },
    { path: ["energy", "gaspreis"], label: "Gaspreis", unit: "ct/kWh", min: 2, max: 18, step: 0.5, dec: 1 },
  ]},
  { title: "PV-AUSBAU", icon: "sun", sliders: [
    { path: ["phaseConfig", "pv", "pvDach"], label: "PV Dach", unit: "MWp", min: 0, max: 20, step: 0.1, dec: 1 },
    { path: ["phaseConfig", "pv", "pvFassade"], label: "PV Fassade", unit: "MWp", min: 0, max: 5, step: 0.1, dec: 1 },
    { path: ["phaseConfig", "pv", "pvCarport"], label: "PV Carport", unit: "MWp", min: 0, max: 10, step: 0.1, dec: 1 },
    { path: ["phaseConfig", "pv", "pvFreiflaeche"], label: "PV Freifläche", unit: "MWp", min: 0, max: 20, step: 0.1, dec: 1 },
  ]},
  { title: "SPEICHER", icon: "battery", sliders: [
    { path: ["phaseConfig", "speicher", "kapazitaet"], label: "Standort-BESS", unit: "MWh", min: 0, max: 50, step: 0.5, dec: 1 },
  ]},
  { title: "WÄRME", icon: "fire", sliders: [
    { path: ["phaseConfig", "waerme", "wpLeistung"], label: "WP-Leistung", unit: "MW", min: 0, max: 20, step: 0.5, dec: 1 },
    { path: ["phaseConfig", "waerme", "pufferspeicher"], label: "Pufferspeicher", unit: "m³", min: 0, max: 1000, step: 50 },
  ]},
  { title: "MOBILITÄT", icon: "car", sliders: [
    { path: ["phaseConfig", "ladeinfra", "anzahlPKW"], label: "PKW Ladepunkte", unit: "Stk", min: 0, max: 200, step: 5 },
    { path: ["phaseConfig", "ladeinfra", "anzahlLKW"], label: "LKW Ladepunkte", unit: "Stk", min: 0, max: 30, step: 1 },
    { path: ["phaseConfig", "ladeinfra", "dieselpreis"], label: "Dieselpreis", unit: "€/l", min: 1.0, max: 2.5, step: 0.05, dec: 2 },
  ]},
  { title: "GRAUSTROM-BESS", icon: "grid", sliders: [
    { path: ["phaseConfig", "bess", "kapazitaet"], label: "BESS Kapazität", unit: "MWh", min: 0, max: 500, step: 10 },
  ]},
  { title: "FINANZIERUNG", icon: "bank", sliders: [
    { path: ["finance", "ekAnteil"], label: "Eigenkapitalanteil", unit: "%", min: 10, max: 100, step: 5 },
    { path: ["finance", "kreditZins"], label: "Kreditzins", unit: "% p.a.", min: 2, max: 8, step: 0.1, dec: 1 },
    { path: ["finance", "kreditLaufzeit"], label: "Kreditlaufzeit", unit: "Jahre", min: 5, max: 25, step: 1 },
  ]},
];

/* getVal/setVal imported from ../utils */

/* ── Independence Score Ring (Eckart-Style, 130px, animated count) ── */
function ScoreRing({ score, color, label, size = 130 }) {
  const T = useTheme();
  const r = (size - 20) / 2, c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const half = size / 2;

  // Animated number easing
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const from = prevRef.current, to = pct;
    if (from === to) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setDisplay(to); prevRef.current = to; return; }
    const dur = 800;
    let start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(step);
      else prevRef.current = to;
    };
    requestAnimationFrame(step);
  }, [pct]);

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={half} cy={half} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={T.gold} />
            <stop offset="100%" stopColor={T.greenLight} />
          </linearGradient>
        </defs>
        <circle cx={half} cy={half} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      {/* Center text overlay */}
      <div style={{ position: "relative", marginTop: -size, height: size, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: T.font, fontSize: size * 0.26, fontWeight: 700, color: T.goldLight, lineHeight: 1 }}>{display}%</span>
        <span style={{ fontFamily: T.font, fontSize: Math.max(size * 0.08, 8), textTransform: "uppercase", letterSpacing: "1.5px", color: T.softGray, marginTop: 2 }}>Autarkie</span>
      </div>
      {label && <div style={{ fontFamily: T.font, fontSize: "0.65rem", color: T.softGray, marginTop: "0.3rem", lineHeight: 1.3, maxWidth: size }}>{label}</div>}
    </div>
  );
}

/* ── KPI Card ── */
function KPICard({ label, value, color, accent }) {
  const T = useTheme();
  const cardColor = accent ? T.gold : color;
  return (
    <div style={{ ...S.cardBase, border: `1px solid ${cardColor}22` }}>
      <div style={{ ...S.labelSmall, fontSize: "0.6rem", marginBottom: "0.15rem" }}>{label}</div>
      <div style={{ ...S.valueText, color: cardColor }}>{value}</div>
    </div>
  );
}

/* ── Highlight Card ── */
function HighlightCard({ icon, title, text, color }) {
  const T = useTheme();
  return (
    <div style={{ ...S.cardBase, padding: "0.6rem", border: `1px solid ${color}15` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
        <Icon name={icon} size={16} color={color} />
        <span style={{ fontFamily: T.font, fontSize: "0.8rem", fontWeight: 700, color }}>{title}</span>
      </div>
      <div style={{ fontFamily: T.font, fontSize: "0.75rem", color: T.midGray, lineHeight: 1.4 }}>{text}</div>
    </div>
  );
}

/* ── Config Slider (Dark Theme) ── */
function ConfigSlider({ label, value, min, max, step, unit, dec, onChange }) {
  const T = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const startEdit = () => {
    setDraft(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };
  const commitEdit = () => {
    const v = parseFloat(String(draft).replace(",", "."));
    if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
    setEditing(false);
  };

  const display = dec != null
    ? Number(value).toFixed(dec).replace(".", ",")
    : Number(value).toLocaleString("de-DE");

  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.15rem" }}>
        <span style={{ fontFamily: T.font, fontSize: "0.72rem", color: "#aaa" }}>{label}</span>
        {editing ? (
          <input ref={inputRef} type="text" inputMode="decimal" value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
            style={{
              width: 65, padding: "0.1rem 0.3rem", textAlign: "right",
              background: "rgba(255,255,255,0.1)", border: `1px solid ${T.gold}60`,
              borderRadius: 3, color: T.goldLight || T.gold, fontFamily: T.font, fontSize: "0.75rem", outline: "none",
            }}
          />
        ) : (
          <span onClick={startEdit} style={{
            fontFamily: T.font, fontSize: "0.75rem", color: T.goldLight || T.gold, fontWeight: 600,
            cursor: "pointer", padding: "0.1rem 0.3rem", borderRadius: 3, background: "rgba(255,255,255,0.04)",
          }}>
            {display} <span style={{ fontSize: "0.6rem", color: "#777" }}>{unit}</span>
          </span>
        )}
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: T.gold, height: 4, cursor: "pointer" }}
      />
    </div>
  );
}


/* ── Phase Content (Eckart-Style Layout) ── */
function PhaseContent({ phase, color, liveKpis }) {
  const T = useTheme();
  if (!phase) return null;
  const green = T.greenLight || T.green;

  // Use live calculated KPIs if available, otherwise fall back to generated
  const kpis = (liveKpis && liveKpis.length > 0) ? liveKpis : phase.kpis;

  return (
    <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
      {/* Description */}
      <p style={{ fontFamily: T.font, fontSize: "1.0rem", lineHeight: 1.7, color: "rgba(255,255,255,0.75)", margin: "0 0 0.8rem 0" }}>
        {phase.description}
      </p>

      {/* KPIs (live or generated) — max 4 columns with left border accent */}
      {kpis?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, kpis.length)}, 1fr)`, gap: "0.35rem", marginBottom: "0.7rem" }}>
          {kpis.map((k, i) => (
            <div key={i} style={{
              ...S.cardBase, borderLeft: `2px solid ${k.accent ? T.gold : color}70`,
              animation: `fadeSlideIn 0.3s ease ${0.1 + i * 0.05}s both`,
            }}>
              <div style={{ ...S.labelSmall, marginBottom: "0.15rem" }}>{k.label}</div>
              <div style={{ ...S.valueText, color: k.accent ? T.gold : T.goldLight }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Highlights (2-col cards) */}
      {phase.highlights?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem", marginBottom: "0.7rem" }}>
          {phase.highlights.map((h, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.025)", border: `1px solid ${color}30`, borderRadius: 8,
              padding: "0.45rem 0.55rem", animation: `fadeSlideIn 0.4s ease ${0.15 + i * 0.07}s both`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                <Icon name={h.icon} size={14} color={color} />
                <span style={{ fontFamily: T.font, fontSize: "0.8rem", fontWeight: 700, color }}>{h.title}</span>
              </div>
              <p style={{ fontFamily: T.font, fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.45, margin: 0 }}>{h.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Results (Lieferergebnisse) — colored dots instead of bullets */}
      {phase.results?.length > 0 && (
        <>
          <div style={{ ...S.sectionHeading, color: T.softGray, marginBottom: "0.35rem" }}>Ergebnisse</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginBottom: "0.7rem" }}>
            {phase.results.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", animation: `fadeSlideIn 0.3s ease ${0.25 + i * 0.05}s both` }}>
                <span style={{ color, fontSize: "0.7rem", opacity: 0.6, marginTop: "0.15rem" }}>●</span>
                <span style={{ fontFamily: T.font, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{r}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Investment & ROI — side by side (Eckart-Style) */}
      {(phase.investment?.length > 0 || phase.investTotal || phase.roi || phase.roiValue) && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ ...S.sectionHeading, color: T.softGray }}>Investition & Wirtschaftlichkeit</div>
          <div style={{ display: "grid", gridTemplateColumns: (phase.roi || phase.roiValue) ? "1fr 1fr" : "1fr", gap: "0.5rem" }}>
            {/* Investment card */}
            {(phase.investment?.length > 0 || phase.investTotal) && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "0.8rem" }}>
                {phase.investment?.map((inv, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: i < phase.investment.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ fontFamily: T.font, fontSize: "0.95rem", color: "rgba(255,255,255,0.8)" }}>{inv.label}</span>
                    <span style={{ fontFamily: T.font, fontSize: "1.05rem", fontWeight: 700, color: T.goldLight, whiteSpace: "nowrap", marginLeft: "0.5rem" }}>{inv.range}</span>
                  </div>
                ))}
                {phase.investTotal && (
                  <div style={{ borderTop: `1px solid ${T.gold}30`, padding: "0.5rem 0 0.1rem", marginTop: "0.3rem" }}>
                    <div style={{ fontFamily: T.font, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700, color: T.softGray }}>Gesamtinvestition</div>
                    <div style={{ fontFamily: T.font, fontSize: "1.2rem", fontWeight: 700, color: T.gold }}>{phase.investTotal}</div>
                  </div>
                )}
              </div>
            )}

            {/* ROI card */}
            {(phase.roi || phase.roiValue) && (
              <div style={{
                background: `linear-gradient(135deg, ${green}10, ${green}05)`,
                border: `1px solid ${green}30`, borderRadius: 8, padding: "0.8rem",
                display: "flex", flexDirection: "column", justifyContent: "center",
              }}>
                <div style={{ ...S.sectionHeading, color: T.softGray, marginBottom: "0.4rem" }}>Return on Investment</div>
                {phase.roi && <div style={{ fontFamily: T.font, fontSize: "1.0rem", color: T.warmWhite, lineHeight: 1.5, marginBottom: "0.5rem" }}>{phase.roi}</div>}
                {phase.roiValue && (
                  <div style={{
                    display: "inline-flex", alignSelf: "flex-start",
                    background: `linear-gradient(135deg, ${green}30, ${green}15)`,
                    border: `1px solid ${green}50`, borderRadius: 6, padding: "0.35rem 0.7rem",
                  }}>
                    <span style={{ fontFamily: T.font, fontSize: "1.15rem", fontWeight: 700, color: green }}>{phase.roiValue}</span>
                  </div>
                )}
                {/* Independence label in ROI card */}
                {phase.independenceLabel && (
                  <div style={{ marginTop: "0.6rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: `linear-gradient(135deg, ${T.gold}, ${green})` }} />
                    <span style={{ fontFamily: T.font, fontSize: "0.85rem", color: T.softGray }}>
                      Autarkie: <span style={{ color: T.goldLight, fontWeight: 700 }}>{phase.independenceScore || "–"}%</span> — {phase.independenceLabel}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Funding */}
      {phase.funding?.length > 0 && (
        <div style={{ marginTop: "0.75rem" }}>
          <div style={{ ...S.sectionHeading, color: T.softGray }}>Fördermittel</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
            {phase.funding.map((f, i) => (
              <div key={i} style={{ ...S.cardBase, border: `1px solid ${color}15` }}>
                <div style={{ fontFamily: T.font, fontSize: "0.7rem", color: T.softGray }}>{f.label}</div>
                <div style={{ fontFamily: T.font, fontSize: "0.75rem", fontWeight: 600, color }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 20-Year Cashflow SVG Chart ── */
function CashflowChart({ project }) {
  const T = useTheme();
  const data = useMemo(() => project20Years(project), [project]);
  if (!data?.rows?.length) return null;

  const W = 560, H = 200, pad = { t: 20, r: 15, b: 28, l: 55 };
  const gW = W - pad.l - pad.r, gH = H - pad.t - pad.b;
  const rows = data.rows;
  const maxY = Math.max(...rows.map(r => Math.max(Math.abs(r.cum), Math.abs(r.cumFin))));
  const minY = Math.min(...rows.map(r => Math.min(r.cum, r.cumFin)));
  const range = Math.max(maxY, Math.abs(minY)) || 1;
  const yScale = (v) => pad.t + gH / 2 - (v / range) * (gH / 2);
  const xScale = (i) => pad.l + (i / 20) * gW;
  const zeroY = yScale(0);

  const lineCum = rows.map((r, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(r.cum).toFixed(1)}`).join(" ");
  const lineFin = rows.map((r, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(r.cumFin).toFixed(1)}`).join(" ");

  // Find break-even years
  const beAll = rows.findIndex((r, i) => i > 0 && r.cum >= 0);
  const beFin = rows.findIndex((r, i) => i > 0 && r.cumFin >= 0);

  const green = T.greenLight || T.green;
  const fmtAxis = (v) => {
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)} M`;
    if (Math.abs(v) >= 1e3) return `${Math.round(v / 1e3)} T`;
    return `${v}`;
  };

  // Y-axis ticks
  const ticks = [-range, -range / 2, 0, range / 2, range].map(v => Math.round(v));

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ ...S.sectionHeading, color: T.gold }}>20-Jahres Cashflow-Projektion</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {/* Grid */}
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={yScale(v)} y2={yScale(v)}
              stroke="rgba(255,255,255,0.06)" strokeDasharray={v === 0 ? "none" : "3,3"} />
            <text x={pad.l - 5} y={yScale(v) + 3} fill="#777" fontSize="7" textAnchor="end" fontFamily={F}>{fmtAxis(v)} €</text>
          </g>
        ))}
        {/* Zero line */}
        <line x1={pad.l} x2={W - pad.r} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        {/* X-axis labels */}
        {[0, 5, 10, 15, 20].map(y => (
          <text key={y} x={xScale(y)} y={H - 5} fill="#777" fontSize="7" textAnchor="middle" fontFamily={F}>J{y}</text>
        ))}
        {/* Lines */}
        <path d={lineCum} fill="none" stroke={T.gold} strokeWidth="2" strokeLinecap="round" />
        <path d={lineFin} fill="none" stroke={green} strokeWidth="2" strokeLinecap="round" strokeDasharray="5,3" />
        {/* Break-even markers */}
        {beAll > 0 && <circle cx={xScale(beAll)} cy={yScale(rows[beAll].cum)} r="3.5" fill={T.gold} />}
        {beFin > 0 && <circle cx={xScale(beFin)} cy={yScale(rows[beFin].cumFin)} r="3.5" fill={green} />}
        {/* Endpoint markers */}
        <circle cx={xScale(20)} cy={yScale(rows[20].cum)} r="3" fill={T.gold} opacity="0.7" />
        <circle cx={xScale(20)} cy={yScale(rows[20].cumFin)} r="3" fill={green} opacity="0.7" />
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginTop: "0.4rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <div style={{ width: 18, height: 2, background: T.gold, borderRadius: 1 }} />
          <span style={{ fontFamily: F, fontSize: "0.6rem", color: "#999" }}>Ohne Finanzierung</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <div style={{ width: 18, height: 2, background: green, borderRadius: 1, borderTop: "1px dashed " + green }} />
          <span style={{ fontFamily: F, fontSize: "0.6rem", color: "#999" }}>Mit Finanzierung (nach EK)</span>
        </div>
      </div>
      {/* Summary under chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem", marginTop: "0.6rem" }}>
        {[
          { label: "CF Jahr 20", value: fmtEuro(rows[20].cum), c: T.gold },
          { label: "CF n. FK J20", value: fmtEuro(rows[20].cumFin), c: green },
          { label: "Break-even", value: beAll > 0 ? `Jahr ${beAll}` : "—", c: T.gold },
          { label: "BE n. FK", value: beFin > 0 ? `Jahr ${beFin}` : "—", c: green },
        ].map((item, i) => (
          <div key={i} style={{ ...S.cardBase, textAlign: "center", padding: "0.4rem" }}>
            <div style={{ fontFamily: F, fontSize: "0.85rem", fontWeight: 700, color: item.c }}>{item.value}</div>
            <div style={{ ...S.labelSmall, fontSize: "0.55rem" }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Investment Donut Chart ── */
function InvestDonut({ calc, phases }) {
  const T = useTheme();
  if (!calc || !phases?.length) return null;

  const items = phases
    .map(p => ({ key: p.key, label: p.title, value: calc[INVEST_MAP[p.key]] || 0, color: getPhaseColor(p, T) }))
    .filter(i => i.value > 0);
  if (items.length === 0) return null;

  const total = items.reduce((s, i) => s + i.value, 0);
  const R = 50, r = 32, cx = 60, cy = 60;
  let cum = 0;

  const arcs = items.map(item => {
    const pct = item.value / total;
    const start = cum * Math.PI * 2 - Math.PI / 2;
    cum += pct;
    const end = cum * Math.PI * 2 - Math.PI / 2;
    const large = pct > 0.5 ? 1 : 0;
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end);
    const ix1 = cx + r * Math.cos(start), iy1 = cy + r * Math.sin(start);
    const ix2 = cx + r * Math.cos(end), iy2 = cy + r * Math.sin(end);
    return { ...item, pct, d: `M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} L${ix2},${iy2} A${r},${r} 0 ${large} 0 ${ix1},${iy1} Z` };
  });

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ ...S.sectionHeading, color: T.gold }}>Investitions-Verteilung</div>
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <svg viewBox="0 0 120 120" style={{ width: 120, height: 120, flexShrink: 0 }}>
          {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} opacity="0.85" />)}
          <text x={cx} y={cy - 3} fill={T.warmWhite || "#F5F5F0"} fontSize="10" fontWeight="700" textAnchor="middle" fontFamily={F}>{fmtEuro(total)}</text>
          <text x={cx} y={cy + 8} fill="#999" fontSize="5.5" textAnchor="middle" fontFamily={F}>GESAMT</text>
        </svg>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {arcs.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: a.color, flexShrink: 0 }} />
              <span style={{ fontFamily: F, fontSize: "0.7rem", color: "#ccc", flex: 1 }}>{a.label}</span>
              <span style={{ fontFamily: F, fontSize: "0.7rem", fontWeight: 600, color: a.color }}>{fmtEuro(a.value)}</span>
              <span style={{ fontFamily: F, fontSize: "0.6rem", color: "#777", width: 32, textAlign: "right" }}>{Math.round(a.pct * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Final Summary ── */
function FinalSummary({ summary, calc, heroCards, color, project }) {
  const T = useTheme();
  if (!summary && !calc) return null;
  const green = T.greenLight || T.green;

  return (
    <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
      {summary?.headline && (
        <div style={{ borderLeft: `3px solid ${T.gold}`, paddingLeft: "1rem", marginBottom: "1.5rem" }}>
          <p style={{ fontFamily: T.fontSerif, fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)", fontStyle: "italic", color: T.goldLight, margin: 0, lineHeight: 1.5 }}>
            „{summary.headline}"
          </p>
        </div>
      )}

      {/* Hero Cards (live calculated) */}
      {heroCards?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${heroCards.length}, 1fr)`, gap: "1rem", marginBottom: "1.5rem" }}>
          {heroCards.map((card, i) => {
            const cardColor = card.accent === "green" ? green : T.gold;
            return (
              <div key={i} style={{
                background: `linear-gradient(135deg, ${cardColor}15, ${cardColor}08)`,
                border: `2px solid ${cardColor}40`, borderRadius: "12px", padding: "1.25rem", textAlign: "center",
              }}>
                <Icon name={card.icon} size={28} color={cardColor} />
                <div style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: T.font, color: cardColor, marginTop: "0.5rem" }}>{card.value}</div>
                <div style={{ ...S.labelSmall, marginTop: "0.25rem" }}>{card.label}</div>
                {card.details?.map((d, j) => (
                  <div key={j} style={{ fontFamily: T.font, fontSize: "0.7rem", color: "#999", marginTop: j === 0 ? "0.5rem" : "0.1rem" }}>
                    {d.label}: <span style={{ color: cardColor, fontWeight: 600 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Ihre Gesamtberechnung (live calc) */}
      {calc && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ ...S.sectionHeading, color }}>Ihre Gesamtberechnung</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
            {[
              { label: "Invest Standort", value: fmtEuro(calc.investStandort), c: T.gold },
              { label: "Invest BESS", value: fmtEuro(calc.investPhase6 || 0), c: T.gold },
              { label: "Gesamtinvest", value: fmtEuro(calc.investGesamt), c: T.gold },
              { label: "Autarkie", value: `${fmtNum(calc.autarkie)}%`, c: green },
              { label: "Einsparung/a", value: `${fmtEuro(calc.einsparungStandort)}/a`, c: green },
              { label: "BESS-Erlöse/a", value: `${fmtEuro(calc.bessErloes)}/a`, c: green },
              { label: "Amortisation", value: `${fmtNum(calc.amortisationGesamt, 1)} J.`, c: T.gold },
              { label: "BESS-Rendite", value: `${fmtNum(calc.bessRendite, 1)}% p.a.`, c: green },
            ].map((item, i) => (
              <div key={i} style={{ ...S.cardBase, textAlign: "center", padding: "0.6rem 0.4rem" }}>
                <div style={{ ...S.labelSmall, fontSize: "0.55rem" }}>{item.label}</div>
                <div style={{ fontFamily: T.font, fontSize: "0.95rem", fontWeight: 700, color: item.c, marginTop: "0.15rem" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System KPIs */}
      {summary?.systemKpis?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ ...S.sectionHeading, color }}>Systemübersicht</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
            {summary.systemKpis.map((kpi, i) => (
              <div key={i} style={{ ...S.cardBase, padding: "0.75rem", textAlign: "center", border: `1px solid ${color}15` }}>
                <div style={{ fontFamily: T.font, fontSize: "1.1rem", fontWeight: 700, color }}>{kpi.value}</div>
                <div style={{ ...S.labelSmall, fontSize: "0.6rem", marginTop: "0.2rem" }}>{kpi.label}</div>
                {kpi.sub && <div style={{ fontFamily: T.font, fontSize: "0.65rem", color: "#777", marginTop: "0.15rem" }}>{kpi.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Investment Roadmap */}
      {summary?.investmentSummary?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ ...S.sectionHeading, color }}>Investitions-Roadmap · Rendite pro Baustein</div>
          {summary.investmentSummary.map((item, i) => {
            const maxVal = Math.max(...summary.investmentSummary.map(s => s.maxMio || 1));
            const barPct = ((item.maxMio || 0) / maxVal) * 100;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr 110px 55px 85px", gap: "0.5rem", alignItems: "center", padding: "0.35rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontFamily: T.font, fontSize: "0.7rem", fontWeight: 700, color }}>{item.phase}</span>
                <span style={{ fontFamily: T.font, fontSize: "0.75rem", color: T.midGray }}>{item.label}</span>
                <div style={{ position: "relative", height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${barPct}%`, background: `${color}40`, borderRadius: 3, transition: "width 0.5s" }} />
                  <span style={{ position: "relative", fontFamily: T.font, fontSize: "0.6rem", color: "#ccc", padding: "0 4px", lineHeight: "14px" }}>{item.range}</span>
                </div>
                <span style={{ fontFamily: T.font, fontSize: "0.6rem", color: green, textAlign: "right" }}>{item.score}%</span>
                <span style={{ fontFamily: T.font, fontSize: "0.6rem", color: T.gold, textAlign: "right", fontWeight: 600 }}>{item.roi}</span>
              </div>
            );
          })}
          {/* Total row */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0 0", borderTop: `1px solid ${color}30`, marginTop: "0.25rem" }}>
            <span style={{ fontFamily: T.font, fontSize: "0.85rem", fontWeight: 700, color }}>Gesamtinvestition</span>
            <span style={{ fontFamily: T.font, fontSize: "0.85rem", fontWeight: 700, color }}>{summary.investTotal || (calc ? fmtEuro(calc.investGesamt) : "")}</span>
          </div>
        </div>
      )}

      {/* Economic Summary */}
      {summary?.economicSummary && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ ...S.sectionHeading, color }}>Gesamtwirtschaftliche Betrachtung</div>
          {summary.economicSummary.savings?.length > 0 && (
            <div style={{ marginBottom: "0.75rem" }}>
              {summary.economicSummary.savings.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontFamily: T.font, fontSize: "0.78rem", color: T.midGray }}>{s.label}</span>
                  <span style={{ fontFamily: T.font, fontSize: "0.78rem", fontWeight: 600, color: green }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
          {summary.economicSummary.totals && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {[
                { label: "Jährl. Einsparungen", value: summary.economicSummary.totals.annualSavings, c: green },
                { label: "Invest Standort", value: summary.economicSummary.totals.investStandort, c: T.gold },
                { label: "Amortisation", value: summary.economicSummary.totals.paybackStandort, c: T.gold },
                { label: "BESS-Erlöse", value: summary.economicSummary.totals.bessRevenue, c: green },
              ].filter(t => t.value).map((t, i) => (
                <div key={i} style={{ ...S.cardBase, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={S.labelSmall}>{t.label}</span>
                  <span style={{ fontFamily: T.font, fontSize: "0.85rem", fontWeight: 700, color: t.c }}>{t.value}</span>
                </div>
              ))}
            </div>
          )}
          {summary.economicSummary.conclusion && (
            <div style={{ fontFamily: T.font, fontSize: "0.8rem", fontStyle: "italic", color: "#999", lineHeight: 1.6, padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: 6, borderLeft: `3px solid ${color}40` }}>
              {summary.economicSummary.conclusion}
            </div>
          )}
        </div>
      )}

      {/* Financial Detail (live) */}
      {calc && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ ...S.sectionHeading, color }}>Finanzierungs-Detail</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
            {[
              { label: "EK-Rendite", value: `${fmtNum(calc.ekRendite, 1)}% p.a.`, c: T.gold },
              { label: "DSCR", value: fmtNum(calc.dscr, 2), c: calc.dscr >= 1.2 ? green : "#E74C3C" },
              { label: "Annuität", value: `${fmtEuro(calc.annuitaet)}/a`, c: T.softGray },
              { label: "CF nach FK", value: `${fmtEuro(calc.cfNachSchuldendienst)}/a`, c: calc.cfNachSchuldendienst > 0 ? green : "#E74C3C" },
              { label: "Eigenkapital", value: fmtEuro(calc.ekBetrag), c: T.midGray },
              { label: "Kreditbetrag", value: fmtEuro(calc.kreditBetrag), c: T.midGray },
            ].map((item, i) => (
              <div key={i} style={{ ...S.cardBase, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={S.labelSmall}>{item.label}</span>
                <span style={{ ...S.valueText, color: item.c, fontSize: "0.85rem" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cashflow Chart */}
      {project && <CashflowChart project={project} />}

      {/* Investment Donut */}
      {calc && project?.phases && <InvestDonut calc={calc} phases={project.phases.filter(p => p.enabled)} />}

      {/* Levers */}
      {summary?.levers?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ ...S.sectionHeading, color }}>Strategische Hebel</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {summary.levers.map((l, i) => (
              <div key={i} style={{ ...S.cardBase, padding: "0.6rem", border: `1px solid ${color}12` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                  <Icon name={l.icon} size={14} color={color} />
                  <span style={{ fontFamily: T.font, fontSize: "0.78rem", fontWeight: 700, color }}>{l.title}</span>
                </div>
                <div style={{ fontFamily: T.font, fontSize: "0.72rem", color: "#999", lineHeight: 1.4 }}>{l.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regulatorik */}
      {summary?.regulatorik?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ ...S.sectionHeading, color }}>Regulatorik & Compliance</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {summary.regulatorik.map((r, i) => (
              <div key={i} style={{ ...S.cardBase, padding: "0.6rem", border: `1px solid ${color}12` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Icon name={r.icon} size={13} color={color} />
                    <span style={{ fontFamily: T.font, fontSize: "0.75rem", fontWeight: 700, color }}>{r.title}</span>
                  </div>
                  <span style={{ fontFamily: T.font, fontSize: "0.55rem", fontWeight: 700, color: green, background: `${green}15`, padding: "0.1rem 0.4rem", borderRadius: "1rem", letterSpacing: "0.5px", textTransform: "uppercase" }}>{r.status}</span>
                </div>
                <div style={{ fontFamily: T.font, fontSize: "0.68rem", color: "#888", lineHeight: 1.35 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Management */}
      {summary?.riskManagement?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ ...S.sectionHeading, color }}>Risikomanagement</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {summary.riskManagement.map((r, i) => {
              const impactColor = r.impact === "Niedrig" ? green : r.impact === "Mittel" ? T.gold : "#E74C3C";
              return (
                <div key={i} style={{ ...S.cardBase, padding: "0.6rem", border: `1px solid ${color}12` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <Icon name={r.icon} size={13} color={color} />
                      <span style={{ fontFamily: T.font, fontSize: "0.75rem", fontWeight: 700, color }}>{r.title}</span>
                    </div>
                    <span style={{ fontFamily: T.font, fontSize: "0.55rem", fontWeight: 700, color: impactColor, background: `${impactColor}15`, padding: "0.1rem 0.4rem", borderRadius: "1rem", letterSpacing: "0.5px", textTransform: "uppercase" }}>{r.impact}</span>
                  </div>
                  <div style={{ fontFamily: T.font, fontSize: "0.68rem", color: "#888", lineHeight: 1.35 }}>{r.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pillars */}
      {summary?.pillars?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ ...S.sectionHeading, color }}>Transformations-Säulen</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
            {summary.pillars.map((p, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "0.35rem",
                padding: "0.4rem 0.8rem", borderRadius: "2rem",
                border: `1px solid ${color}30`, background: `${color}08`,
              }}>
                <Icon name={p.icon} size={14} color={color} />
                <span style={{ fontFamily: T.font, fontSize: "0.7rem", fontWeight: 700, color }}>{p.label}</span>
                <span style={{ fontFamily: T.font, fontSize: "0.55rem", color: "#777" }}>Phase {p.phase}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA / Consultant */}
      {project?.consultant && (
        <div style={{ marginTop: "2rem", textAlign: "center", padding: "1.5rem", background: `${color}08`, borderRadius: 12, border: `1px solid ${color}20` }}>
          <div style={{ ...S.labelTiny, color, marginBottom: "0.75rem", letterSpacing: "2px" }}>Nächster Schritt</div>
          <div style={{ fontFamily: T.font, fontSize: "1rem", color: T.warmWhite, marginBottom: "0.5rem" }}>
            {project.consultant.name} · {project.consultant.company}
          </div>
          <div style={{ fontFamily: T.font, fontSize: "0.8rem", color: "#999" }}>{project.consultant.label}</div>
          {project.consultant.email && (
            <a href={`mailto:${project.consultant.email}`} style={{
              display: "inline-block", marginTop: "0.75rem", padding: "0.5rem 1.5rem",
              borderRadius: "2rem", background: `${color}20`, border: `1px solid ${color}40`,
              color, fontFamily: T.font, fontSize: "0.75rem", fontWeight: 700, textDecoration: "none",
              letterSpacing: "1px", textTransform: "uppercase",
            }}>
              Kontakt aufnehmen
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Intro Screen with Cascading Entrance (Eckart-Style) ── */
function IntroScreen({ gen, company, phases, calc, onStart }) {
  const T = useTheme();
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setVis(true), reduced ? 0 : 100);
    return () => clearTimeout(t);
  }, []);

  const cascade = (delay) => ({
    opacity: vis ? 1 : 0,
    transform: vis ? "translateY(0)" : "translateY(15px)",
    transition: `all 0.8s ease ${delay}s`,
  });

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(ellipse at center, ${T.navy} 0%, ${T.navyDeep} 100%)`,
      textAlign: "center", padding: "2rem",
    }}>
      <div style={{ ...S.labelTiny, color: T.gold, marginBottom: "1.5rem", letterSpacing: "5px", ...cascade(0.2) }}>PITCHPILOT</div>
      <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)", fontWeight: 400, color: T.warmWhite, marginBottom: "0.5rem", maxWidth: 700, ...cascade(0.5) }}>
        {gen.intro?.headline || `Erstellt für ${company.name}`}
      </h1>
      <div style={{ fontSize: "1.1rem", color: T.softGray, marginBottom: "0.5rem", ...cascade(0.8) }}>
        {gen.intro?.subtitle || "Phasenkonzept zur Energietransformation"}
      </div>
      <div style={{ fontStyle: "italic", color: T.gold, fontSize: "0.9rem", marginBottom: "2.5rem", ...cascade(1.0) }}>
        {gen.intro?.tagline || ""}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "2.5rem", ...cascade(1.3) }}>
        {phases.map((p, i) => (
          <span key={i} style={{
            padding: "0.3rem 0.75rem", borderRadius: "2rem",
            border: `1px solid ${getPhaseColor(p, T)}50`, background: `${getPhaseColor(p, T)}10`,
            color: getPhaseColor(p, T), fontFamily: T.font, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "1px",
          }}>
            {p.num} — {p.title}
          </span>
        ))}
      </div>

      <button
        onClick={onStart}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 6px 32px ${T.gold}60`; e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 4px 25px ${T.gold}40`; e.currentTarget.style.transform = "translateY(0)"; }}
        style={{
          ...S.pillBtn, background: `linear-gradient(135deg, ${T.gold}, ${T.goldLight || T.gold})`,
          color: T.navyDeep, padding: "0.75rem 2.5rem", fontSize: "0.8rem", border: "none",
          boxShadow: `0 4px 25px ${T.gold}40`, ...cascade(1.5),
        }}
      >
        Konzept entdecken <Icon name="arrowRight" size={16} />
      </button>

      {calc && (
        <div style={{ marginTop: "3rem", display: "flex", gap: "2rem", flexWrap: "wrap", justifyContent: "center", ...cascade(1.8) }}>
          {[
            { label: "Investition", value: fmtEuro(calc.investGesamt), color: T.gold },
            { label: "Autarkie", value: `${fmtNum(calc.autarkie)}%`, color: T.greenLight },
            { label: "CO₂", value: `${fmtNum(calc.co2Gesamt)} t/a`, color: T.greenLight },
            { label: "Ertrag", value: `${fmtEuro(calc.gesamtertrag)}/a`, color: T.gold },
          ].map(item => (
            <div key={item.label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: T.font, fontSize: "1.4rem", fontWeight: 700, color: item.color }}>{item.value}</div>
              <div style={{ fontFamily: T.font, fontSize: "0.65rem", letterSpacing: "1px", textTransform: "uppercase", color: "#999" }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Version Manager Overlay ── */
function VersionManager({ project, onClose, onRestore }) {
  const T = useTheme();
  const trapRef = useRef(null);
  const [versions, setVersions] = useState(project.versions || []);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [shareUrl, setShareUrl] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const refresh = () => {
    const fresh = getProject(project.id);
    setVersions(fresh?.versions || []);
  };

  const handleRename = (vid) => {
    if (editName.trim()) {
      renameVersion(project.id, vid, editName.trim());
      refresh();
    }
    setEditingId(null);
  };

  const handleDelete = (vid) => {
    if (confirm("Version wirklich löschen?")) {
      deleteVersion(project.id, vid);
      refresh();
    }
  };

  const handleRestore = (vid) => {
    const restored = restoreVersion(project.id, vid);
    if (restored && onRestore) onRestore(restored);
  };

  const handleShare = async (vid) => {
    const result = await createNamedShareLink(project, vid);
    if (result) {
      setShareUrl(result.url);
      navigator.clipboard.writeText(result.url).then(() => {
        setCopiedId(vid);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  const handleShareCurrent = async () => {
    const result = await createNamedShareLink(project);
    if (result) {
      setShareUrl(result.url);
      navigator.clipboard.writeText(result.url).then(() => {
        setCopiedId("current");
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  useFocusTrap(trapRef);

  const handleNewVersion = () => {
    const name = prompt("Versionsname:", `Version ${versions.length + 1}`);
    if (name) {
      createVersion(project.id, name, "owner");
      refresh();
    }
  };

  return (
    <div ref={trapRef} role="dialog" aria-modal="true" aria-label="Versionsverwaltung" style={{
      position: "fixed", inset: 0, zIndex: 9500, background: "rgba(10,18,32,0.95)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: T.navy, borderRadius: 16, border: `1px solid ${T.gold}30`,
        width: "min(600px, 90vw)", maxHeight: "80vh", overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "1rem 1.5rem", borderBottom: `1px solid ${T.gold}20`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontFamily: T.font, fontSize: "1.1rem", fontWeight: 700, color: T.gold }}>Versionen & Teilen</div>
            <div style={{ fontFamily: T.font, fontSize: "0.7rem", color: T.softGray, marginTop: "0.15rem" }}>
              {versions.length} Version{versions.length !== 1 ? "en" : ""} gespeichert
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <Icon name="close" size={16} color="#888" />
          </button>
        </div>

        {/* Actions */}
        <div style={{ padding: "0.75rem 1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={handleNewVersion} style={{
            ...S.pillBtn, padding: "0.35rem 0.8rem",
            background: `${T.gold}15`, border: `1px solid ${T.gold}40`, color: T.gold,
          }}>
            <Icon name="plus" size={12} /> Neue Version
          </button>
          <button onClick={handleShareCurrent} style={{
            ...S.pillBtn, padding: "0.35rem 0.8rem",
            background: copiedId === "current" ? `${T.greenLight}15` : "rgba(255,255,255,0.06)",
            border: `1px solid ${copiedId === "current" ? `${T.greenLight}40` : "rgba(255,255,255,0.12)"}`,
            color: copiedId === "current" ? T.greenLight : T.softGray,
          }}>
            <Icon name={copiedId === "current" ? "check" : "copy"} size={12} />
            {copiedId === "current" ? "Link kopiert!" : "Aktuellen Stand teilen"}
          </button>
        </div>

        {/* Version List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1.5rem" }}>
          {versions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: T.softGray, fontFamily: T.font, fontSize: "0.85rem" }}>
              Noch keine Versionen erstellt.<br />
              <span style={{ fontSize: "0.75rem", color: "#666" }}>Erstelle eine Version, um den aktuellen Stand zu sichern.</span>
            </div>
          ) : (
            versions.map(v => (
              <div key={v.id} style={{
                padding: "0.75rem", marginBottom: "0.5rem", borderRadius: 10,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                  {editingId === v.id ? (
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      onBlur={() => handleRename(v.id)}
                      onKeyDown={e => { if (e.key === "Enter") handleRename(v.id); if (e.key === "Escape") setEditingId(null); }}
                      autoFocus
                      style={{
                        flex: 1, background: "rgba(255,255,255,0.08)", border: `1px solid ${T.gold}40`,
                        borderRadius: 4, padding: "0.3rem 0.5rem", color: T.warmWhite,
                        fontFamily: T.font, fontSize: "0.85rem", outline: "none",
                      }}
                    />
                  ) : (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: T.font, fontSize: "0.85rem", fontWeight: 600, color: T.warmWhite }}>{v.name}</div>
                      <div style={{ fontFamily: T.font, fontSize: "0.65rem", color: "#777", marginTop: "0.15rem" }}>
                        {new Date(v.createdAt).toLocaleString("de-DE")} · {v.createdBy === "customer" ? "Kunde" : "Ersteller"}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                    <button onClick={() => handleShare(v.id)} title="Link kopieren" aria-label="Link kopieren" style={{
                      background: copiedId === v.id ? `${T.greenLight}20` : "rgba(255,255,255,0.06)",
                      border: `1px solid ${copiedId === v.id ? `${T.greenLight}30` : "rgba(255,255,255,0.1)"}`,
                      borderRadius: 6, padding: "0.3rem", cursor: "pointer",
                    }}>
                      <Icon name={copiedId === v.id ? "check" : "copy"} size={12} color={copiedId === v.id ? T.greenLight : "#888"} />
                    </button>
                    <button onClick={() => { setEditingId(v.id); setEditName(v.name); }} title="Umbenennen" aria-label="Umbenennen" style={{
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6, padding: "0.3rem", cursor: "pointer",
                    }}>
                      <Icon name="settings" size={12} color="#888" />
                    </button>
                    <button onClick={() => handleRestore(v.id)} title="Wiederherstellen" aria-label="Wiederherstellen" style={{
                      background: `${T.gold}10`, border: `1px solid ${T.gold}20`,
                      borderRadius: 6, padding: "0.3rem", cursor: "pointer",
                    }}>
                      <Icon name="arrowLeft" size={12} color={T.gold} />
                    </button>
                    <button onClick={() => handleDelete(v.id)} title="Löschen" aria-label="Löschen" style={{
                      background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.2)",
                      borderRadius: 6, padding: "0.3rem", cursor: "pointer",
                    }}>
                      <Icon name="trash" size={12} color="#E74C3C" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Share URL display */}
        {shareUrl && (
          <div style={{
            padding: "0.75rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(255,255,255,0.02)",
          }}>
            <div style={{ fontFamily: T.font, fontSize: "0.6rem", letterSpacing: "1px", textTransform: "uppercase", color: T.softGray, marginBottom: "0.3rem" }}>
              Share-Link (in Zwischenablage kopiert)
            </div>
            <div style={{
              fontFamily: "monospace", fontSize: "0.65rem", color: "#888",
              background: "rgba(0,0,0,0.2)", borderRadius: 4, padding: "0.4rem 0.5rem",
              wordBreak: "break-all", maxHeight: 60, overflowY: "auto",
            }}>
              {shareUrl}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Presentation Renderer ── */
export default function PresentationRenderer() {
  const T = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();

  // Mutable project state — bidirectional: changes here save to localStorage
  const [project, setProject] = useState(() => getProject(id));
  const [active, setActive] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [toast, setToast] = useState(null);
  const contentRef = useRef(null);
  const originalConfigRef = useRef(null);

  // Live calculation — recalculates on every config change
  const calc = useMemo(() => project ? calculateAll(project) : null, [project]);

  // Live hero cards for final summary
  const heroCards = useMemo(() => calc ? getDynamicHeroCards(calc) : [], [calc]);

  // Map enabled phases to their keys for live KPI lookup
  const enabledPhases = useMemo(
    () => (project?.phases || []).filter(p => p.enabled),
    [project?.phases]
  );

  // Toast helper
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Store original config when analysis opens (for reset)
  const openAnalysis = useCallback(() => {
    setAnalysisOpen(o => {
      if (!o && !originalConfigRef.current) {
        originalConfigRef.current = JSON.parse(JSON.stringify({
          energy: project.energy, phaseConfig: project.phaseConfig, finance: project.finance,
        }));
      }
      return !o;
    });
  }, [project]);

  // Save config (visual feedback)
  const handleConfigSave = useCallback(() => {
    setConfigSaved(true);
    setAnalysisOpen(false);
    originalConfigRef.current = null;
    showToast("Kalkulation gespeichert");
  }, [showToast]);

  // Reset config to original
  const handleConfigReset = useCallback(() => {
    if (!originalConfigRef.current) return;
    setProject(prev => {
      const next = { ...prev, ...originalConfigRef.current };
      saveProject(next);
      return next;
    });
    setConfigSaved(false);
    originalConfigRef.current = null;
    setAnalysisOpen(false);
    showToast("Kalkulation zurückgesetzt");
  }, [showToast]);

  // Update a nested config value and save to localStorage
  const updateConfig = useCallback((path, value) => {
    setProject(prev => {
      const next = setVal(prev, path, value);
      saveProject(next);
      return next;
    });
    setConfigSaved(false);
  }, []);

  // Update market results from MarketAnalysis
  const updateMarket = useCallback((results) => {
    setProject(prev => {
      const next = { ...prev, market: results };
      saveProject(next);
      return next;
    });
  }, []);

  // Restart content animation on phase change
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.animation = "none";
    void el.offsetHeight; // force reflow
    el.style.animation = "";
  }, [active]);

  const handleSetActive = useCallback((idx) => {
    startTransition(() => setActive(idx));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handle = (e) => {
      // Escape closes overlays
      if (e.key === "Escape") {
        if (versionsOpen) { setVersionsOpen(false); return; }
        if (analysisOpen) { setAnalysisOpen(false); return; }
        if (pdfOpen) { setPdfOpen(false); return; }
      }
      if (showIntro || analysisOpen || versionsOpen) return;
      // Don't intercept arrows when user is in a form field
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setActive(prev => Math.min(prev + 1, (project?.generated?.phases?.length || 0)));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setActive(prev => Math.max(prev - 1, 0));
      } else if (e.key === "Home") {
        setActive(0);
      } else if (e.key === "End") {
        setActive(project?.generated?.phases?.length || 0);
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [showIntro, analysisOpen, versionsOpen, pdfOpen, project?.generated?.phases?.length]);

  if (!project?.generated) {
    return (
      <div style={{ ...S.flexCenter, height: "100vh", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "1.2rem", color: T.softGray }}>Projekt nicht gefunden oder noch nicht generiert.</div>
        <button className="btn btn-primary" onClick={() => navigate("/")}>Zurück</button>
      </div>
    );
  }

  const gen = project.generated;
  const phases = gen.phases || [];
  const totalSlides = phases.length + 1;
  const isFinal = active === phases.length;
  const currentPhase = isFinal ? null : phases[active];
  const currentColor = isFinal ? T.gold : getPhaseColor(currentPhase, T);
  const company = project.company || {};

  // Live KPIs for current phase
  const currentPhaseKey = !isFinal && enabledPhases[active] ? enabledPhases[active].key : null;
  const liveKpis = currentPhaseKey && calc ? getPhaseCalcItems(currentPhaseKey, calc) : null;

  // Slider position percentage for timeline
  const sliderPct = totalSlides > 1 ? (active / (totalSlides - 1)) * 100 : 0;

  /* ── Intro Screen (Eckart-Style cascading entrance) ── */
  if (showIntro) {
    return (
      <ThemeProvider themeConfig={project?.theme}>
        <IntroScreen gen={gen} company={company} phases={phases} calc={calc} onStart={() => setShowIntro(false)} />
      </ThemeProvider>
    );
  }

  /* ── Main Presentation ── */
  return (
    <ThemeProvider themeConfig={project?.theme}>
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(180deg, ${T.navyDeep} 0%, ${T.navy} 50%, ${T.navyDeep} 100%)`,
      color: T.warmWhite,
      '--t-gold': T.gold, '--t-goldLight': T.goldLight, '--t-navy': T.navy, '--t-navyDeep': T.navyDeep,
    }}>
      {/* ── Company Header (Eckart-Style) ── */}
      <div style={{ padding: "2rem 2rem 1rem", position: "relative", zIndex: 2 }}>
        {/* Company name line */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontFamily: T.font, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "4px", fontWeight: 700, color: T.gold }}>
            {(company.name || "").toUpperCase()}
          </span>
          <span style={{ width: 40, height: 1, background: T.gold, display: "inline-block" }} />
          <span style={{ fontFamily: T.font, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "2px", color: T.softGray }}>
            Energietransformation
          </span>
        </div>

        {/* Main heading + action buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
          <h1 style={{
            fontSize: "clamp(1.5rem, 4vw, 2.4rem)", fontWeight: 700, margin: "0.6rem 0 0", lineHeight: 1.2,
            background: `linear-gradient(135deg, ${T.warmWhite} 0%, ${T.goldLight} 100%)`,
            backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Phasenkonzept zur Energietransformation
          </h1>
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
            <button onClick={openAnalysis} style={{
              ...S.pillBtn, padding: "0.3rem 0.7rem", fontSize: "0.7rem",
              background: configSaved ? `${T.greenLight}25` : analysisOpen ? `${T.gold}20` : "rgba(255,255,255,0.06)",
              border: `1px solid ${configSaved ? `${T.greenLight}60` : analysisOpen ? `${T.gold}40` : "rgba(255,255,255,0.12)"}`,
              color: configSaved ? T.greenLight : analysisOpen ? T.gold : T.softGray,
            }}>
              <Icon name={configSaved ? "check" : "chart"} size={12} color={configSaved ? T.greenLight : analysisOpen ? T.gold : T.softGray} /> Analyse & Kalkulation
            </button>
            {configSaved && (
              <button onClick={handleConfigReset} style={{
                ...S.pillBtn, padding: "0.3rem 0.7rem", fontSize: "0.7rem",
                background: "rgba(255,100,100,0.1)", border: "1px solid rgba(255,100,100,0.3)", color: "#ff8888",
              }}>
                <Icon name="reset" size={12} color="#ff8888" /> Zurücksetzen
              </button>
            )}
            <button onClick={() => setVersionsOpen(true)} style={{
              ...S.pillBtn, padding: "0.3rem 0.7rem", fontSize: "0.7rem",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: T.softGray,
            }}>
              <Icon name="copy" size={12} color={T.softGray} /> Versionen{project.versions?.length ? ` (${project.versions.length})` : ""}
            </button>
            <button onClick={() => setPdfOpen(true)} style={{
              ...S.pillBtn, padding: "0.35rem 1rem", fontSize: "0.82rem", fontWeight: 600,
              background: `${T.gold}15`, border: `1px solid ${T.gold}40`, color: T.goldLight,
            }}>
              <Icon name="download" size={13} color={T.goldLight} /> PDF Export
            </button>
            <button onClick={() => navigate(`/edit/${id}`)} style={{
              ...S.pillBtn, padding: "0.3rem 0.7rem", fontSize: "0.7rem",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: T.softGray,
            }}>
              <Icon name="arrowLeft" size={12} color={T.softGray} /> Wizard
            </button>
          </div>
        </div>
      </div>

      {/* ── Timeline Slider (Eckart-Style, top position) ── */}
      <div style={{ padding: "1rem 2rem 0.5rem", position: "relative", zIndex: 2 }}>
        {/* Phase dot buttons */}
        <div role="tablist" aria-label="Phasen-Navigation" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.5rem", padding: "0 0.5rem" }}>
          {[...phases, { num: "★", title: "Ergebnis", icon: "sparkle", color: "gold" }].map((p, i) => {
            const isActive = i === active;
            const dotColor = i === phases.length ? T.gold : getPhaseColor(p, T);
            return (
              <button key={i} role="tab" aria-selected={isActive} onClick={() => handleSetActive(i)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                  padding: "0.25rem 0.5rem", opacity: isActive ? 1 : 0.4, transition: "all 0.3s ease",
                }}>
                <Icon name={i === phases.length ? "sparkle" : (p.icon || "target")} size={isActive ? 24 : 16} color={isActive ? T.gold : T.softGray} />
                <span style={{ fontFamily: T.font, fontSize: "0.75rem", letterSpacing: "1.5px", textTransform: "uppercase", color: isActive ? T.gold : T.softGray }}>
                  {p.num}
                </span>
              </button>
            );
          })}
        </div>

        {/* Slider track */}
        <div style={{ position: "relative", margin: "0 0.5rem", cursor: "pointer" }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            handleSetActive(Math.round(pct * (totalSlides - 1)));
          }}>
          {/* Track background */}
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)" }}>
            {/* Filled track */}
            <div style={{
              position: "absolute", left: 0, top: 0, height: 6, borderRadius: 3,
              width: `${sliderPct}%`, background: `linear-gradient(90deg, ${T.gold}, ${T.greenLight})`,
              transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            }} />
          </div>

          {/* Phase markers on track */}
          {[...Array(totalSlides)].map((_, i) => {
            const pct = totalSlides > 1 ? (i / (totalSlides - 1)) * 100 : 0;
            const isAct = i === active;
            return (
              <div key={i} style={{
                position: "absolute", left: `${pct}%`, top: 3,
                transform: "translate(-50%, -50%)",
                width: isAct ? 16 : 8, height: isAct ? 16 : 8, borderRadius: "50%",
                background: isAct ? T.gold : "rgba(255,255,255,0.2)",
                border: isAct ? `2px solid ${T.warmWhite}` : "none",
                boxShadow: isAct ? `0 0 12px ${T.gold}80` : "none",
                transition: "all 0.3s ease", zIndex: 1,
              }} />
            );
          })}

          {/* Slider thumb */}
          <div style={{
            position: "absolute", left: `${sliderPct}%`, top: 3,
            transform: "translate(-50%, -50%)",
            width: 28, height: 28, borderRadius: "50%",
            background: T.navy, border: `3px solid ${T.gold}`,
            boxShadow: `0 0 20px ${T.gold}40, 0 2px 8px rgba(0,0,0,0.3)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)", zIndex: 2,
          }}>
            <span style={{ fontFamily: T.fontSerif, fontSize: "0.7rem", fontWeight: 700, color: T.gold }}>
              {isFinal ? "★" : currentPhase?.num}
            </span>
          </div>
        </div>

        {/* Month labels */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0.5rem 0" }}>
          {[...phases, { months: "Gesamt" }].map((p, i) => (
            <span key={i} style={{
              fontFamily: T.font, fontSize: "0.7rem", textAlign: "center", minWidth: 60,
              color: i === active ? T.goldLight : T.softGray,
              fontWeight: i === active ? 700 : 400,
              transition: "all 0.3s ease",
            }}>
              {p.months || ""}
            </span>
          ))}
        </div>
      </div>

      {/* ── Content area ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 2rem 3rem" }}>
        {/* Phase title (Eckart-Style) */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
            background: isFinal
              ? `linear-gradient(135deg, ${T.gold}40, ${T.greenLight}30)`
              : `linear-gradient(135deg, ${currentColor}30, ${currentColor}10)`,
            border: `2px solid ${isFinal ? T.gold : `${currentColor}60`}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isFinal ? `0 0 24px ${T.gold}30` : "none",
          }}>
            <Icon name={isFinal ? "sparkle" : (currentPhase?.icon || "target")} size={24} color={isFinal ? T.gold : currentColor} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.font, fontSize: "0.75rem", letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700, color: T.gold, marginBottom: "0.2rem" }}>
              {isFinal ? `Gesamtergebnis · ${gen.finalSummary?.subtitle || "Wirtschaftlichkeit"}` : `Phase ${currentPhase?.num} · ${currentPhase?.subtitle || currentPhase?.title}`}
            </div>
            <h2 style={{
              fontFamily: T.fontSerif, fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)", fontWeight: 700, margin: 0, lineHeight: 1.15,
              ...(isFinal ? {
                background: `linear-gradient(135deg, ${T.warmWhite}, ${T.goldLight})`,
                backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              } : { color: T.warmWhite }),
            }}>
              {isFinal ? "Ergebnis & Wirtschaftlichkeit" : currentPhase?.title}
            </h2>
          </div>
        </div>

        {/* Headline quote (Eckart-Style „...") */}
        {!isFinal && currentPhase?.headline && (
          <div style={{ borderLeft: `3px solid ${T.gold}`, paddingLeft: "1rem", marginBottom: "1rem" }}>
            <p style={{ fontFamily: T.fontSerif, fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)", fontStyle: "italic", color: T.goldLight, margin: 0, lineHeight: 1.5 }}>
              „{currentPhase.headline}"
            </p>
          </div>
        )}

        {/* Grid: Content (5fr) + ScoreRing (4fr) */}
        <div className="pitch-grid" style={{ display: "grid", gridTemplateColumns: "5fr 4fr", gap: "1.25rem", alignItems: "start", minWidth: 0 }}>
          <div ref={contentRef} style={{ minWidth: 0, animation: "fadeSlideIn 0.5s ease forwards" }}>
            {isFinal ? (
              <FinalSummary summary={gen.finalSummary} calc={calc} heroCards={heroCards} color={currentColor} project={project} />
            ) : (
              <PhaseContent phase={currentPhase} color={currentColor} liveKpis={liveKpis} />
            )}
          </div>
          <div style={{ position: "sticky", top: 80 }}>
            {/* Phase Illustration (Eckart-Style SVG) */}
            <Suspense fallback={
              <div style={{ width: "100%", aspectRatio: "400/320", borderRadius: 14, background: "linear-gradient(150deg, rgba(27,42,74,0.75), rgba(30,48,80,0.45))" }} />
            }>
              <PhaseVisual
                phaseNum={isFinal ? "∑" : (currentPhase?.num || "I")}
                score={isFinal ? (calc?.autarkie || 0) : (currentPhase?.independenceScore ?? calc?.autarkie ?? 0)}
              />
            </Suspense>

            {/* Live invest for current phase */}
            {!isFinal && calc && currentPhaseKey && (
              <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
                <div style={{ fontFamily: T.font, fontSize: "0.6rem", letterSpacing: "1px", textTransform: "uppercase", color: T.softGray }}>Invest</div>
                <div style={{ fontFamily: T.font, fontSize: "0.95rem", fontWeight: 700, color: currentColor }}>
                  {fmtEuro(calc[INVEST_MAP[currentPhaseKey]] || 0)}
                </div>
              </div>
            )}
            {/* Cumulative progress pills */}
            {!isFinal && active > 0 && (
              <div style={{ marginTop: "0.75rem", textAlign: "left" }}>
                <div style={{ fontFamily: T.font, fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700, color: T.softGray, marginBottom: "0.4rem" }}>
                  Kumulierter Fortschritt
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {phases.slice(0, active + 1).map((p, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.5rem",
                      borderRadius: 20, fontSize: "0.7rem", fontFamily: T.font, fontWeight: 600,
                      background: i <= active ? `${T.greenLight}15` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${i <= active ? `${T.greenLight}30` : "rgba(255,255,255,0.05)"}`,
                      color: i <= active ? T.greenLight : T.softGray,
                    }}>
                      <Icon name="check" size={10} color={T.greenLight} />
                      Nach {p.num}: {p.independenceLabel || `${p.independenceScore || "–"}%`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer (Eckart-Style) */}
      <div style={{
        padding: "1rem 2rem", borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem",
        fontFamily: T.font, fontSize: "0.75rem", color: T.softGray,
      }}>
        <span>{company.name} · {company.city || company.address}</span>
        <span style={{ fontStyle: "italic" }}>
          {project.consultant ? `${project.consultant.name} · ${project.consultant.company}` : "PitchPilot"}
        </span>
      </div>

      {/* CSS */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes ringPulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(212,168,67,0.15)); }
          50% { filter: drop-shadow(0 0 16px rgba(212,168,67,0.35)); }
        }
        input[type=range] {
          -webkit-appearance: none; appearance: none;
          height: 5px; border-radius: 3px; background: rgba(255,255,255,0.08); outline: none;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: linear-gradient(135deg, var(--t-gold), var(--t-goldLight)); cursor: pointer;
          box-shadow: 0 0 8px rgba(212,168,67,0.3); border: 2px solid var(--t-navy);
        }
        input[type=range]::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: linear-gradient(135deg, var(--t-gold), var(--t-goldLight)); cursor: pointer; border: 2px solid var(--t-navy);
        }
        button:focus-visible { outline: 2px solid var(--t-gold); outline-offset: 2px; }
        @media (max-width: 768px) {
          .pitch-grid { grid-template-columns: 1fr !important; }
          .analysis-split { flex-direction: column !important; }
          .analysis-split > div:first-child { width: 100% !important; max-height: 40vh; border-right: none !important; border-bottom: 1px solid rgba(212,168,67,0.2); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── Unified Analyse & Kalkulation Overlay (Eckart-Style) ── */}
      {analysisOpen && (
        <div role="dialog" aria-modal="true" aria-label="Analyse & Kalkulation" style={{
          position: "fixed", inset: 0, zIndex: 9000, background: "rgba(10,18,32,0.97)",
          display: "flex", flexDirection: "column",
        }}>
          {/* Sticky header */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            background: "rgba(27,42,74,0.97)", backdropFilter: "blur(12px)",
            borderBottom: `1px solid ${T.gold}20`, padding: "0.6rem 1.2rem",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: T.font, fontSize: "1.1rem", fontWeight: 700, color: T.gold, letterSpacing: "0.5px" }}>
                Analyse & Kalkulation
              </div>
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <button onClick={handleConfigSave} style={{
                  ...S.pillBtn, padding: "0.3rem 0.8rem",
                  background: `${T.greenLight}20`, border: `1px solid ${T.greenLight}40`, color: T.greenLight,
                }}>
                  <Icon name="check" size={12} color={T.greenLight} /> Speichern
                </button>
                <button onClick={() => setAnalysisOpen(false)} aria-label="Panel schließen" style={{
                  background: "none", border: "none", cursor: "pointer", padding: "0.3rem",
                }}>
                  <Icon name="close" size={14} color="#888" />
                </button>
              </div>
            </div>
            <div style={{ fontFamily: T.font, fontSize: "0.68rem", color: T.softGray, marginTop: "0.15rem" }}>
              Kalkulation · Marktanalyse · BESS-Optimierung
            </div>
          </div>

          {/* Split layout: Left Config + Right MarketAnalysis */}
          <div className="analysis-split" style={{ flex: 1, overflow: "auto", display: "flex" }}>
            {/* Left sidebar: Konfiguration sliders */}
            <div style={{
              width: "min(380px, 40vw)", flexShrink: 0,
              borderRight: `1px solid ${T.gold}20`,
              background: "rgba(27,42,74,0.3)",
              overflowY: "auto", padding: "1rem 1.25rem",
            }}>
              {/* Slider Groups */}
              {CONFIG_GROUPS.map(group => (
                <div key={group.title} style={{ marginBottom: "1.25rem" }}>
                  <div style={{
                    fontFamily: T.font, fontSize: "0.62rem", letterSpacing: "1.5px", textTransform: "uppercase",
                    fontWeight: 700, color: T.gold, marginBottom: "0.5rem",
                    display: "flex", alignItems: "center", gap: "0.35rem",
                    paddingBottom: "0.3rem", borderBottom: `1px solid ${T.gold}15`,
                  }}>
                    <Icon name={group.icon} size={12} color={T.gold} /> {group.title}
                  </div>
                  {group.sliders.map(s => (
                    <ConfigSlider
                      key={s.path.join(".")}
                      label={s.label}
                      value={getVal(project, s.path) ?? 0}
                      min={s.min} max={s.max} step={s.step}
                      unit={s.unit} dec={s.dec}
                      onChange={v => updateConfig(s.path, v)}
                    />
                  ))}
                </div>
              ))}

              {/* Live KPI Summary */}
              {calc && (
                <div style={{
                  marginTop: "0.5rem", padding: "0.75rem",
                  background: "rgba(255,255,255,0.03)", borderRadius: 8,
                  border: `1px solid ${T.gold}15`,
                }}>
                  <div style={{ fontFamily: T.font, fontSize: "0.62rem", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700, color: T.greenLight || T.green, marginBottom: "0.5rem" }}>
                    LIVE-ERGEBNIS
                  </div>
                  {[
                    { label: "Gesamtinvest", value: fmtEuro(calc.investGesamt), color: T.gold },
                    { label: "Autarkie", value: `${fmtNum(calc.autarkie)}%`, color: T.greenLight || T.green },
                    { label: "Amortisation", value: `${fmtNum(calc.amortisationGesamt, 1)} J.`, color: T.gold },
                    { label: "Jährl. Ertrag", value: `${fmtEuro(calc.gesamtertrag)}/a`, color: T.greenLight || T.green },
                    { label: "CO₂-Einsparung", value: `${fmtNum(calc.co2Gesamt)} t/a`, color: T.greenLight || T.green },
                    { label: "EK-Rendite", value: `${fmtNum(calc.ekRendite, 1)}%`, color: T.gold },
                    { label: "DSCR", value: fmtNum(calc.dscr, 2), color: calc.dscr >= 1.2 ? (T.greenLight || T.green) : "#E74C3C" },
                  ].map(item => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ fontFamily: T.font, fontSize: "0.7rem", color: "#999" }}>{item.label}</span>
                      <span style={{ fontFamily: T.font, fontSize: "0.78rem", fontWeight: 700, color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right main area: Marktanalyse */}
            <div style={{ flex: 1, overflow: "auto" }}>
              <Suspense fallback={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: T.softGray }}>
                  Marktanalyse wird geladen...
                </div>
              }>
                <MarketAnalysis
                  project={project}
                  onClose={() => setAnalysisOpen(false)}
                  onResults={updateMarket}
                  inline
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* PDF Modal */}
      <Suspense fallback={null}>
        {pdfOpen && <PdfExport project={project} onClose={() => setPdfOpen(false)} />}
      </Suspense>

      {/* Version Manager */}
      {versionsOpen && (
        <VersionManager
          project={project}
          onClose={() => setVersionsOpen(false)}
          onRestore={(restored) => { setProject(restored); setVersionsOpen(false); showToast("Version wiederhergestellt"); }}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div role="status" aria-live="polite" style={{
          position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)",
          background: `linear-gradient(135deg, ${T.greenLight}, ${T.green})`,
          color: "#fff", padding: "0.6rem 1.4rem", borderRadius: 8,
          fontFamily: T.font, fontSize: "0.9rem", fontWeight: 700,
          display: "flex", alignItems: "center", gap: "0.4rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)", zIndex: 9999,
          animation: "fadeSlideIn 0.3s ease",
        }}>
          <Icon name="check" size={16} color="#fff" /> {toast}
        </div>
      )}

      {/* Screen reader phase announcement */}
      <div aria-live="polite" aria-atomic="true" style={{
        position: "absolute", width: 1, height: 1, overflow: "hidden",
        clip: "rect(0,0,0,0)", whiteSpace: "nowrap",
      }}>
        {isFinal
          ? "Gesamtergebnis — Wirtschaftlichkeit"
          : `Phase ${currentPhase?.num}: ${currentPhase?.title}`}
      </div>
    </div>
    </ThemeProvider>
  );
}
