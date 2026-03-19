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
function ScoreRing({ score, color }) {
  const r = 36, c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" aria-hidden="true">
      <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 45 45)"
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }} />
      <text x="45" y="42" textAnchor="middle" fill={color} style={{ fontFamily: F, fontSize: "1.3rem", fontWeight: 700 }}>{pct}%</text>
      <text x="45" y="56" textAnchor="middle" fill="#B0B0A6" style={{ fontFamily: F, fontSize: "0.45rem", letterSpacing: "1px", textTransform: "uppercase" }}>Autarkie</text>
    </svg>
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
          <div style={S.sectionHeading}>Ergebnisse</div>
          <ul style={{ fontFamily: F, fontSize: "0.8rem", color: "#B0B0A6", paddingLeft: "1.2rem", lineHeight: 1.8 }}>
            {phase.results.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </>
      )}

      {/* Investment (live) */}
      {phase.investTotal && (
        <div style={{ marginTop: "1rem", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={S.labelSmall}>Investition</span>
          <span style={{ ...S.valueText, color }}>{phase.investTotal}</span>
        </div>
      )}
    </div>
  );
}

/* ── Final Summary ── */
function FinalSummary({ summary, calc, heroCards, color }) {
  if (!summary && !calc) return null;

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
            const cardColor = card.accent === "green" ? (C.greenLight || C.green) : C.gold;
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

      {/* Summary KPIs (live) */}
      {calc && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
          <div style={{ ...S.cardBase, textAlign: "center", padding: "0.75rem" }}>
            <div style={S.labelSmall}>Gesamtinvestition</div>
            <div style={{ ...S.valueText, color: C.gold, fontSize: "1.2rem", marginTop: "0.25rem" }}>{fmtEuro(calc.investGesamt)}</div>
          </div>
          <div style={{ ...S.cardBase, textAlign: "center", padding: "0.75rem" }}>
            <div style={S.labelSmall}>Autarkiegrad</div>
            <div style={{ ...S.valueText, color: C.greenLight || C.green, fontSize: "1.2rem", marginTop: "0.25rem" }}>{fmtNum(calc.autarkie)}%</div>
          </div>
          <div style={{ ...S.cardBase, textAlign: "center", padding: "0.75rem" }}>
            <div style={S.labelSmall}>Amortisation</div>
            <div style={{ ...S.valueText, color: C.gold, fontSize: "1.2rem", marginTop: "0.25rem" }}>{fmtNum(calc.amortisationGesamt, 1)} Jahre</div>
          </div>
        </div>
      )}

      {/* Detailed financial breakdown */}
      {calc && (
        <div style={{ marginTop: "1.5rem" }}>
          <div style={S.sectionHeading}>Investitions-Übersicht</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {[
              { label: "EK-Rendite", value: `${fmtNum(calc.ekRendite, 1)}% p.a.`, color: C.gold },
              { label: "DSCR", value: fmtNum(calc.dscr, 2), color: calc.dscr >= 1.2 ? (C.greenLight || C.green) : "#E74C3C" },
              { label: "Annuität", value: `${fmtEuro(calc.annuitaet)}/a`, color: C.softGray },
              { label: "CF nach FK", value: `${fmtEuro(calc.cfNachSchuldendienst)}/a`, color: calc.cfNachSchuldendienst > 0 ? (C.greenLight || C.green) : "#E74C3C" },
              { label: "Standort-Invest (I–V)", value: fmtEuro(calc.investStandort), color: "#B0B0A6" },
              { label: "BESS-Invest (VI)", value: fmtEuro(calc.investPhase6 || 0), color: "#B0B0A6" },
            ].map((item, i) => (
              <div key={i} style={{ ...S.cardBase, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={S.labelSmall}>{item.label}</span>
                <span style={{ ...S.valueText, color: item.color, fontSize: "0.9rem" }}>{item.value}</span>
              </div>
            ))}
          </div>
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
              <FinalSummary summary={gen.finalSummary} calc={calc} heroCards={heroCards} color={currentColor} />
            ) : (
              <PhaseContent phase={currentPhase} color={currentColor} liveKpis={liveKpis} />
            )}
          </div>
          <div style={{ textAlign: "center", position: "sticky", top: 100 }}>
            <ScoreRing
              score={isFinal ? calc?.autarkie : (calc?.autarkie || currentPhase?.independenceScore)}
              color={currentColor}
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
