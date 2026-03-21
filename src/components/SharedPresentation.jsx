import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { decodeSharePayload, saveCustomerVersion, getProject } from "../store";
import { calculateAll, fmtEuro, fmtNum, getDynamicHeroCards, getPhaseCalcItems } from "../calcEngine";
import { C } from "../colors";
import Icon from "./Icons";

const MarketAnalysis = lazy(() => import("./MarketAnalysis"));
const PhaseVisual = lazy(() => import("./PhaseVisuals"));

const F = "Calibri, sans-serif";
const S = {
  labelSmall: { fontFamily: F, fontSize: "0.7rem", letterSpacing: "0.5px", textTransform: "uppercase", color: "#B0B0A6" },
  valueText: { fontFamily: F, fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.1 },
  cardBase: { borderRadius: "7px", padding: "0.45rem 0.5rem", background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))" },
  sectionHeading: { fontFamily: F, fontSize: "0.7rem", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem" },
  pillBtn: { borderRadius: "2rem", fontFamily: F, fontSize: "0.7rem", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", transition: "all 0.3s", whiteSpace: "nowrap" },
};

const COLOR_MAP = { gold: C.gold, green: C.green, navy: C.navyLight };
function getPhaseColor(phase) { return COLOR_MAP[phase?.color] || C.gold; }

/* ── Config slider for customer adjustments ── */
function ConfigSlider({ label, value, min, max, step, unit, dec, onChange }) {
  const display = dec != null
    ? Number(value).toFixed(dec).replace(".", ",")
    : Number(value).toLocaleString("de-DE");

  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.15rem" }}>
        <span style={{ fontFamily: F, fontSize: "0.72rem", color: "#aaa" }}>{label}</span>
        <span style={{ fontFamily: F, fontSize: "0.75rem", color: C.goldLight, fontWeight: 600, padding: "0.1rem 0.3rem", borderRadius: 3, background: "rgba(255,255,255,0.04)" }}>
          {display} <span style={{ fontSize: "0.6rem", color: "#777" }}>{unit}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.gold, height: 4, cursor: "pointer" }}
      />
    </div>
  );
}

const CONFIG_GROUPS = [
  { title: "ENERGIEPROFIL", icon: "bolt", sliders: [
    { path: ["energy", "stromverbrauch"], label: "Stromverbrauch", unit: "MWh/a", min: 500, max: 100000, step: 500 },
    { path: ["energy", "gasverbrauch"], label: "Gasverbrauch", unit: "MWh/a", min: 0, max: 50000, step: 500 },
    { path: ["energy", "strompreis"], label: "Strompreis", unit: "ct/kWh", min: 8, max: 40, step: 0.5, dec: 1 },
    { path: ["energy", "gaspreis"], label: "Gaspreis", unit: "ct/kWh", min: 2, max: 18, step: 0.5, dec: 1 },
  ]},
  { title: "PV-AUSBAU", icon: "sun", sliders: [
    { path: ["phaseConfig", "pv", "pvDach"], label: "PV Dach", unit: "MWp", min: 0, max: 20, step: 0.1, dec: 1 },
    { path: ["phaseConfig", "pv", "pvCarport"], label: "PV Carport", unit: "MWp", min: 0, max: 10, step: 0.1, dec: 1 },
  ]},
  { title: "SPEICHER", icon: "battery", sliders: [
    { path: ["phaseConfig", "speicher", "kapazitaet"], label: "Standort-BESS", unit: "MWh", min: 0, max: 50, step: 0.5, dec: 1 },
  ]},
  { title: "FINANZIERUNG", icon: "bank", sliders: [
    { path: ["finance", "ekAnteil"], label: "Eigenkapitalanteil", unit: "%", min: 10, max: 100, step: 5 },
    { path: ["finance", "kreditZins"], label: "Kreditzins", unit: "% p.a.", min: 2, max: 8, step: 0.1, dec: 1 },
  ]},
];

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

