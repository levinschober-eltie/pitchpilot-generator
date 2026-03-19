import { useState, useMemo, useRef, useCallback, useEffect, startTransition, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProject, saveProject } from "../store";
import { calculateAll, fmtEuro, fmtNum, getDynamicHeroCards, getPhaseCalcItems } from "../calcEngine";
import { C } from "../colors";
import Icon from "./Icons";

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

const COLOR_MAP = { gold: C.gold, green: C.green, navy: C.navyLight };
function getPhaseColor(phase) { return COLOR_MAP[phase?.color] || C.gold; }

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

/* ── Nested value helpers ── */
function getVal(obj, path) {
  let o = obj;
  for (const k of path) { o = o?.[k]; }
  return o;
}
function setVal(obj, path, value) {
  const next = { ...obj };
  if (path.length === 2) {
    next[path[0]] = { ...next[path[0]], [path[1]]: value };
  } else if (path.length === 3) {
    next[path[0]] = {
      ...next[path[0]],
      [path[1]]: { ...(next[path[0]]?.[path[1]] || {}), [path[2]]: value },
    };
  }
  return next;
}

/* ── Independence Score Ring (Eckart-Style, 130px) ── */
function ScoreRing({ score, color, label, size = 130 }) {
  const r = (size - 20) / 2, c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const half = size / 2;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={half} cy={half} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={C.gold} />
            <stop offset="100%" stopColor={C.greenLight} />
          </linearGradient>
        </defs>
        <circle cx={half} cy={half} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      {/* Center text overlay */}
      <div style={{ position: "relative", marginTop: -size, height: size, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: F, fontSize: size * 0.26, fontWeight: 700, color: C.goldLight, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontFamily: F, fontSize: Math.max(size * 0.08, 8), textTransform: "uppercase", letterSpacing: "1.5px", color: C.softGray, marginTop: 2 }}>Autarkie</span>
      </div>
      {label && <div style={{ fontFamily: F, fontSize: "0.65rem", color: C.softGray, marginTop: "0.3rem", lineHeight: 1.3, maxWidth: size }}>{label}</div>}
    </div>
  );
}

/* ── KPI Card ── */
function KPICard({ label, value, color, accent }) {
  const cardColor = accent ? C.gold : color;
  return (
    <div style={{ ...S.cardBase, border: `1px solid ${cardColor}22` }}>
      <div style={{ ...S.labelSmall, fontSize: "0.6rem", marginBottom: "0.15rem" }}>{label}</div>
      <div style={{ ...S.valueText, color: cardColor }}>{value}</div>
    </div>
  );
}

/* ── Highlight Card ── */
function HighlightCard({ icon, title, text, color }) {
  return (
    <div style={{ ...S.cardBase, padding: "0.6rem", border: `1px solid ${color}15` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
        <Icon name={icon} size={16} color={color} />
        <span style={{ fontFamily: F, fontSize: "0.8rem", fontWeight: 700, color }}>{title}</span>
      </div>
      <div style={{ fontFamily: F, fontSize: "0.75rem", color: "#B0B0A6", lineHeight: 1.4 }}>{text}</div>
    </div>
  );
}

/* ── Config Slider (Dark Theme) ── */
function ConfigSlider({ label, value, min, max, step, unit, dec, onChange }) {
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
        <span style={{ fontFamily: F, fontSize: "0.72rem", color: "#aaa" }}>{label}</span>
        {editing ? (
          <input ref={inputRef} type="text" inputMode="decimal" value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
            style={{
              width: 65, padding: "0.1rem 0.3rem", textAlign: "right",
              background: "rgba(255,255,255,0.1)", border: `1px solid ${C.gold}60`,
              borderRadius: 3, color: C.goldLight || C.gold, fontFamily: F, fontSize: "0.75rem", outline: "none",
            }}
          />
        ) : (
          <span onClick={startEdit} style={{
            fontFamily: F, fontSize: "0.75rem", color: C.goldLight || C.gold, fontWeight: 600,
            cursor: "pointer", padding: "0.1rem 0.3rem", borderRadius: 3, background: "rgba(255,255,255,0.04)",
          }}>
            {display} <span style={{ fontSize: "0.6rem", color: "#777" }}>{unit}</span>
          </span>
        )}
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.gold, height: 4, cursor: "pointer" }}
      />
    </div>
  );
}

