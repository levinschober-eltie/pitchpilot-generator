import { useMemo } from "react";
import { useTheme } from "../ThemeContext";
import { matchFoerdermittel } from "../data/foerdermittel";
import { fmtEuro } from "../calcEngine";
import Icon from "./Icons";

const TYP_COLORS = {
  Kredit: { bg: "#2980B920", border: "#2980B940", text: "#5DADE2" },
  Zuschuss: { bg: "#27AE6020", border: "#27AE6040", text: "#2ECC71" },
  Pflicht: { bg: "#E74C3C20", border: "#E74C3C40", text: "#E74C3C" },
};

function FoerdermittelCards({ enabledPhaseKeys, investByPhase }) {
  const T = useTheme();

  const matched = useMemo(
    () => matchFoerdermittel(enabledPhaseKeys || [], investByPhase),
    [enabledPhaseKeys, investByPhase]
  );

  const totalEstimated = useMemo(
    () => matched.reduce((sum, p) => sum + (p.estimatedAmount || 0), 0),
    [matched]
  );

  if (!matched.length) return null;

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{
        fontFamily: T.font, fontSize: "0.7rem", letterSpacing: "2px",
        textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem",
        color: T.greenLight || T.green,
      }}>
        Fördermittel & Finanzierung
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.5rem" }}>
        {matched.map((prog) => {
          const typStyle = TYP_COLORS[prog.typ] || TYP_COLORS.Zuschuss;
          return (
            <div key={prog.id} style={{
              borderRadius: "7px",
              padding: "0.7rem 0.6rem",
              background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
              border: `1px solid ${typStyle.border}`,
            }}>
              {/* Header: Icon + Name */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.35rem" }}>
                <Icon name={prog.icon} size={16} color={T.gold} />
                <span style={{
                  fontFamily: T.font, fontSize: "0.78rem", fontWeight: 700,
                  color: T.goldLight || T.gold, lineHeight: 1.2, flex: 1,
                }}>
                  {prog.name}
                </span>
              </div>

              {/* Typ Badge */}
              <div style={{
                display: "inline-block",
                padding: "0.1rem 0.5rem",
                borderRadius: "2rem",
                background: typStyle.bg,
                border: `1px solid ${typStyle.border}`,
                fontFamily: T.font,
                fontSize: "0.6rem",
                fontWeight: 700,
                color: typStyle.text,
                marginBottom: "0.3rem",
              }}>
                {prog.typ}
              </div>

              {/* Details */}
              <div style={{ fontFamily: T.font, fontSize: "0.68rem", color: T.midGray, lineHeight: 1.4 }}>
                {prog.bedingungen}
              </div>

              {/* Foerderquote */}
              {prog.foerderquote && (
                <div style={{
                  fontFamily: T.font, fontSize: "0.68rem", color: T.softGray,
                  marginTop: "0.2rem",
                }}>
                  Förderquote: <span style={{ color: typStyle.text, fontWeight: 600 }}>{prog.foerderquote}%</span>
                  {prog.bonusQuote ? <span> + {prog.bonusQuote}% Bonus</span> : null}
                </div>
              )}

              {/* Zinsvorteil for Kredit */}
              {prog.zinsvorteil && (
                <div style={{
                  fontFamily: T.font, fontSize: "0.68rem", color: T.softGray,
                  marginTop: "0.2rem",
                }}>
                  Zinssatz: <span style={{ color: typStyle.text, fontWeight: 600 }}>{prog.zinsvorteil}</span>
                </div>
              )}

              {/* Estimated Amount */}
              {prog.estimatedAmount != null && prog.estimatedAmount > 0 && (
                <div style={{
                  marginTop: "0.35rem",
                  paddingTop: "0.3rem",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  fontFamily: T.font, fontSize: "0.78rem", fontWeight: 700,
                  color: T.greenLight || T.green,
                }}>
                  ~ {fmtEuro(prog.estimatedAmount)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total */}
      {totalEstimated > 0 && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: "0.6rem", paddingTop: "0.5rem",
          borderTop: `1px solid ${T.green}30`,
        }}>
          <span style={{
            fontFamily: T.font, fontSize: "0.78rem", fontWeight: 700,
            color: T.softGray, letterSpacing: "1px", textTransform: "uppercase",
          }}>
            Geschätzte Förderung gesamt
          </span>
          <span style={{
            fontFamily: T.font, fontSize: "1.05rem", fontWeight: 700,
            color: T.greenLight || T.green,
          }}>
            ~ {fmtEuro(totalEstimated)}
          </span>
        </div>
      )}
    </div>
  );
}

export default FoerdermittelCards;
