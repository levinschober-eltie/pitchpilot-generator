import { useState, useMemo, useRef, useCallback, startTransition } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProject } from "../store";
import { calculateAll, fmtEuro, fmtNum } from "../calcEngine";
import { C } from "../colors";
import Icon from "./Icons";

/* ── Style Constants (extracted for GC) ── */
const S = {
  labelSmall: { fontFamily: "Calibri, sans-serif", fontSize: "0.7rem", letterSpacing: "0.5px", textTransform: "uppercase", color: "#B0B0A6" },
  labelTiny: { fontFamily: "Calibri, sans-serif", fontSize: "0.7rem", letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700 },
  valueText: { fontFamily: "Calibri, sans-serif", fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.1 },
  cardBase: { borderRadius: "7px", padding: "0.45rem 0.5rem", background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))" },
  sectionHeading: { fontFamily: "Calibri, sans-serif", fontSize: "0.7rem", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem" },
  flexCenter: { display: "flex", alignItems: "center", justifyContent: "center" },
  pillBtn: { borderRadius: "2rem", fontFamily: "Calibri, sans-serif", fontSize: "0.7rem", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", transition: "all 0.3s", whiteSpace: "nowrap" },
};

const COLOR_MAP = { gold: C.gold, green: C.green, navy: C.navyLight };

function getPhaseColor(phase) {
  return COLOR_MAP[phase?.color] || C.gold;
}

/* ── Independence Score Ring ── */
function ScoreRing({ score, color }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" aria-hidden="true">
      <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle
        cx="45" cy="45" r={r} fill="none"
        stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        transform="rotate(-90 45 45)"
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }}
      />
      <text x="45" y="42" textAnchor="middle" fill={color} style={{ fontFamily: "Calibri, sans-serif", fontSize: "1.3rem", fontWeight: 700 }}>
        {pct}%
      </text>
      <text x="45" y="56" textAnchor="middle" fill="#B0B0A6" style={{ fontFamily: "Calibri, sans-serif", fontSize: "0.45rem", letterSpacing: "1px", textTransform: "uppercase" }}>
        Autarkie
      </text>
    </svg>
  );
}

/* ── KPI Card ── */
function KPICard({ label, value, color }) {
  return (
    <div style={{ ...S.cardBase, border: `1px solid ${color}22` }}>
      <div style={{ ...S.labelSmall, fontSize: "0.6rem", marginBottom: "0.15rem" }}>{label}</div>
      <div style={{ ...S.valueText, color }}>{value}</div>
    </div>
  );
}

