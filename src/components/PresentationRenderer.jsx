import { useState, useMemo, useRef, useCallback, useEffect, startTransition, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProject, saveProject } from "../store";
import { calculateAll, fmtEuro, fmtNum, getDynamicHeroCards, getPhaseCalcItems } from "../calcEngine";
import { C } from "../colors";
import Icon from "./Icons";

const MarketAnalysis = lazy(() => import("./MarketAnalysis"));
const PdfExport = lazy(() => import("./PdfExport"));

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

/* ── Independence Score Ring ── */
function ScoreRing({ score, color, label }) {
  const r = 36, c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="90" height="90" viewBox="0 0 90 90" aria-hidden="true">
        <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 45 45)"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }} />
        <text x="45" y="42" textAnchor="middle" fill={color} style={{ fontFamily: F, fontSize: "1.3rem", fontWeight: 700 }}>{pct}%</text>
        <text x="45" y="56" textAnchor="middle" fill="#B0B0A6" style={{ fontFamily: F, fontSize: "0.45rem", letterSpacing: "1px", textTransform: "uppercase" }}>Autarkie</text>
      </svg>
      {label && <div style={{ fontFamily: F, fontSize: "0.6rem", color: "#888", marginTop: "0.25rem", lineHeight: 1.3 }}>{label}</div>}
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

