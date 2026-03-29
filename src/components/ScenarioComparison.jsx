import { useMemo, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../ThemeContext";
import { calculateAll, fmtEuro, fmtNum } from "../calcEngine";
import Icon from "./Icons";

/**
 * Deep-clones a project and sets only specific phases as enabled.
 */
function cloneWithPhases(project, enabledKeys) {
  const cloned = JSON.parse(JSON.stringify(project));
  cloned.phases = (cloned.phases || []).map(p => ({
    ...p,
    enabled: enabledKeys.includes(p.key),
  }));
  return cloned;
}

function ScenarioComparison({ project, onClose }) {
  const T = useTheme();
  const overlayRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Close on click outside
  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) onClose?.();
  }, [onClose]);

  const scenarios = useMemo(() => {
    if (!project) return [];

    // Scenario A: Nur PV
    const projA = cloneWithPhases(project, ["analyse", "pv"]);
    const calcA = calculateAll(projA);

    // Scenario B: PV + Speicher
    const projB = cloneWithPhases(project, ["analyse", "pv", "speicher"]);
    const calcB = calculateAll(projB);

    // Scenario C: Ihr Konzept (all currently enabled phases)
    const calcC = calculateAll(project);
    const enabledC = (project.phases || []).filter(p => p.enabled).map(p => p.key);

    return [
      { label: "Nur PV", icon: "sun", calc: calcA, phases: ["analyse", "pv"] },
      { label: "PV + Speicher", icon: "battery", calc: calcB, phases: ["analyse", "pv", "speicher"] },
      { label: "Ihr Konzept", icon: "sparkle", calc: calcC, phases: enabledC, highlight: true },
    ];
  }, [project]);

  const rows = useMemo(() => {
    if (!scenarios.length) return [];
    return [
      {
        label: "Investition",
        values: scenarios.map(s => fmtEuro(s.calc.investGesamt)),
        rawValues: scenarios.map(s => s.calc.investGesamt),
        bestIdx: null, // Lowest is best
        lowerIsBetter: true,
      },
      {
        label: "Amortisation",
        values: scenarios.map(s => `${fmtNum(s.calc.amortisationGesamt, 1)} J.`),
        rawValues: scenarios.map(s => s.calc.amortisationGesamt),
        lowerIsBetter: true,
      },
      {
        label: "CO\u2082-Einsparung",
        values: scenarios.map(s => `${fmtNum(s.calc.co2Gesamt)} t/a`),
        rawValues: scenarios.map(s => s.calc.co2Gesamt),
        lowerIsBetter: false,
      },
      {
        label: "Autarkie",
        values: scenarios.map(s => `${fmtNum(s.calc.autarkie)}%`),
        rawValues: scenarios.map(s => s.calc.autarkie),
        lowerIsBetter: false,
      },
      {
        label: "Gesamtertrag/a",
        values: scenarios.map(s => `${fmtEuro(s.calc.gesamtertrag)}/a`),
        rawValues: scenarios.map(s => s.calc.gesamtertrag),
        lowerIsBetter: false,
      },
    ].map(row => {
      // Find best index
      const vals = row.rawValues;
      let bestIdx = 0;
      for (let i = 1; i < vals.length; i++) {
        if (row.lowerIsBetter ? vals[i] < vals[bestIdx] : vals[i] > vals[bestIdx]) {
          bestIdx = i;
        }
      }
      return { ...row, bestIdx };
    });
  }, [scenarios]);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "2rem",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div style={{
        background: `linear-gradient(135deg, ${T.navyDeep || T.navy}, ${T.navy})`,
        borderRadius: "16px",
        border: `1px solid ${T.gold}30`,
        padding: "1.5rem 2rem",
        maxWidth: 800,
        width: "100%",
        maxHeight: "85vh",
        overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <div style={{
              fontFamily: T.font, fontSize: "0.65rem", letterSpacing: "2px",
              textTransform: "uppercase", color: T.softGray, marginBottom: "0.2rem",
            }}>
              Szenarien-Vergleich
            </div>
            <div style={{
              fontFamily: T.font, fontSize: "1.15rem", fontWeight: 700,
              color: T.goldLight || T.gold,
            }}>
              3 Ausbaustufen im Vergleich
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "50%",
              width: 32, height: 32,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.softGray,
              transition: "all 0.2s",
            }}
          >
            <Icon name="close" size={14} color={T.softGray} />
          </button>
        </div>

        {/* Scenario Headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "140px repeat(3, 1fr)",
          gap: "0.5rem",
          marginBottom: "0.75rem",
        }}>
          <div /> {/* Label column spacer */}
          {scenarios.map((s, i) => (
            <div key={i} style={{
              textAlign: "center",
              padding: "0.6rem 0.4rem",
              borderRadius: "8px",
              background: s.highlight
                ? `${T.gold}15`
                : "rgba(255,255,255,0.03)",
              border: s.highlight
                ? `2px solid ${T.gold}50`
                : "1px solid rgba(255,255,255,0.06)",
            }}>
              <Icon name={s.icon} size={20} color={s.highlight ? T.gold : T.softGray} />
              <div style={{
                fontFamily: T.font, fontSize: "0.8rem", fontWeight: 700,
                color: s.highlight ? (T.goldLight || T.gold) : T.midGray,
                marginTop: "0.25rem",
              }}>
                {s.label}
              </div>
              <div style={{
                fontFamily: T.font, fontSize: "0.55rem",
                color: T.softGray, marginTop: "0.1rem",
              }}>
                {s.phases.length} Phasen
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Rows */}
        {rows.map((row, ri) => (
          <div key={ri} style={{
            display: "grid",
            gridTemplateColumns: "140px repeat(3, 1fr)",
            gap: "0.5rem",
            padding: "0.4rem 0",
            borderBottom: ri < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
          }}>
            <div style={{
              fontFamily: T.font, fontSize: "0.72rem", color: T.softGray,
              display: "flex", alignItems: "center",
            }}>
              {row.label}
            </div>
            {row.values.map((val, vi) => {
              const isBest = vi === row.bestIdx;
              return (
                <div key={vi} style={{
                  textAlign: "center",
                  padding: "0.35rem 0.25rem",
                  borderRadius: "6px",
                  background: isBest ? `${T.gold}12` : "transparent",
                }}>
                  <span style={{
                    fontFamily: T.font,
                    fontSize: "0.85rem",
                    fontWeight: isBest ? 700 : 500,
                    color: isBest ? T.gold : T.midGray,
                  }}>
                    {val}
                  </span>
                  {isBest && (
                    <div style={{
                      fontFamily: T.font, fontSize: "0.5rem",
                      color: T.gold, fontWeight: 700,
                      letterSpacing: "1px", textTransform: "uppercase",
                      marginTop: "0.1rem",
                    }}>
                      Bester Wert
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ScenarioComparison;