export default function SharedPresentation() {
  const [searchParams] = useSearchParams();
  const encoded = searchParams.get("d");

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [calcNum, setCalcNum] = useState(1);

  // Decode share payload on mount
  useEffect(() => {
    if (!encoded) {
      setError("Kein gültiger Share-Link.");
      setLoading(false);
      return;
    }
    decodeSharePayload(encoded)
      .then(decoded => {
        if (!decoded) {
          setError("Link konnte nicht dekodiert werden.");
        } else {
          const sourceProject = getProject(decoded.sourceProjectId);
          // Prefer version-specific snapshot if a versionId was encoded
          if (decoded.sourceVersionId && sourceProject?.versions) {
            const ver = sourceProject.versions.find(v => v.id === decoded.sourceVersionId);
            if (ver?.snapshot?.generated) {
              decoded.generated = ver.snapshot.generated;
            }
          }
          // Fallback: use current project generated content
          if (!decoded.generated && sourceProject?.generated) {
            decoded.generated = sourceProject.generated;
          }
          setProject(decoded);
          // Count existing customer versions for numbering
          if (sourceProject?.versions) {
            const customerVersions = sourceProject.versions.filter(v => v.createdBy === "customer");
            setCalcNum(customerVersions.length + 1);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Fehler beim Dekodieren des Links.");
        setLoading(false);
      });
  }, [encoded]);

  const calc = useMemo(() => project ? calculateAll(project) : null, [project]);
  const heroCards = useMemo(() => calc ? getDynamicHeroCards(calc) : [], [calc]);

  const updateConfig = useCallback((path, value) => {
    setProject(prev => setVal(prev, path, value));
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    if (!project?.sourceProjectId) return;
    const result = saveCustomerVersion(project.sourceProjectId, project, calcNum);
    if (result) {
      setSaved(true);
      setCalcNum(prev => prev + 1);
    }
  }, [project, calcNum]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.navyDeep }}>
        <div className="spinner" style={{ width: 40, height: 40, border: "3px solid #D0D0CC", borderTopColor: "#FFCE00", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: C.navyDeep, color: C.warmWhite, gap: "1rem" }}>
        <Icon name="shield" size={48} color={C.gold} />
        <div style={{ fontSize: "1.2rem" }}>{error || "Projekt nicht gefunden."}</div>
        <div style={{ fontSize: "0.8rem", color: C.softGray }}>Bitte prüfen Sie den Link oder kontaktieren Sie Ihren Berater.</div>
      </div>
    );
  }

  if (!project.generated) {
    return (
      <div style={{
        minHeight: "100vh", background: `radial-gradient(ellipse at center, ${C.navy} 0%, ${C.navyDeep} 100%)`,
        color: C.warmWhite, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "2rem",
      }}>
        <div style={{ fontFamily: F, fontSize: "0.7rem", letterSpacing: "5px", textTransform: "uppercase", fontWeight: 700, color: C.gold, marginBottom: "1.5rem" }}>PITCHPILOT</div>
        <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", fontWeight: 400, marginBottom: "1rem" }}>
          {project.company?.name || "Ihr Energiekonzept"}
        </h1>
        <p style={{ color: C.softGray, maxWidth: 500, marginBottom: "2rem" }}>
          Die Präsentation für dieses Projekt wurde noch nicht generiert. Bitte kontaktieren Sie Ihren Berater.
        </p>

        {/* Show live calc preview */}
        {calc && (
          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "2rem" }}>
            {[
              { label: "Investition", value: fmtEuro(calc.investGesamt), color: C.gold },
              { label: "Autarkie", value: `${fmtNum(calc.autarkie)}%`, color: C.greenLight },
              { label: "CO₂", value: `${fmtNum(calc.co2Gesamt)} t/a`, color: C.greenLight },
              { label: "Ertrag", value: `${fmtEuro(calc.gesamtertrag)}/a`, color: C.gold },
            ].map(item => (
              <div key={item.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: F, fontSize: "1.4rem", fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontFamily: F, fontSize: "0.65rem", letterSpacing: "1px", textTransform: "uppercase", color: "#999" }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Config toggle */}
        <button onClick={() => setConfigOpen(o => !o)} style={{
          ...S.pillBtn, padding: "0.5rem 1.5rem",
          background: configOpen ? `${C.gold}20` : "rgba(255,255,255,0.06)",
          border: `1px solid ${configOpen ? `${C.gold}40` : "rgba(255,255,255,0.12)"}`,
          color: configOpen ? C.gold : C.softGray,
        }}>
          <Icon name="chart" size={14} /> Kalkulation anpassen
        </button>

        {configOpen && (
          <div style={{ marginTop: "1.5rem", width: "min(400px, 90vw)", textAlign: "left" }}>
            {CONFIG_GROUPS.map(group => (
              <div key={group.title} style={{ marginBottom: "1rem" }}>
                <div style={{ fontFamily: F, fontSize: "0.62rem", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700, color: C.gold, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Icon name={group.icon} size={12} color={C.gold} /> {group.title}
                </div>
                {group.sliders.map(s => (
                  <ConfigSlider key={s.path.join(".")} label={s.label} value={getVal(project, s.path) ?? 0}
                    min={s.min} max={s.max} step={s.step} unit={s.unit} dec={s.dec}
                    onChange={v => updateConfig(s.path, v)}
                  />
                ))}
              </div>
            ))}
            <button onClick={handleSave} style={{
              ...S.pillBtn, padding: "0.5rem 1.5rem", width: "100%", justifyContent: "center",
              background: saved ? `${C.greenLight}20` : `${C.gold}20`,
              border: `1px solid ${saved ? `${C.greenLight}40` : `${C.gold}40`}`,
              color: saved ? C.greenLight : C.gold, marginTop: "0.5rem",
            }}>
              <Icon name={saved ? "check" : "download"} size={14} />
              {saved ? "Kalkulation gespeichert!" : "Kalkulation speichern"}
            </button>
          </div>
        )}

        {project.consultant && (
          <div style={{ marginTop: "2rem", padding: "1rem", background: `${C.gold}08`, borderRadius: 12, border: `1px solid ${C.gold}20` }}>
            <div style={{ fontFamily: F, fontSize: "0.85rem", color: C.warmWhite }}>{project.consultant.name} · {project.consultant.company}</div>
            {project.consultant.email && (
              <a href={`mailto:${project.consultant.email}`} style={{ color: C.gold, fontSize: "0.8rem", fontFamily: F }}>
                Kontakt aufnehmen
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── Full presentation with generated content ── */
  const gen = project.generated;
  const phases = gen.phases || [];
  const company = project.company || {};

  return (
    <SharedPresentationFull
      project={project}
      gen={gen}
      phases={phases}
      company={company}
      calc={calc}
      heroCards={heroCards}
      configOpen={configOpen}
      setConfigOpen={setConfigOpen}
      updateConfig={updateConfig}
      handleSave={handleSave}
      saved={saved}
    />
  );
}

/* ── Full presentation view (extracted for readability) ── */
function SharedPresentationFull({ project, gen, phases, company, calc, heroCards, configOpen, setConfigOpen, updateConfig, handleSave, saved }) {
  const [active, setActive] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const totalSlides = phases.length + 1;
  const isFinal = active === phases.length;
  const currentPhase = isFinal ? null : phases[active];
  const currentColor = isFinal ? C.gold : getPhaseColor(currentPhase);
  const enabledPhases = useMemo(() => (project?.phases || []).filter(p => p.enabled), [project?.phases]);
  const currentPhaseKey = !isFinal && enabledPhases[active] ? enabledPhases[active].key : null;
  const liveKpis = currentPhaseKey && calc ? getPhaseCalcItems(currentPhaseKey, calc) : null;
  const sliderPct = totalSlides > 1 ? (active / (totalSlides - 1)) * 100 : 0;

  // Keyboard navigation
  useEffect(() => {
    if (showIntro) return;
    const handle = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setActive(prev => Math.min(prev + 1, phases.length)); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setActive(prev => Math.max(prev - 1, 0)); }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [showIntro, phases.length]);

  /* ── Intro ── */
  if (showIntro) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: `radial-gradient(ellipse at center, ${C.navy} 0%, ${C.navyDeep} 100%)`,
        textAlign: "center", padding: "2rem", color: C.warmWhite,
      }}>
        <div style={{ fontFamily: F, fontSize: "0.7rem", letterSpacing: "5px", textTransform: "uppercase", fontWeight: 700, color: C.gold, marginBottom: "1.5rem" }}>
          {project.consultant?.company || "PITCHPILOT"}
        </div>
        <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)", fontWeight: 400, marginBottom: "0.5rem", maxWidth: 700 }}>
          {gen.intro?.headline || `Erstellt für ${company.name}`}
        </h1>
        <div style={{ fontSize: "1.1rem", color: C.softGray, marginBottom: "0.5rem" }}>
          {gen.intro?.subtitle || "Phasenkonzept zur Energietransformation"}
        </div>
        <div style={{ fontStyle: "italic", color: C.gold, fontSize: "0.9rem", marginBottom: "2.5rem" }}>
          {gen.intro?.tagline || ""}
        </div>

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
          ...S.pillBtn, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
          color: C.navyDeep, padding: "0.75rem 2.5rem", fontSize: "0.8rem", border: "none",
          boxShadow: `0 4px 25px ${C.gold}40`,
        }}>
          Konzept entdecken <Icon name="arrowRight" size={16} />
        </button>

        {calc && (
          <div style={{ marginTop: "3rem", display: "flex", gap: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { label: "Investition", value: fmtEuro(calc.investGesamt), color: C.gold },
              { label: "Autarkie", value: `${fmtNum(calc.autarkie)}%`, color: C.greenLight },
              { label: "CO₂", value: `${fmtNum(calc.co2Gesamt)} t/a`, color: C.greenLight },
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

  /* ── Main slide view ── */
  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(180deg, ${C.navyDeep} 0%, ${C.navy} 50%, ${C.navyDeep} 100%)`,
      color: C.warmWhite,
    }}>
      {/* Header */}
      <div style={{ padding: "2rem 2rem 1rem", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontFamily: F, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "4px", fontWeight: 700, color: C.gold }}>
            {(company.name || "").toUpperCase()}
          </span>
          <span style={{ width: 40, height: 1, background: C.gold, display: "inline-block" }} />
          <span style={{ fontFamily: F, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "2px", color: C.softGray }}>
            Energietransformation
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
          <h1 style={{
            fontSize: "clamp(1.5rem, 4vw, 2.4rem)", fontWeight: 700, margin: "0.6rem 0 0", lineHeight: 1.2,
            background: `linear-gradient(135deg, ${C.warmWhite} 0%, ${C.goldLight} 100%)`,
            backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Phasenkonzept zur Energietransformation
          </h1>
          <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.6rem" }}>
            <button onClick={() => setConfigOpen(o => !o)} style={{
              ...S.pillBtn, padding: "0.3rem 0.7rem",
              background: configOpen ? `${C.gold}20` : "rgba(255,255,255,0.06)",
              border: `1px solid ${configOpen ? `${C.gold}40` : "rgba(255,255,255,0.12)"}`,
              color: configOpen ? C.gold : C.softGray,
            }}>
              <Icon name="chart" size={12} /> Kalkulation
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: "1rem 2rem 0.5rem", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.5rem", padding: "0 0.5rem" }}>
          {[...phases, { num: "★", title: "Ergebnis", icon: "sparkle", color: "gold" }].map((p, i) => {
            const isActive = i === active;
            return (
              <button key={i} onClick={() => setActive(i)} style={{
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
        <div style={{ position: "relative", margin: "0 0.5rem", cursor: "pointer" }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setActive(Math.round(pct * (totalSlides - 1)));
          }}>
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)" }}>
            <div style={{
              position: "absolute", left: 0, top: 0, height: 6, borderRadius: 3,
              width: `${sliderPct}%`, background: `linear-gradient(90deg, ${C.gold}, ${C.greenLight})`,
              transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            }} />
          </div>
          <div style={{
            position: "absolute", left: `${sliderPct}%`, top: 3, transform: "translate(-50%, -50%)",
            width: 20, height: 20, borderRadius: "50%", background: C.navy,
            border: `2px solid ${C.gold}`, boxShadow: `0 0 12px ${C.gold}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)", zIndex: 2,
          }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "0.6rem", fontWeight: 700, color: C.gold }}>
              {isFinal ? "★" : currentPhase?.num}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 2rem 3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
            background: `linear-gradient(135deg, ${currentColor}30, ${currentColor}10)`,
            border: `2px solid ${currentColor}60`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name={isFinal ? "sparkle" : (currentPhase?.icon || "target")} size={24} color={currentColor} />
          </div>
          <div>
            <div style={{ fontFamily: F, fontSize: "0.75rem", letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700, color: C.gold, marginBottom: "0.2rem" }}>
              {isFinal ? "Gesamtergebnis" : `Phase ${currentPhase?.num} · ${currentPhase?.title}`}
            </div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)", fontWeight: 700, margin: 0, lineHeight: 1.15, color: C.warmWhite }}>
              {isFinal ? "Ergebnis & Wirtschaftlichkeit" : currentPhase?.title}
            </h2>
          </div>
        </div>

        {!isFinal && currentPhase?.headline && (
          <div style={{ borderLeft: `3px solid ${C.gold}`, paddingLeft: "1rem", marginBottom: "1rem" }}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)", fontStyle: "italic", color: C.goldLight, margin: 0, lineHeight: 1.5 }}>
              „{currentPhase.headline}"
            </p>
          </div>
        )}

        <div className="pitch-grid" style={{ display: "grid", gridTemplateColumns: "5fr 4fr", gap: "1.25rem", alignItems: "start" }}>
          <div>
            {!isFinal && currentPhase && (
              <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
                <p style={{ fontFamily: F, fontSize: "1.0rem", lineHeight: 1.7, color: "rgba(255,255,255,0.75)", margin: "0 0 0.8rem 0" }}>
                  {currentPhase.description}
                </p>
                {(liveKpis || currentPhase.kpis)?.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, (liveKpis || currentPhase.kpis).length)}, 1fr)`, gap: "0.35rem", marginBottom: "0.7rem" }}>
                    {(liveKpis || currentPhase.kpis).map((k, i) => (
                      <div key={i} style={{ ...S.cardBase, borderLeft: `2px solid ${currentColor}70` }}>
                        <div style={{ ...S.labelSmall, marginBottom: "0.15rem" }}>{k.label}</div>
                        <div style={{ ...S.valueText, color: C.goldLight }}>{k.value}</div>
                      </div>
                    ))}
                  </div>
                )}
                {currentPhase.results?.length > 0 && (
                  <>
                    <div style={{ ...S.sectionHeading, color: C.softGray, marginBottom: "0.35rem" }}>Ergebnisse</div>
                    {currentPhase.results.map((r, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", marginBottom: "0.2rem" }}>
                        <span style={{ color: currentColor, fontSize: "0.7rem", opacity: 0.6, marginTop: "0.15rem" }}>●</span>
                        <span style={{ fontFamily: F, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>{r}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
            {isFinal && calc && (
              <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
                {heroCards?.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${heroCards.length}, 1fr)`, gap: "1rem", marginBottom: "1.5rem" }}>
                    {heroCards.map((card, i) => {
                      const cardColor = card.accent === "green" ? C.greenLight : C.gold;
                      return (
                        <div key={i} style={{
                          background: `linear-gradient(135deg, ${cardColor}15, ${cardColor}08)`,
                          border: `2px solid ${cardColor}40`, borderRadius: "12px", padding: "1.25rem", textAlign: "center",
                        }}>
                          <Icon name={card.icon} size={28} color={cardColor} />
                          <div style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: F, color: cardColor, marginTop: "0.5rem" }}>{card.value}</div>
                          <div style={{ ...S.labelSmall, marginTop: "0.25rem" }}>{card.label}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ ...S.sectionHeading, color: C.gold }}>Ihre Gesamtberechnung</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
                  {[
                    { label: "Gesamtinvest", value: fmtEuro(calc.investGesamt), c: C.gold },
                    { label: "Autarkie", value: `${fmtNum(calc.autarkie)}%`, c: C.greenLight },
                    { label: "Einsparung/a", value: `${fmtEuro(calc.einsparungStandort)}/a`, c: C.greenLight },
                    { label: "Amortisation", value: `${fmtNum(calc.amortisationGesamt, 1)} J.`, c: C.gold },
                  ].map((item, i) => (
                    <div key={i} style={{ ...S.cardBase, textAlign: "center", padding: "0.6rem 0.4rem" }}>
                      <div style={{ ...S.labelSmall, fontSize: "0.55rem" }}>{item.label}</div>
                      <div style={{ fontFamily: F, fontSize: "0.95rem", fontWeight: 700, color: item.c, marginTop: "0.15rem" }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{ position: "sticky", top: 80 }}>
            <Suspense fallback={<div style={{ width: "100%", aspectRatio: "400/320", borderRadius: 14, background: "rgba(27,42,74,0.75)" }} />}>
              <PhaseVisual
                phaseNum={isFinal ? "∑" : (currentPhase?.num || "I")}
                score={isFinal ? (calc?.autarkie || 0) : (currentPhase?.independenceScore ?? calc?.autarkie ?? 0)}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "1rem 2rem", borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem",
        fontFamily: F, fontSize: "0.75rem", color: C.softGray,
      }}>
        <span>{company.name} · {company.city || ""}</span>
        <span style={{ fontStyle: "italic" }}>
          {project.consultant ? `${project.consultant.name} · ${project.consultant.company}` : "PitchPilot"}
        </span>
      </div>

      {/* Config sidebar */}
      {configOpen && (
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "min(380px, 85vw)", zIndex: 9000,
          background: "rgba(15,26,46,0.98)", backdropFilter: "blur(12px)",
          borderLeft: `1px solid ${C.gold}20`, overflowY: "auto",
          animation: "slideInRight 0.3s ease",
        }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${C.gold}20`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: F, fontSize: "1rem", fontWeight: 700, color: C.gold }}>Kalkulation anpassen</div>
            <button onClick={() => setConfigOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <Icon name="close" size={14} color="#888" />
            </button>
          </div>
          <div style={{ padding: "1rem 1.25rem" }}>
            {CONFIG_GROUPS.map(group => (
              <div key={group.title} style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontFamily: F, fontSize: "0.62rem", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700, color: C.gold, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem", paddingBottom: "0.3rem", borderBottom: `1px solid ${C.gold}15` }}>
                  <Icon name={group.icon} size={12} color={C.gold} /> {group.title}
                </div>
                {group.sliders.map(s => (
                  <ConfigSlider key={s.path.join(".")} label={s.label} value={getVal(project, s.path) ?? 0}
                    min={s.min} max={s.max} step={s.step} unit={s.unit} dec={s.dec}
                    onChange={v => updateConfig(s.path, v)}
                  />
                ))}
              </div>
            ))}

            {calc && (
              <div style={{ padding: "0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: `1px solid ${C.gold}15`, marginBottom: "1rem" }}>
                <div style={{ fontFamily: F, fontSize: "0.62rem", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700, color: C.greenLight, marginBottom: "0.5rem" }}>
                  LIVE-ERGEBNIS
                </div>
                {[
                  { label: "Gesamtinvest", value: fmtEuro(calc.investGesamt), color: C.gold },
                  { label: "Autarkie", value: `${fmtNum(calc.autarkie)}%`, color: C.greenLight },
                  { label: "Amortisation", value: `${fmtNum(calc.amortisationGesamt, 1)} J.`, color: C.gold },
                  { label: "Jährl. Ertrag", value: `${fmtEuro(calc.gesamtertrag)}/a`, color: C.greenLight },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.2rem 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <span style={{ fontFamily: F, fontSize: "0.7rem", color: "#999" }}>{item.label}</span>
                    <span style={{ fontFamily: F, fontSize: "0.78rem", fontWeight: 700, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleSave} style={{
              ...S.pillBtn, padding: "0.6rem 1.5rem", width: "100%", justifyContent: "center",
              background: saved ? `${C.greenLight}20` : `${C.gold}20`,
              border: `1px solid ${saved ? `${C.greenLight}40` : `${C.gold}40`}`,
              color: saved ? C.greenLight : C.gold,
            }}>
              <Icon name={saved ? "check" : "download"} size={14} />
              {saved ? "Kalkulation gespeichert!" : "Kalkulation speichern"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @media (max-width: 768px) { .pitch-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