/* ── Phase Content ── */
function PhaseContent({ phase, color, liveKpis }) {
  if (!phase) return null;

  // Use live calculated KPIs if available, otherwise fall back to generated
  const kpis = (liveKpis && liveKpis.length > 0) ? liveKpis : phase.kpis;

  return (
    <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
      {/* Headline */}
      <div style={{ fontStyle: "italic", color: "#B0B0A6", fontSize: "0.9rem", marginBottom: "0.75rem", borderLeft: `3px solid ${color}`, paddingLeft: "0.75rem" }}>
        {phase.headline}
      </div>

      {/* Description */}
      <p style={{ fontFamily: F, fontSize: "0.85rem", lineHeight: 1.7, color: C.warmWhite, marginBottom: "1.25rem" }}>
        {phase.description}
      </p>

      {/* KPIs (live or generated) */}
      {kpis?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, kpis.length)}, 1fr)`, gap: "0.5rem", marginBottom: "1.25rem" }}>
          {kpis.map((k, i) => <KPICard key={i} label={k.label} value={k.value} color={color} accent={k.accent} />)}
        </div>
      )}

      {/* Highlights */}
      {phase.highlights?.length > 0 && (
        <>
          <div style={S.sectionHeading}>Highlights</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1.25rem" }}>
            {phase.highlights.map((h, i) => <HighlightCard key={i} icon={h.icon} title={h.title} text={h.text} color={color} />)}
          </div>
        </>
      )}

      {/* Results */}
      {phase.results?.length > 0 && (
        <>
          <div style={S.sectionHeading}>Lieferergebnisse</div>
          <ul style={{ fontFamily: F, fontSize: "0.8rem", color: "#B0B0A6", paddingLeft: "1.2rem", lineHeight: 1.8 }}>
            {phase.results.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </>
      )}

      {/* Investment Detail */}
      {phase.investment?.length > 0 ? (
        <div style={{ marginTop: "1.25rem" }}>
          <div style={S.sectionHeading}>Investition</div>
          {phase.investment.map((inv, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontFamily: F, fontSize: "0.8rem", color: "#B0B0A6" }}>{inv.label}</span>
              <span style={{ fontFamily: F, fontSize: "0.8rem", fontWeight: 600, color }}>{inv.range}</span>
            </div>
          ))}
          {phase.investTotal && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0 0", borderTop: `1px solid ${color}30`, marginTop: "0.25rem" }}>
              <span style={{ fontFamily: F, fontSize: "0.85rem", fontWeight: 700, color }}>Gesamtinvestition</span>
              <span style={{ fontFamily: F, fontSize: "0.95rem", fontWeight: 700, color }}>{phase.investTotal}</span>
            </div>
          )}
        </div>
      ) : phase.investTotal && (
        <div style={{ marginTop: "1rem", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={S.labelSmall}>Investition</span>
          <span style={{ ...S.valueText, color }}>{phase.investTotal}</span>
        </div>
      )}

      {/* Funding */}
      {phase.funding?.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <div style={S.sectionHeading}>Fördermittel</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
            {phase.funding.map((f, i) => (
              <div key={i} style={{ ...S.cardBase, border: `1px solid ${color}15` }}>
                <div style={{ fontFamily: F, fontSize: "0.7rem", color: "#B0B0A6" }}>{f.label}</div>
                <div style={{ fontFamily: F, fontSize: "0.75rem", fontWeight: 600, color }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROI */}
      {(phase.roi || phase.roiValue) && (
        <div style={{ marginTop: "1rem", padding: "0.6rem 0.75rem", background: `${color}08`, borderRadius: "6px", border: `1px solid ${color}20` }}>
          <div style={S.labelSmall}>Return on Investment</div>
          {phase.roi && <div style={{ fontFamily: F, fontSize: "0.8rem", color: "#B0B0A6", marginTop: "0.2rem" }}>{phase.roi}</div>}
          {phase.roiValue && <div style={{ fontFamily: F, fontSize: "1rem", fontWeight: 700, color, marginTop: "0.15rem" }}>{phase.roiValue}</div>}
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
        <div style={{ fontStyle: "italic", color: "#B0B0A6", fontSize: "0.9rem", marginBottom: "1.5rem", borderLeft: `3px solid ${color}`, paddingLeft: "0.75rem" }}>
          {summary.headline}
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
      {/* Header bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: `${C.navyDeep}ee`, backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${currentColor}20`,
        padding: "0.5rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ ...S.labelTiny, color: C.gold, fontSize: "0.65rem", letterSpacing: "3px" }}>PITCHPILOT</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
          <span style={{ fontFamily: F, fontSize: "0.8rem", color: C.softGray }}>{company.name}</span>
        </div>
        <div style={{ display: "flex", gap: "0.3rem" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setConfigOpen(true)} style={{ fontSize: "0.65rem" }}>
            <Icon name="settings" size={12} /> Konfiguration
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setMarketOpen(true)} style={{ fontSize: "0.65rem" }}>
            <Icon name="chart" size={12} /> Marktanalyse
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setPdfOpen(true)} style={{ fontSize: "0.65rem" }}>
            <Icon name="download" size={12} /> PDF
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/edit/${id}`)} style={{ fontSize: "0.65rem" }}>
            <Icon name="arrowLeft" size={12} /> Wizard
          </button>
        </div>
      </div>

      {/* Content area */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem 6rem" }}>
        {/* Phase title */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: `${currentColor}20`, border: `2px solid ${currentColor}`,
              ...S.flexCenter,
            }}>
              <Icon name={isFinal ? "sparkle" : (currentPhase?.icon || "target")} size={18} color={currentColor} />
            </div>
            <div>
              <div style={{ ...S.labelTiny, color: currentColor }}>
                {isFinal ? "GESAMTERGEBNIS" : `PHASE ${currentPhase?.num}`}
              </div>
              <h2 style={{ fontSize: "clamp(1.2rem, 3vw, 1.8rem)", fontWeight: 400, margin: 0 }}>
                {isFinal ? "Ergebnis & Wirtschaftlichkeit" : currentPhase?.title}
              </h2>
            </div>
          </div>
          {!isFinal && currentPhase?.subtitle && (
            <div style={{ ...S.labelSmall, marginLeft: "3.25rem" }}>{currentPhase.subtitle}</div>
          )}
          {!isFinal && currentPhase?.months && (
            <div style={{ ...S.labelSmall, marginLeft: "3.25rem", marginTop: "0.15rem", color: currentColor }}>{currentPhase.months}</div>
          )}
        </div>

        {/* Grid: Content + Score Ring */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "2rem", alignItems: "start" }}>
          <div ref={contentRef}>
            {isFinal ? (
              <FinalSummary summary={gen.finalSummary} calc={calc} heroCards={heroCards} color={currentColor} project={project} />
            ) : (
              <PhaseContent phase={currentPhase} color={currentColor} liveKpis={liveKpis} />
            )}
          </div>
          <div style={{ textAlign: "center", position: "sticky", top: 100 }}>
            <ScoreRing
              score={isFinal ? calc?.autarkie : (calc?.autarkie || currentPhase?.independenceScore)}
              color={currentColor}
              label={isFinal ? "Strategischer Standortvorteil" : currentPhase?.independenceLabel}
            />
            {/* Live invest for current phase */}
            {!isFinal && calc && currentPhaseKey && (
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{ fontFamily: F, fontSize: "0.6rem", letterSpacing: "1px", textTransform: "uppercase", color: "#888" }}>Invest</div>
                <div style={{ fontFamily: F, fontSize: "0.85rem", fontWeight: 700, color: currentColor }}>
                  {fmtEuro(calc[INVEST_MAP[currentPhaseKey]] || 0)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline navigation */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: `${C.navyDeep}f5`, backdropFilter: "blur(10px)",
        borderTop: `1px solid ${currentColor}20`, padding: "0.75rem 1.5rem", zIndex: 50,
      }}>
        <div role="tablist" aria-label="Phasen-Navigation" style={{ display: "flex", justifyContent: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          {phases.map((p, i) => {
            const phColor = getPhaseColor(p);
            const isActive = i === active;
            return (
              <button key={i} role="tab" aria-selected={isActive} onClick={() => handleSetActive(i)} style={{
                ...S.pillBtn,
                background: isActive ? `${phColor}25` : "rgba(255,255,255,0.04)",
                color: isActive ? phColor : C.softGray,
                border: `1px solid ${isActive ? phColor : "transparent"}`,
                padding: "0.35rem 0.75rem", fontSize: "0.65rem",
              }}>
                {p.num}
                <span style={{ display: isActive ? "inline" : "none" }}>{p.title}</span>
              </button>
            );
          })}
          <button role="tab" aria-selected={isFinal} onClick={() => handleSetActive(phases.length)} style={{
            ...S.pillBtn,
            background: isFinal ? `${C.gold}25` : "rgba(255,255,255,0.04)",
            color: isFinal ? C.gold : C.softGray,
            border: `1px solid ${isFinal ? C.gold : "transparent"}`,
            padding: "0.35rem 0.75rem", fontSize: "0.65rem",
          }}>
            <Icon name="sparkle" size={12} />
            <span style={{ display: isFinal ? "inline" : "none" }}>Ergebnis</span>
          </button>
        </div>
      </div>

      {/* CSS */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (max-width: 768px) {
          .pitch-grid { grid-template-columns: 1fr !important; }
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
