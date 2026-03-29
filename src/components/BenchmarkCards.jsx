import { useMemo } from "react";
import { useTheme } from "../ThemeContext";
import { BENCHMARKS } from "../data/industryBenchmarks";
import { fmtNum } from "../calcEngine";
import Icon from "./Icons";

/**
 * Maps CompanyStep industry values (lowercase) to benchmark group keys.
 * CompanyStep uses: produktion, chemie, automotive, lebensmittel, logistik,
 * metall, papier, textil, glas, holz, bau, elektronik, sonstig
 */
const INDUSTRY_TO_GROUP = {
  produktion: "produktion",
  chemie: "produktion",
  automotive: "produktion",
  lebensmittel: "produktion",
  metall: "produktion",
  papier: "produktion",
  textil: "produktion",
  glas: "produktion",
  elektronik: "produktion",
  logistik: "logistik",
  handel: "handel",
  buero: "buero",
  bau: "sonstig",
  holz: "sonstig",
  sonstig: "sonstig",
};

const GROUP_LABELS = {
  produktion: "Produktion",
  logistik: "Logistik",
  handel: "Handel",
  buero: "Büro / Verwaltung",
  sonstig: "Sonstige",
};

function BenchmarkCards({ calc, industry }) {
  const T = useTheme();

  const data = useMemo(() => {
    if (!calc) return null;
    const group = INDUSTRY_TO_GROUP[industry] || "sonstig";
    const bench = BENCHMARKS[group];
    if (!bench) return null;

    const pvErtragKWhProKWp = calc.totalPV > 0
      ? Math.round(calc.pvErzeugung / calc.totalPV)
      : 0;

    const items = [
      {
        icon: "money",
        label: "Amortisation",
        yourValue: `${fmtNum(calc.amortisationGesamt, 1)} J.`,
        benchValue: `${bench.amortisationJahre} J.`,
        // Lower is better for amortization
        delta: bench.amortisationJahre > 0
          ? Math.round(((bench.amortisationJahre - calc.amortisationGesamt) / bench.amortisationJahre) * 100)
          : 0,
        betterWhenPositive: true,
      },
      {
        icon: "leaf",
        label: "CO\u2082-Reduktion",
        yourValue: `${fmtNum(calc.co2Gesamt)} t/a`,
        benchValue: `${bench.co2ReduktionPct}% typ.`,
        delta: (() => {
          // Estimate: how does our CO2 reduction compare to typical %
          // We can't perfectly compare tons to %, so show the benchmark %
          // and let users interpret
          return null;
        })(),
        betterWhenPositive: true,
        showRaw: true,
      },
      {
        icon: "sparkle",
        label: "Autarkie",
        yourValue: `${fmtNum(calc.autarkie)}%`,
        benchValue: `${bench.autarkiePct}%`,
        delta: calc.autarkie - bench.autarkiePct,
        betterWhenPositive: true,
      },
      {
        icon: "chart",
        label: "PV-Ertrag",
        yourValue: pvErtragKWhProKWp > 0 ? `${fmtNum(pvErtragKWhProKWp)} kWh/kWp` : "k.A.",
        benchValue: `${fmtNum(bench.pvErtragKWhProKWp)} kWh/kWp`,
        delta: bench.pvErtragKWhProKWp > 0 && pvErtragKWhProKWp > 0
          ? Math.round(((pvErtragKWhProKWp - bench.pvErtragKWhProKWp) / bench.pvErtragKWhProKWp) * 100)
          : null,
        betterWhenPositive: true,
      },
    ];

    return { items, groupLabel: GROUP_LABELS[group] || group };
  }, [calc, industry]);

  if (!data) return null;

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{
        fontFamily: T.font, fontSize: "0.7rem", letterSpacing: "2px",
        textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem",
        color: T.gold,
      }}>
        Branchen-Benchmark: {data.groupLabel}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
        {data.items.map((item, i) => {
          const isBetter = item.delta != null && item.delta > 0;
          const isWorse = item.delta != null && item.delta < 0;
          const deltaColor = isBetter ? (T.greenLight || T.green) : isWorse ? "#E8A838" : T.softGray;

          return (
            <div key={i} style={{
              borderRadius: "7px",
              padding: "0.6rem 0.5rem",
              background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
              border: `1px solid ${deltaColor}30`,
              textAlign: "center",
            }}>
              <Icon name={item.icon} size={16} color={T.gold} />
              <div style={{
                fontFamily: T.font, fontSize: "0.55rem", letterSpacing: "0.5px",
                textTransform: "uppercase", color: "#B0B0A6", marginTop: "0.3rem", marginBottom: "0.2rem",
              }}>
                {item.label}
              </div>

              {/* Ihr Wert */}
              <div style={{
                fontFamily: T.font, fontSize: "0.9rem", fontWeight: 700,
                color: T.goldLight || T.gold, lineHeight: 1.2,
              }}>
                {item.yourValue}
              </div>
              <div style={{
                fontFamily: T.font, fontSize: "0.6rem", color: "#888", marginTop: "0.15rem",
              }}>
                Ihr Wert
              </div>

              {/* Branchenwert */}
              <div style={{
                fontFamily: T.font, fontSize: "0.7rem", color: T.midGray,
                marginTop: "0.3rem",
              }}>
                Branche: {item.benchValue}
              </div>

              {/* Delta Badge */}
              {item.delta != null && (
                <div style={{
                  display: "inline-block",
                  marginTop: "0.3rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "2rem",
                  background: `${deltaColor}20`,
                  border: `1px solid ${deltaColor}40`,
                  fontFamily: T.font,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: deltaColor,
                }}>
                  {item.delta > 0 ? "+" : ""}{item.delta}% {isBetter ? "besser" : isWorse ? "schlechter" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BenchmarkCards;