/* ── Highlight Card ── */
function HighlightCard({ icon, title, text, color }) {
  return (
    <div style={{ ...S.cardBase, padding: "0.6rem", border: `1px solid ${color}15` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
        <Icon name={icon} size={16} color={color} />
        <span style={{ fontFamily: "Calibri, sans-serif", fontSize: "0.8rem", fontWeight: 700, color }}>{title}</span>
      </div>
      <div style={{ fontFamily: "Calibri, sans-serif", fontSize: "0.75rem", color: "#B0B0A6", lineHeight: 1.4 }}>{text}</div>
    </div>
  );
}

/* ── Phase Content ── */
function PhaseContent({ phase, color }) {
  if (!phase) return null;

  return (
    <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
      {/* Headline */}
      <div style={{ fontStyle: "italic", color: "#B0B0A6", fontSize: "0.9rem", marginBottom: "0.75rem", borderLeft: `3px solid ${color}`, paddingLeft: "0.75rem" }}>
        {phase.headline}
      </div>

      {/* Description */}
      <p style={{ fontFamily: "Calibri, sans-serif", fontSize: "0.85rem", lineHeight: 1.7, color: C.warmWhite, marginBottom: "1.25rem" }}>
        {phase.description}
      </p>

      {/* KPIs */}
      {phase.kpis?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, phase.kpis.length)}, 1fr)`, gap: "0.5rem", marginBottom: "1.25rem" }}>
          {phase.kpis.map((k, i) => <KPICard key={i} label={k.label} value={k.value} color={color} />)}
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
          <ul style={{ fontFamily: "Calibri, sans-serif", fontSize: "0.8rem", color: "#B0B0A6", paddingLeft: "1.2rem", lineHeight: 1.8 }}>
            {phase.results.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </>
      )}

      {/* Investment */}
      {phase.investTotal && (
        <div style={{ marginTop: "1rem", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ ...S.labelSmall }}>Investition</span>
          <span style={{ ...S.valueText, color }}>{phase.investTotal}</span>
        </div>
      )}
    </div>
  );
}

/* ── Final Summary ── */
function FinalSummary({ summary, calc, color }) {
  if (!summary) return null;

  return (
    <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
      <div style={{ fontStyle: "italic", color: "#B0B0A6", fontSize: "0.9rem", marginBottom: "1.5rem", borderLeft: `3px solid ${color}`, paddingLeft: "0.75rem" }}>
        {summary.headline}
      </div>

      {/* Hero Cards */}
      {summary.heroCards?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${summary.heroCards.length}, 1fr)`, gap: "1rem", marginBottom: "1.5rem" }}>
          {summary.heroCards.map((card, i) => {
            const cardColor = card.accent === "green" ? C.greenLight : C.gold;
            return (
              <div key={i} style={{
                background: `linear-gradient(135deg, ${cardColor}15, ${cardColor}08)`,
                border: `2px solid ${cardColor}40`,
                borderRadius: "12px",
                padding: "1.25rem",
                textAlign: "center",
              }}>
                <Icon name={card.icon} size={28} color={cardColor} />
                <div style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: "Calibri, sans-serif", color: cardColor, marginTop: "0.5rem" }}>
                  {card.value}
                </div>
                <div style={{ ...S.labelSmall, marginTop: "0.25rem" }}>{card.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
        <div className="card" style={{ textAlign: "center", background: "rgba(255,255,255,0.03)" }}>
          <div style={S.labelSmall}>Gesamtinvestition</div>
          <div style={{ ...S.valueText, color: C.gold, fontSize: "1.2rem", marginTop: "0.25rem" }}>
            {summary.investTotal || fmtEuro(calc.investGesamt)}
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", background: "rgba(255,255,255,0.03)" }}>
          <div style={S.labelSmall}>Autarkiegrad</div>
          <div style={{ ...S.valueText, color: C.greenLight, fontSize: "1.2rem", marginTop: "0.25rem" }}>
            {summary.autarkie || `${fmtNum(calc.autarkie)}%`}
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", background: "rgba(255,255,255,0.03)" }}>
          <div style={S.labelSmall}>Amortisation</div>
          <div style={{ ...S.valueText, color: C.gold, fontSize: "1.2rem", marginTop: "0.25rem" }}>
            {summary.amortisation || `${fmtNum(calc.amortisation, 1)} Jahre`}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Presentation Renderer ── */
export default function PresentationRenderer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = useMemo(() => getProject(id), [id]);
  const [active, setActive] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const contentRef = useRef(null);

  const calc = useMemo(() => project ? calculateAll(project) : null, [project]);

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
  const totalSlides = phases.length + 1; // +1 for final summary
  const isFinal = active === phases.length;
  const currentPhase = isFinal ? null : phases[active];
  const currentColor = isFinal ? C.gold : getPhaseColor(currentPhase);
  const company = project.company || {};

  const handleSetActive = useCallback((idx) => {
    startTransition(() => setActive(idx));
  }, []);

  /* ── Intro Screen ── */
  if (showIntro) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(ellipse at center, ${C.navy} 0%, ${C.navyDeep} 100%)`,
        textAlign: "center",
        padding: "2rem",
      }}>
        <div style={{ ...S.labelTiny, color: C.gold, marginBottom: "1.5rem", letterSpacing: "5px" }}>
          PITCHPILOT
        </div>
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
              padding: "0.3rem 0.75rem",
              borderRadius: "2rem",
              border: `1px solid ${getPhaseColor(p)}50`,
              background: `${getPhaseColor(p)}10`,
              color: getPhaseColor(p),
              fontFamily: "Calibri, sans-serif",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "1px",
            }}>
              {p.num} — {p.title}
            </span>
          ))}
        </div>

        <button
          onClick={() => setShowIntro(false)}
          style={{
            ...S.pillBtn,
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
            color: C.navyDeep,
            padding: "0.75rem 2.5rem",
            fontSize: "0.8rem",
            border: "none",
            boxShadow: `0 4px 25px ${C.gold}40`,
          }}
        >
          Konzept entdecken
          <Icon name="arrowRight" size={16} />
        </button>
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
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: `${C.navyDeep}ee`,
        backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${currentColor}20`,
        padding: "0.5rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ ...S.labelTiny, color: C.gold, fontSize: "0.65rem", letterSpacing: "3px" }}>PITCHPILOT</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
          <span style={{ fontFamily: "Calibri, sans-serif", fontSize: "0.8rem", color: C.softGray }}>
            {company.name}
          </span>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(`/edit/${id}`)}
          style={{ fontSize: "0.65rem" }}
        >
          <Icon name="settings" size={12} /> Bearbeiten
        </button>
      </div>

      {/* Content area */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
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
            <div style={{ ...S.labelSmall, marginLeft: "3.25rem", marginTop: "0.15rem", color: currentColor }}>
              {currentPhase.months}
            </div>
          )}
        </div>

        {/* Grid: Content + Score Ring */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "2rem", alignItems: "start" }}>
          <div ref={contentRef}>
            {isFinal ? (
              <FinalSummary summary={gen.finalSummary} calc={calc} color={currentColor} />
            ) : (
              <PhaseContent phase={currentPhase} color={currentColor} />
            )}
          </div>
          <div style={{ textAlign: "center", position: "sticky", top: 100 }}>
            <ScoreRing
              score={isFinal ? calc?.autarkie : currentPhase?.independenceScore}
              color={currentColor}
            />
          </div>
        </div>
      </div>

      {/* Timeline navigation */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: `${C.navyDeep}f5`,
        backdropFilter: "blur(10px)",
        borderTop: `1px solid ${currentColor}20`,
        padding: "0.75rem 1.5rem",
        zIndex: 50,
      }}>
        {/* Phase buttons */}
        <div role="tablist" aria-label="Phasen-Navigation" style={{ display: "flex", justifyContent: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          {phases.map((p, i) => {
            const phColor = getPhaseColor(p);
            const isActive = i === active;
            return (
              <button
                key={i}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSetActive(i)}
                style={{
                  ...S.pillBtn,
                  background: isActive ? `${phColor}25` : "rgba(255,255,255,0.04)",
                  color: isActive ? phColor : C.softGray,
                  border: `1px solid ${isActive ? phColor : "transparent"}`,
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.65rem",
                }}
              >
                {p.num}
                <span style={{ display: isActive ? "inline" : "none" }}>{p.title}</span>
              </button>
            );
          })}
          <button
            role="tab"
            aria-selected={isFinal}
            onClick={() => handleSetActive(phases.length)}
            style={{
              ...S.pillBtn,
              background: isFinal ? `${C.gold}25` : "rgba(255,255,255,0.04)",
              color: isFinal ? C.gold : C.softGray,
              border: `1px solid ${isFinal ? C.gold : "transparent"}`,
              padding: "0.35rem 0.75rem",
              fontSize: "0.65rem",
            }}
          >
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
        @media (max-width: 768px) {
          .pitch-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
