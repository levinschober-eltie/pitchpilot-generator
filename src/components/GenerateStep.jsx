import { useState, useRef, useMemo } from "react";
import { calculateAll, fmtEuro, fmtNum } from "../calcEngine";
import { hasApiKey } from "../claudeApi";
import { generatePitchContent, generateFallbackContent } from "../promptTemplates";
import Icon from "./Icons";

export default function GenerateStep({ project, onGenerated, onNavigate }) {
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("auto"); // "auto" | "ai" | "template"
  const abortRef = useRef(null);
  const streamRef = useRef(null);

  const calc = useMemo(() => calculateAll(project), [project]);
  const apiReady = hasApiKey();
  const enabledPhases = (project.phases || []).filter((p) => p.enabled);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setStreamText("");

    const useAI = mode === "ai" || (mode === "auto" && apiReady);

    if (!useAI) {
      // Template-based generation (no API needed)
      try {
        const content = generateFallbackContent(project);
        onGenerated(content);
      } catch (e) {
        setError(e.message);
      }
      setGenerating(false);
      return;
    }

    // AI generation with Claude
    try {
      abortRef.current = new AbortController();
      const content = await generatePitchContent(
        project,
        (chunk) => {
          setStreamText((prev) => prev + chunk);
          if (streamRef.current) {
            streamRef.current.scrollTop = streamRef.current.scrollHeight;
          }
        },
        abortRef.current.signal
      );
      onGenerated(content);
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e.message);
      }
    }
    setGenerating(false);
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setGenerating(false);
  };

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>
        <Icon name="sparkle" size={22} color="#FFCE00" /> Pitch generieren
      </h2>
      <p style={{ color: "var(--gray-text)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Vorschau der berechneten Werte und Generierung der Präsentation.
      </p>

      {/* KPI Preview */}
      <div className="grid-4" style={{ marginBottom: "2rem" }}>
        {[
          { label: "Gesamt-PV", value: `${fmtNum(calc.totalPV, 1)} MWp`, icon: "sun", color: "#2D8C4E" },
          { label: "Gesamtertrag/a", value: fmtEuro(calc.gesamtertrag), icon: "money", color: "#FFCE00" },
          { label: "CO₂-Reduktion", value: `${fmtNum(calc.co2Gesamt)} t/a`, icon: "leaf", color: "#2D8C4E" },
          { label: "Amortisation", value: `${fmtNum(calc.amortisationGesamt, 1)} J.`, icon: "clock", color: "#E6B800" },
          { label: "Investition", value: fmtEuro(calc.investGesamt), icon: "chart", color: "#666666" },
          { label: "Autarkie", value: `${calc.autarkie}%`, icon: "shield", color: "#2D8C4E" },
          { label: "EK-Rendite", value: `${fmtNum(calc.ekRendite, 1)}%`, icon: "money", color: "#E6B800" },
          { label: "DSCR", value: `${fmtNum(calc.dscr, 2)}`, icon: "shield", color: calc.dscr >= 1.2 ? "#2D8C4E" : "#E74C3C" },
          { label: "Annuität", value: `${fmtEuro(calc.annuitaet)}/a`, icon: "money", color: "#666666" },
          { label: "CF nach FK", value: `${fmtEuro(calc.cfNachSchuldendienst)}/a`, icon: "chart", color: calc.cfNachSchuldendienst > 0 ? "#2D8C4E" : "#E74C3C" },
          { label: "Eigenverbrauch", value: `${calc.eigenverbrauchsquote}%`, icon: "bolt", color: "#2D8C4E" },
          { label: "Phasen", value: `${enabledPhases.length}`, icon: "target", color: "#FFCE00" },
        ].map((kpi) => (
          <div key={kpi.label} className="card" style={{ textAlign: "center", padding: "1rem" }}>
            <Icon name={kpi.icon} size={20} color={kpi.color} />
            <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "0.3rem", color: kpi.color }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--gray-text)", letterSpacing: "0.5px", textTransform: "uppercase", marginTop: "0.15rem" }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* Generation mode */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.8rem", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "0.75rem", color: "var(--gray-text)" }}>
          Generierungsmethode
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {[
            { key: "auto", label: apiReady ? "Claude AI (empfohlen)" : "Template (kein API-Key)", icon: apiReady ? "sparkle" : "target" },
            { key: "ai", label: "Claude AI", icon: "sparkle", disabled: !apiReady },
            { key: "template", label: "Template (ohne AI)", icon: "target" },
          ].map((m) => (
            <button
              key={m.key}
              className={`btn ${mode === m.key ? "btn-primary" : "btn-secondary"}`}
              onClick={() => !m.disabled && setMode(m.key)}
              disabled={m.disabled}
              style={{ opacity: m.disabled ? 0.4 : 1 }}
            >
              <Icon name={m.icon} size={14} /> {m.label}
            </button>
          ))}
        </div>
        {!apiReady && (
          <p style={{ fontSize: "0.75rem", color: "var(--yellow)", marginTop: "0.75rem" }}>
            Für AI-Generierung: API-Key unter Einstellungen hinterlegen.
          </p>
        )}
      </div>

      {/* Generate button / Progress */}
      {generating ? (
        <div className="gen-progress">
          <div className="spinner" />
          <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
            Claude generiert den Pitch...
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleCancel}>Abbrechen</button>
          {streamText && (
            <div className="gen-stream" ref={streamRef}>
              {streamText}
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          {error && (
            <div className="card" style={{ background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)", marginBottom: "1rem", textAlign: "left" }}>
              <div style={{ color: "var(--red)", fontSize: "0.85rem" }}>{error}</div>
            </div>
          )}
          <button className="btn btn-primary btn-lg" onClick={handleGenerate}>
            <Icon name="sparkle" size={18} />
            {project.generated ? "Neu generieren" : "Pitch generieren"}
          </button>
        </div>
      )}

      {/* Success state */}
      {project.generated && !generating && (
        <div className="card" style={{ marginTop: "1.5rem", textAlign: "center", background: "rgba(45,140,78,0.06)", border: "1px solid rgba(45,140,78,0.2)" }}>
          <Icon name="check" size={24} color="#2D8C4E" />
          <div style={{ fontWeight: 700, marginTop: "0.5rem", color: "var(--green)" }}>
            Pitch erfolgreich generiert!
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--gray-text)", marginTop: "0.25rem" }}>
            {project.generated.phases?.length || 0} Phasen + Gesamtergebnis
          </div>
          <button className="btn btn-success" style={{ marginTop: "1rem" }} onClick={onNavigate}>
            <Icon name="eye" size={16} /> Präsentation ansehen
          </button>
        </div>
      )}
    </div>
  );
}