/* ── Config Overlay (Slide-In) ── */
function ConfigOverlay({ project, calc, onUpdate, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handle = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 99,
      }} />

      {/* Panel */}
      <div ref={overlayRef} style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 360,
        background: `${C.navyDeep}f8`, backdropFilter: "blur(12px)",
        borderLeft: `1px solid ${C.gold}25`, zIndex: 100,
        overflowY: "auto", padding: "1rem 1.25rem",
        boxShadow: "-4px 0 30px rgba(0,0,0,0.5)",
        animation: "slideInRight 0.3s ease",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ fontFamily: F, fontSize: "0.7rem", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700, color: C.gold, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Icon name="settings" size={14} color={C.gold} /> KONFIGURATION
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: "0.3rem" }}>
            <Icon name="close" size={16} color="#888" />
          </button>
        </div>

        {/* Slider Groups */}
        {CONFIG_GROUPS.map(group => (
          <div key={group.title} style={{ marginBottom: "1.25rem" }}>
            <div style={{
              fontFamily: F, fontSize: "0.62rem", letterSpacing: "1.5px", textTransform: "uppercase",
              fontWeight: 700, color: C.gold, marginBottom: "0.5rem",
              display: "flex", alignItems: "center", gap: "0.35rem",
              paddingBottom: "0.3rem", borderBottom: `1px solid ${C.gold}15`,
            }}>
              <Icon name={group.icon} size={12} color={C.gold} /> {group.title}
            </div>
            {group.sliders.map(s => (
              <ConfigSlider
                key={s.path.join(".")}
                label={s.label}
                value={getVal(project, s.path) ?? 0}
                min={s.min} max={s.max} step={s.step}
                unit={s.unit} dec={s.dec}
                onChange={v => onUpdate(s.path, v)}
              />
            ))}
          </div>
        ))}

        {/* Live KPI Summary */}
        {calc && (
          <div style={{
            marginTop: "0.5rem", padding: "0.75rem",
            background: `rgba(255,255,255,0.03)`, borderRadius: 8,
            border: `1px solid ${C.gold}15`,
          }}>
            <div style={{ fontFamily: F, fontSize: "0.62rem", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700, color: C.greenLight || C.green, marginBottom: "0.5rem" }}>
              LIVE-ERGEBNIS
            </div>
            {[
              { label: "Gesamtinvest", value: fmtEuro(calc.investGesamt), color: C.gold },
              { label: "Autarkie", value: `${fmtNum(calc.autarkie)}%`, color: C.greenLight || C.green },
              { label: "Amortisation", value: `${fmtNum(calc.amortisationGesamt, 1)} J.`, color: C.gold },
              { label: "Jährl. Ertrag", value: `${fmtEuro(calc.gesamtertrag)}/a`, color: C.greenLight || C.green },
              { label: "CO₂-Einsparung", value: `${fmtNum(calc.co2Gesamt)} t/a`, color: C.greenLight || C.green },
              { label: "EK-Rendite", value: `${fmtNum(calc.ekRendite, 1)}%`, color: C.gold },
              { label: "DSCR", value: fmtNum(calc.dscr, 2), color: calc.dscr >= 1.2 ? (C.greenLight || C.green) : "#E74C3C" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <span style={{ fontFamily: F, fontSize: "0.7rem", color: "#999" }}>{item.label}</span>
                <span style={{ fontFamily: F, fontSize: "0.78rem", fontWeight: 700, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ── Phase Content (Eckart-Style Layout) ── */
function PhaseContent({ phase, color, liveKpis }) {
  if (!phase) return null;
  const green = C.greenLight || C.green;

  // Use live calculated KPIs if available, otherwise fall back to generated
  const kpis = (liveKpis && liveKpis.length > 0) ? liveKpis : phase.kpis;

  return (
    <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
      {/* Description */}
      <p style={{ fontFamily: F, fontSize: "1.0rem", lineHeight: 1.7, color: "rgba(255,255,255,0.75)", margin: "0 0 0.8rem 0" }}>
        {phase.description}
      </p>

      {/* KPIs (live or generated) — max 4 columns with left border accent */}
      {kpis?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, kpis.length)}, 1fr)`, gap: "0.35rem", marginBottom: "0.7rem" }}>
          {kpis.map((k, i) => (
            <div key={i} style={{
              ...S.cardBase, borderLeft: `2px solid ${k.accent ? C.gold : color}70`,
              animation: `fadeSlideIn 0.3s ease ${0.1 + i * 0.05}s both`,
            }}>
              <div style={{ ...S.labelSmall, marginBottom: "0.15rem" }}>{k.label}</div>
              <div style={{ ...S.valueText, color: k.accent ? C.gold : C.goldLight }}>{k.value}</div>
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
                <span style={{ fontFamily: F, fontSize: "0.8rem", fontWeight: 700, color }}>{h.title}</span>
              </div>
              <p style={{ fontFamily: F, fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.45, margin: 0 }}>{h.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Results (Lieferergebnisse) — colored dots instead of bullets */}
      {phase.results?.length > 0 && (
        <>
          <div style={{ ...S.sectionHeading, color: C.softGray, marginBottom: "0.35rem" }}>Ergebnisse</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginBottom: "0.7rem" }}>
            {phase.results.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", animation: `fadeSlideIn 0.3s ease ${0.25 + i * 0.05}s both` }}>
                <span style={{ color, fontSize: "0.7rem", opacity: 0.6, marginTop: "0.15rem" }}>●</span>
                <span style={{ fontFamily: F, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{r}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Investment & ROI — side by side (Eckart-Style) */}
      {(phase.investment?.length > 0 || phase.investTotal || phase.roi || phase.roiValue) && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ ...S.sectionHeading, color: C.softGray }}>Investition & Wirtschaftlichkeit</div>
          <div style={{ display: "grid", gridTemplateColumns: (phase.roi || phase.roiValue) ? "1fr 1fr" : "1fr", gap: "0.5rem" }}>
            {/* Investment card */}
            {(phase.investment?.length > 0 || phase.investTotal) && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "0.8rem" }}>
                {phase.investment?.map((inv, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: i < phase.investment.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ fontFamily: F, fontSize: "0.95rem", color: "rgba(255,255,255,0.8)" }}>{inv.label}</span>
                    <span style={{ fontFamily: F, fontSize: "1.05rem", fontWeight: 700, color: C.goldLight, whiteSpace: "nowrap", marginLeft: "0.5rem" }}>{inv.range}</span>
                  </div>
                ))}
                {phase.investTotal && (
                  <div style={{ borderTop: `1px solid ${C.gold}30`, padding: "0.5rem 0 0.1rem", marginTop: "0.3rem" }}>
                    <div style={{ fontFamily: F, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700, color: C.softGray }}>Gesamtinvestition</div>
                    <div style={{ fontFamily: F, fontSize: "1.2rem", fontWeight: 700, color: C.gold }}>{phase.investTotal}</div>
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
                <div style={{ ...S.sectionHeading, color: C.softGray, marginBottom: "0.4rem" }}>Return on Investment</div>
                {phase.roi && <div style={{ fontFamily: F, fontSize: "1.0rem", color: C.warmWhite, lineHeight: 1.5, marginBottom: "0.5rem" }}>{phase.roi}</div>}
                {phase.roiValue && (
                  <div style={{
                    display: "inline-flex", alignSelf: "flex-start",
                    background: `linear-gradient(135deg, ${green}30, ${green}15)`,
                    border: `1px solid ${green}50`, borderRadius: 6, padding: "0.35rem 0.7rem",
                  }}>
                    <span style={{ fontFamily: F, fontSize: "1.15rem", fontWeight: 700, color: green }}>{phase.roiValue}</span>
                  </div>
                )}
                {/* Independence label in ROI card */}
                {phase.independenceLabel && (
                  <div style={{ marginTop: "0.6rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: `linear-gradient(135deg, ${C.gold}, ${green})` }} />
                    <span style={{ fontFamily: F, fontSize: "0.85rem", color: C.softGray }}>
                      Autarkie: <span style={{ color: C.goldLight, fontWeight: 700 }}>{phase.independenceScore || "–"}%</span> — {phase.independenceLabel}
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
          <div style={{ ...S.sectionHeading, color: C.softGray }}>Fördermittel</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
            {phase.funding.map((f, i) => (
              <div key={i} style={{ ...S.cardBase, border: `1px solid ${color}15` }}>
                <div style={{ fontFamily: F, fontSize: "0.7rem", color: C.softGray }}>{f.label}</div>
                <div style={{ fontFamily: F, fontSize: "0.75rem", fontWeight: 600, color }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Final Summary ── */
function FinalSummary({ summary, calc, heroCards, color, project }) {
  if (!summary && !calc) return null;
  const green = C.greenLight || C.green;

  return (
    <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
      {summary?.headline && (
        <div style={{ borderLeft: `3px solid ${C.gold}`, paddingLeft: "1rem", marginBottom: "1.5rem" }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)", fontStyle: "italic", color: C.goldLight, margin: 0, lineHeight: 1.5 }}>
            „{summary.headline}"
          </p>
        </div>
      )}

      {/* Hero Cards (live calculated) */}
      {heroCards?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${heroCards.length}, 1fr)`, gap: "1rem", marginBottom: "1.5rem" }}>
          {heroCards.map((card, i) => {
            const cardColor = card.accent === "green" ? green : C.gold;
            return (
              <div key={i} style={{
                background: `linear-gradient(135deg, ${cardColor}15, ${cardColor}08)`,
                border: `2px solid ${cardColor}40`, borderRadius: "12px", padding: "1.25rem", textAlign: "center",
              }}>
                <Icon name={card.icon} size={28} color={cardColor} />
                <div style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: F, color: cardColor, marginTop: "0.5rem" }}>{card.value}</div>
                <div style={{ ...S.labelSmall, marginTop: "0.25rem" }}>{card.label}</div>
                {card.details?.map((d, j) => (
                  <div key={j} style={{ fontFamily: F, fontSize: "0.7rem", color: "#999", marginTop: j === 0 ? "0.5rem" : "0.1rem" }}>
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
              { label: "Invest Standort", value: fmtEuro(calc.investStandort), c: C.gold },
              { label: "Invest BESS", value: fmtEuro(calc.investPhase6 || 0), c: C.gold },
              { label: "Gesamtinvest", value: fmtEuro(calc.investGesamt), c: C.gold },
              { label: "Autarkie", value: `${fmtNum(calc.autarkie)}%`, c: green },
              { label: "Einsparung/a", value: `${fmtEuro(calc.einsparungStandort)}/a`, c: green },
              { label: "BESS-Erlöse/a", value: `${fmtEuro(calc.bessErloes)}/a`, c: green },
              { label: "Amortisation", value: `${fmtNum(calc.amortisationGesamt, 1)} J.`, c: C.gold },
              { label: "BESS-Rendite", value: `${fmtNum(calc.bessRendite, 1)}% p.a.`, c: green },
            ].map((item, i) => (
              <div key={i} style={{ ...S.cardBase, textAlign: "center", padding: "0.6rem 0.4rem" }}>
                <div style={{ ...S.labelSmall, fontSize: "0.55rem" }}>{item.label}</div>
                <div style={{ fontFamily: F, fontSize: "0.95rem", fontWeight: 700, color: item.c, marginTop: "0.15rem" }}>{item.value}</div>
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
                <div style={{ fontFamily: F, fontSize: "1.1rem", fontWeight: 700, color }}>{kpi.value}</div>
                <div style={{ ...S.labelSmall, fontSize: "0.6rem", marginTop: "0.2rem" }}>{kpi.label}</div>
                {kpi.sub && <div style={{ fontFamily: F, fontSize: "0.65rem", color: "#777", marginTop: "0.15rem" }}>{kpi.sub}</div>}
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
                <span style={{ fontFamily: F, fontSize: "0.7rem", fontWeight: 700, color }}>{item.phase}</span>
                <span style={{ fontFamily: F, fontSize: "0.75rem", color: "#B0B0A6" }}>{item.label}</span>
                <div style={{ position: "relative", height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${barPct}%`, background: `${color}40`, borderRadius: 3, transition: "width 0.5s" }} />
                  <span style={{ position: "relative", fontFamily: F, fontSize: "0.6rem", color: "#ccc", padding: "0 4px", lineHeight: "14px" }}>{item.range}</span>
                </div>
                <span style={{ fontFamily: F, fontSize: "0.6rem", color: green, textAlign: "right" }}>{item.score}%</span>
                <span style={{ fontFamily: F, fontSize: "0.6rem", color: C.gold, textAlign: "right", fontWeight: 600 }}>{item.roi}</span>
              </div>
            );
          })}
          {/* Total row */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0 0", borderTop: `1px solid ${color}30`, marginTop: "0.25rem" }}>
            <span style={{ fontFamily: F, fontSize: "0.85rem", fontWeight: 700, color }}>Gesamtinvestition</span>
            <span style={{ fontFamily: F, fontSize: "0.85rem", fontWeight: 700, color }}>{summary.investTotal || (calc ? fmtEuro(calc.investGesamt) : "")}</span>
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
                  <span style={{ fontFamily: F, fontSize: "0.78rem", color: "#B0B0A6" }}>{s.label}</span>
                  <span style={{ fontFamily: F, fontSize: "0.78rem", fontWeight: 600, color: green }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
          {summary.economicSummary.totals && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {[
                { label: "Jährl. Einsparungen", value: summary.economicSummary.totals.annualSavings, c: green },
                { label: "Invest Standort", value: summary.economicSummary.totals.investStandort, c: C.gold },
                { label: "Amortisation", value: summary.economicSummary.totals.paybackStandort, c: C.gold },
                { label: "BESS-Erlöse", value: summary.economicSummary.totals.bessRevenue, c: green },
              ].filter(t => t.value).map((t, i) => (
                <div key={i} style={{ ...S.cardBase, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={S.labelSmall}>{t.label}</span>
                  <span style={{ fontFamily: F, fontSize: "0.85rem", fontWeight: 700, color: t.c }}>{t.value}</span>
                </div>
              ))}
            </div>
          )}
          {summary.economicSummary.conclusion && (
            <div style={{ fontFamily: F, fontSize: "0.8rem", fontStyle: "italic", color: "#999", lineHeight: 1.6, padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: 6, borderLeft: `3px solid ${color}40` }}>
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
              { label: "EK-Rendite", value: `${fmtNum(calc.ekRendite, 1)}% p.a.`, c: C.gold },
              { label: "DSCR", value: fmtNum(calc.dscr, 2), c: calc.dscr >= 1.2 ? green : "#E74C3C" },
              { label: "Annuität", value: `${fmtEuro(calc.annuitaet)}/a`, c: C.softGray },
              { label: "CF nach FK", value: `${fmtEuro(calc.cfNachSchuldendienst)}/a`, c: calc.cfNachSchuldendienst > 0 ? green : "#E74C3C" },
              { label: "Eigenkapital", value: fmtEuro(calc.ekBetrag), c: "#B0B0A6" },
              { label: "Kreditbetrag", value: fmtEuro(calc.kreditBetrag), c: "#B0B0A6" },
            ].map((item, i) => (
              <div key={i} style={{ ...S.cardBase, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={S.labelSmall}>{item.label}</span>
                <span style={{ ...S.valueText, color: item.c, fontSize: "0.85rem" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Levers */}
      {summary?.levers?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ ...S.sectionHeading, color }}>Strategische Hebel</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {summary.levers.map((l, i) => (
              <div key={i} style={{ ...S.cardBase, padding: "0.6rem", border: `1px solid ${color}12` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                  <Icon name={l.icon} size={14} color={color} />
                  <span style={{ fontFamily: F, fontSize: "0.78rem", fontWeight: 700, color }}>{l.title}</span>
                </div>
                <div style={{ fontFamily: F, fontSize: "0.72rem", color: "#999", lineHeight: 1.4 }}>{l.desc}</div>
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
                    <span style={{ fontFamily: F, fontSize: "0.75rem", fontWeight: 700, color }}>{r.title}</span>
                  </div>
                  <span style={{ fontFamily: F, fontSize: "0.55rem", fontWeight: 700, color: green, background: `${green}15`, padding: "0.1rem 0.4rem", borderRadius: "1rem", letterSpacing: "0.5px", textTransform: "uppercase" }}>{r.status}</span>
                </div>
                <div style={{ fontFamily: F, fontSize: "0.68rem", color: "#888", lineHeight: 1.35 }}>{r.desc}</div>
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
              const impactColor = r.impact === "Niedrig" ? green : r.impact === "Mittel" ? C.gold : "#E74C3C";
              return (
                <div key={i} style={{ ...S.cardBase, padding: "0.6rem", border: `1px solid ${color}12` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <Icon name={r.icon} size={13} color={color} />
                      <span style={{ fontFamily: F, fontSize: "0.75rem", fontWeight: 700, color }}>{r.title}</span>
                    </div>
                    <span style={{ fontFamily: F, fontSize: "0.55rem", fontWeight: 700, color: impactColor, background: `${impactColor}15`, padding: "0.1rem 0.4rem", borderRadius: "1rem", letterSpacing: "0.5px", textTransform: "uppercase" }}>{r.impact}</span>
                  </div>
                  <div style={{ fontFamily: F, fontSize: "0.68rem", color: "#888", lineHeight: 1.35 }}>{r.desc}</div>
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
                <span style={{ fontFamily: F, fontSize: "0.7rem", fontWeight: 700, color }}>{p.label}</span>
                <span style={{ fontFamily: F, fontSize: "0.55rem", color: "#777" }}>Phase {p.phase}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA / Consultant */}
      {project?.consultant && (
        <div style={{ marginTop: "2rem", textAlign: "center", padding: "1.5rem", background: `${color}08`, borderRadius: 12, border: `1px solid ${color}20` }}>
          <div style={{ ...S.labelTiny, color, marginBottom: "0.75rem", letterSpacing: "2px" }}>Nächster Schritt</div>
          <div style={{ fontFamily: F, fontSize: "1rem", color: C.warmWhite, marginBottom: "0.5rem" }}>
            {project.consultant.name} · {project.consultant.company}
          </div>
          <div style={{ fontFamily: F, fontSize: "0.8rem", color: "#999" }}>{project.consultant.label}</div>
          {project.consultant.email && (
            <a href={`mailto:${project.consultant.email}`} style={{
              display: "inline-block", marginTop: "0.75rem", padding: "0.5rem 1.5rem",
              borderRadius: "2rem", background: `${color}20`, border: `1px solid ${color}40`,
              color, fontFamily: F, fontSize: "0.75rem", fontWeight: 700, textDecoration: "none",
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

/* ── Main Presentation Renderer ── */
export default function PresentationRenderer() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mutable project state — bidirectional: changes here save to localStorage
  const [project, setProject] = useState(() => getProject(id));
  const [active, setActive] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const contentRef = useRef(null);

  // Live calculation — recalculates on every config change
  const calc = useMemo(() => project ? calculateAll(project) : null, [project]);

  // Live hero cards for final summary
  const heroCards = useMemo(() => calc ? getDynamicHeroCards(calc) : [], [calc]);

  // Map enabled phases to their keys for live KPI lookup
  const enabledPhases = useMemo(
    () => (project?.phases || []).filter(p => p.enabled),
    [project?.phases]
  );

  // Update a nested config value and save to localStorage
  const updateConfig = useCallback((path, value) => {
    setProject(prev => {
      const next = setVal(prev, path, value);
      saveProject(next);
      return next;
    });
  }, []);

  // Update market results from MarketAnalysis
  const updateMarket = useCallback((results) => {
    setProject(prev => {
      const next = { ...prev, market: results };
      saveProject(next);
      return next;
    });
  }, []);

  const handleSetActive = useCallback((idx) => {
    startTransition(() => setActive(idx));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (showIntro || configOpen) return;
    const handle = (e) => {
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
  }, [showIntro, configOpen, project?.generated?.phases?.length]);

  if (!project?.generated) {
    return (
      <div style={{ ...S.flexCenter, height: "100vh", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "1.2rem", color: C.softGray }}>Projekt nicht gefunden oder noch nicht generiert.</div>
        <button className="btn btn-primary" onClick={() => navigate("/")}>Zurück</button>
      </div>
    );
  }

  const gen = project.generated;
  const phases = gen.phases || [];
  const totalSlides = phases.length + 1;
  const isFinal = active === phases.length;
  const currentPhase = isFinal ? null : phases[active];
  const currentColor = isFinal ? C.gold : getPhaseColor(currentPhase);
  const company = project.company || {};

  // Live KPIs for current phase
  const currentPhaseKey = !isFinal && enabledPhases[active] ? enabledPhases[active].key : null;
  const liveKpis = currentPhaseKey && calc ? getPhaseCalcItems(currentPhaseKey, calc) : null;

  // Slider position percentage for timeline
  const sliderPct = totalSlides > 1 ? (active / (totalSlides - 1)) * 100 : 0;

  /* ── Intro Screen ── */
  if (showIntro) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: `radial-gradient(ellipse at center, ${C.navy} 0%, ${C.navyDeep} 100%)`,
        textAlign: "center", padding: "2rem",
      }}>
        <div style={{ ...S.labelTiny, color: C.gold, marginBottom: "1.5rem", letterSpacing: "5px" }}>PITCHPILOT</div>
        <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)", fontWeight: 400, color: C.warmWhite, marginBottom: "0.5rem", maxWidth: 700 }}>
          {gen.intro?.headline || `Erstellt für ${company.name}`}
        </h1>
        <div style={{ fontSize: "1.1rem", color: C.softGray, marginBottom: "0.5rem" }}>
          {gen.intro?.subtitle || "Phasenkonzept zur Energietransformation"}
        </div>
        <div style={{ fontStyle: "italic", color: C.gold, fontSize: "0.9rem", marginBottom: "2.5rem" }}>
          {gen.intro?.tagline || ""}
        </div>

        {/* Phase pills */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "2.5rem" }}>
          {phases.map((p, i) => (
            <span key={i} style={{
              padding: "0.3rem 0.75rem", borderRadius: "2rem",
              border: `1px solid ${getPhaseColor(p)}50`, background: `${getPhaseColor(p)}10`,
              color: getPhaseColor(p), fontFamily: F, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "1px",
            }}>
              {p.num} — {p.title}
            </span>
          ))}
        </div>

        <button onClick={() => setShowIntro(false)} style={{
          ...S.pillBtn, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight || C.gold})`,
          color: C.navyDeep, padding: "0.75rem 2.5rem", fontSize: "0.8rem", border: "none",
          boxShadow: `0 4px 25px ${C.gold}40`,
        }}>
          Konzept entdecken <Icon name="arrowRight" size={16} />
        </button>

        {/* Live KPI preview on intro */}
        {calc && (
          <div style={{ marginTop: "3rem", display: "flex", gap: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { label: "Investition", value: fmtEuro(calc.investGesamt), color: C.gold },
              { label: "Autarkie", value: `${fmtNum(calc.autarkie)}%`, color: C.greenLight || C.green },
              { label: "CO₂", value: `${fmtNum(calc.co2Gesamt)} t/a`, color: C.greenLight || C.green },
              { label: "Ertrag", value: `${fmtEuro(calc.gesamtertrag)}/a`, color: C.gold },
            ].map(item => (
              <div key={item.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: F, fontSize: "1.4rem", fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontFamily: F, fontSize: "0.65rem", letterSpacing: "1px", textTransform: "uppercase", color: "#999" }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Main Presentation ── */
  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(180deg, ${C.navyDeep} 0%, ${C.navy} 50%, ${C.navyDeep} 100%)`,
      color: C.warmWhite,
    }}>
      {/* ── Company Header (Eckart-Style) ── */}
      <div style={{ padding: "2rem 2rem 1rem", position: "relative", zIndex: 2 }}>
        {/* Company name line */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontFamily: F, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "4px", fontWeight: 700, color: C.gold }}>
            {(company.name || "").toUpperCase()}
          </span>
          <span style={{ width: 40, height: 1, background: C.gold, display: "inline-block" }} />
          <span style={{ fontFamily: F, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "2px", color: C.softGray }}>
            Energietransformation
          </span>
        </div>

        {/* Main heading + action buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
          <h1 style={{
            fontSize: "clamp(1.5rem, 4vw, 2.4rem)", fontWeight: 700, margin: "0.6rem 0 0", lineHeight: 1.2,
            background: `linear-gradient(135deg, ${C.warmWhite} 0%, ${C.goldLight} 100%)`,
            backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Phasenkonzept zur Energietransformation
          </h1>
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
            <button onClick={() => setConfigOpen(true)} style={{
              ...S.pillBtn, padding: "0.3rem 0.7rem", fontSize: "0.7rem",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: C.softGray,
            }}>
              <Icon name="settings" size={12} color={C.gold} /> Konfiguration
            </button>
            <button onClick={() => setMarketOpen(true)} style={{
              ...S.pillBtn, padding: "0.3rem 0.7rem", fontSize: "0.7rem",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: C.softGray,
            }}>
              <Icon name="chart" size={12} color={C.gold} /> Marktanalyse
            </button>
            <button onClick={() => setPdfOpen(true)} style={{
              ...S.pillBtn, padding: "0.35rem 1rem", fontSize: "0.82rem", fontWeight: 600,
              background: `${C.gold}15`, border: `1px solid ${C.gold}40`, color: C.goldLight,
            }}>
              <Icon name="download" size={13} color={C.goldLight} /> PDF Export
            </button>
            <button onClick={() => navigate(`/edit/${id}`)} style={{
              ...S.pillBtn, padding: "0.3rem 0.7rem", fontSize: "0.7rem",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: C.softGray,
            }}>
              <Icon name="arrowLeft" size={12} color={C.softGray} /> Wizard
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
            const dotColor = i === phases.length ? C.gold : getPhaseColor(p);
            return (
              <button key={i} role="tab" aria-selected={isActive} onClick={() => handleSetActive(i)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                  padding: "0.25rem 0.5rem", opacity: isActive ? 1 : 0.4, transition: "all 0.3s ease",
                }}>
                <Icon name={i === phases.length ? "sparkle" : (p.icon || "target")} size={isActive ? 24 : 16} color={isActive ? C.gold : C.softGray} />
                <span style={{ fontFamily: F, fontSize: "0.75rem", letterSpacing: "1.5px", textTransform: "uppercase", color: isActive ? C.gold : C.softGray }}>
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
              width: `${sliderPct}%`, background: `linear-gradient(90deg, ${C.gold}, ${C.greenLight})`,
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
                background: isAct ? C.gold : "rgba(255,255,255,0.2)",
                border: isAct ? `2px solid ${C.warmWhite}` : "none",
                boxShadow: isAct ? `0 0 12px ${C.gold}80` : "none",
                transition: "all 0.3s ease", zIndex: 1,
              }} />
            );
          })}

          {/* Slider thumb */}
          <div style={{
            position: "absolute", left: `${sliderPct}%`, top: 3,
            transform: "translate(-50%, -50%)",
            width: 28, height: 28, borderRadius: "50%",
            background: C.navy, border: `3px solid ${C.gold}`,
            boxShadow: `0 0 20px ${C.gold}40, 0 2px 8px rgba(0,0,0,0.3)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)", zIndex: 2,
          }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "0.7rem", fontWeight: 700, color: C.gold }}>
              {isFinal ? "★" : currentPhase?.num}
            </span>
          </div>
        </div>

        {/* Month labels */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0.5rem 0" }}>
          {[...phases, { months: "Gesamt" }].map((p, i) => (
            <span key={i} style={{
              fontFamily: F, fontSize: "0.7rem", textAlign: "center", minWidth: 60,
              color: i === active ? C.goldLight : C.softGray,
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
              ? `linear-gradient(135deg, ${C.gold}40, ${C.greenLight}30)`
              : `linear-gradient(135deg, ${currentColor}30, ${currentColor}10)`,
            border: `2px solid ${isFinal ? C.gold : `${currentColor}60`}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isFinal ? `0 0 24px ${C.gold}30` : "none",
          }}>
            <Icon name={isFinal ? "sparkle" : (currentPhase?.icon || "target")} size={24} color={isFinal ? C.gold : currentColor} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F, fontSize: "0.75rem", letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700, color: C.gold, marginBottom: "0.2rem" }}>
              {isFinal ? `Gesamtergebnis · ${gen.finalSummary?.subtitle || "Wirtschaftlichkeit"}` : `Phase ${currentPhase?.num} · ${currentPhase?.subtitle || currentPhase?.title}`}
            </div>
            <h2 style={{
              fontFamily: "Georgia, serif", fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)", fontWeight: 700, margin: 0, lineHeight: 1.15,
              ...(isFinal ? {
                background: `linear-gradient(135deg, ${C.warmWhite}, ${C.goldLight})`,
                backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              } : { color: C.warmWhite }),
            }}>
              {isFinal ? "Ergebnis & Wirtschaftlichkeit" : currentPhase?.title}
            </h2>
          </div>
        </div>

        {/* Headline quote (Eckart-Style „...") */}
        {!isFinal && currentPhase?.headline && (
          <div style={{ borderLeft: `3px solid ${C.gold}`, paddingLeft: "1rem", marginBottom: "1rem" }}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)", fontStyle: "italic", color: C.goldLight, margin: 0, lineHeight: 1.5 }}>
              „{currentPhase.headline}"
            </p>
          </div>
        )}

        {/* Grid: Content (5fr) + ScoreRing (4fr) */}
        <div className="pitch-grid" style={{ display: "grid", gridTemplateColumns: "5fr 4fr", gap: "1.25rem", alignItems: "start", minWidth: 0 }}>
          <div ref={contentRef} style={{ minWidth: 0 }}>
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
                <div style={{ fontFamily: F, fontSize: "0.6rem", letterSpacing: "1px", textTransform: "uppercase", color: C.softGray }}>Invest</div>
                <div style={{ fontFamily: F, fontSize: "0.95rem", fontWeight: 700, color: currentColor }}>
                  {fmtEuro(calc[INVEST_MAP[currentPhaseKey]] || 0)}
                </div>
              </div>
            )}
            {/* Cumulative progress pills */}
            {!isFinal && active > 0 && (
              <div style={{ marginTop: "0.75rem", textAlign: "left" }}>
                <div style={{ fontFamily: F, fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700, color: C.softGray, marginBottom: "0.4rem" }}>
                  Kumulierter Fortschritt
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {phases.slice(0, active + 1).map((p, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.5rem",
                      borderRadius: 20, fontSize: "0.7rem", fontFamily: F, fontWeight: 600,
                      background: i <= active ? `${C.greenLight}15` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${i <= active ? `${C.greenLight}30` : "rgba(255,255,255,0.05)"}`,
                      color: i <= active ? C.greenLight : C.softGray,
                    }}>
                      <Icon name="check" size={10} color={C.greenLight} />
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
        fontFamily: F, fontSize: "0.75rem", color: C.softGray,
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
        @media (max-width: 768px) {
          .pitch-grid { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* Config Overlay */}
      {configOpen && (
        <ConfigOverlay
          project={project}
          calc={calc}
          onUpdate={updateConfig}
          onClose={() => setConfigOpen(false)}
        />
      )}

      {/* Modals */}
      <Suspense fallback={null}>
        {marketOpen && (
          <MarketAnalysis
            project={project}
            onClose={() => setMarketOpen(false)}
            onResults={updateMarket}
          />
        )}
        {pdfOpen && <PdfExport project={project} onClose={() => setPdfOpen(false)} />}
      </Suspense>
    </div>
  );
}
