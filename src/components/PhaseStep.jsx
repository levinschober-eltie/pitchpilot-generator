import { useState, useMemo } from "react";
import { calculateAll, fmtEuro, fmtNum } from "../calcEngine";
import Icon from "./Icons";

const PHASE_ICONS = {
  analyse: "factory", pv: "sun", speicher: "battery",
  waerme: "fire", ladeinfra: "car", bess: "grid",
};

const PHASE_DESCRIPTIONS = {
  analyse: "Bestandsaufnahme, Lastgang-Analyse, Potenzialermittlung",
  pv: "Dach-, Fassaden-, Carport- und Freiflächen-PV",
  speicher: "Batteriespeicher, Peak-Shaving, Energiemanagement",
  waerme: "Wärmepumpen-Kaskade, Pufferspeicher, Prozesswärme",
  ladeinfra: "AC/DC-Ladepunkte, Lastmanagement, Flottenumstellung",
  bess: "Großspeicher für Regelenergie, Arbitrage, Netzdienstleistungen",
};

const PHASE_CONFIGS = {
  pv: [
    { key: "pvDach", label: "PV Dach", unit: "MWp", min: 0, max: 15, step: 0.1 },
    { key: "pvFassade", label: "PV Fassade", unit: "MWp", min: 0, max: 5, step: 0.1 },
    { key: "pvCarport", label: "PV Carport", unit: "MWp", min: 0, max: 5, step: 0.1 },
    { key: "pvFreiflaeche", label: "PV Freifläche", unit: "MWp", min: 0, max: 10, step: 0.1 },
  ],
  speicher: [
    { key: "kapazitaet", label: "Speicherkapazität", unit: "MWh", min: 0.5, max: 30, step: 0.5 },
  ],
  waerme: [
    { key: "wpLeistung", label: "Wärmepumpen-Leistung", unit: "MW", min: 0.5, max: 20, step: 0.5 },
    { key: "pufferspeicher", label: "Pufferspeicher", unit: "m³", min: 10, max: 1000, step: 10 },
  ],
  ladeinfra: [
    { key: "anzahlPKW", label: "PKW-Ladepunkte (AC)", unit: "Stk.", min: 0, max: 200, step: 5 },
    { key: "anzahlLKW", label: "LKW-Ladepunkte (DC)", unit: "Stk.", min: 0, max: 30, step: 1 },
    { key: "kmPKW", label: "Ø Fahrleistung PKW", unit: "km/a", min: 5000, max: 40000, step: 1000 },
    { key: "kmLKW", label: "Ø Fahrleistung LKW", unit: "km/a", min: 10000, max: 120000, step: 5000 },
    { key: "dieselpreis", label: "Dieselpreis", unit: "€/l", min: 1.0, max: 2.5, step: 0.05 },
  ],
  bess: [
    { key: "kapazitaet", label: "BESS Kapazität", unit: "MWh", min: 10, max: 500, step: 10 },
  ],
};

const FINANCE_SLIDERS = [
  { key: "ekAnteil", label: "Eigenkapitalanteil", unit: "%", min: 10, max: 100, step: 5 },
  { key: "kreditZins", label: "Kreditzins", unit: "% p.a.", min: 2, max: 8, step: 0.1 },
  { key: "kreditLaufzeit", label: "Kreditlaufzeit", unit: "Jahre", min: 5, max: 25, step: 1 },
  { key: "tilgungsfrei", label: "Tilgungsfreie Jahre", unit: "Jahre", min: 0, max: 5, step: 1 },
];

function SliderGroup({ sliders, data, onChange }) {
  return sliders.map((s) => (
    <div className="slider-row" key={s.key}>
      <label>{s.label}</label>
      <input
        type="range"
        min={s.min}
        max={s.max}
        step={s.step}
        value={data[s.key] ?? s.min}
        onChange={(e) => onChange({ ...data, [s.key]: parseFloat(e.target.value) })}
      />
      <span className="slider-value">
        {Number(data[s.key] ?? s.min).toLocaleString("de-DE", {
          minimumFractionDigits: s.step < 1 ? (s.step < 0.1 ? 2 : 1) : 0,
          maximumFractionDigits: s.step < 1 ? (s.step < 0.1 ? 2 : 1) : 0,
        })}{" "}
        {s.unit}
      </span>
    </div>
  ));
}

export default function PhaseStep({ project, phases, phaseConfig, finance, onPhasesChange, onConfigChange, onFinanceChange }) {
  const [expandedPhase, setExpandedPhase] = useState(null);

  const calc = useMemo(() => {
    if (!project) return null;
    return calculateAll(project);
  }, [project]);

  const togglePhase = (idx) => {
    const updated = [...phases];
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    onPhasesChange(updated);
  };

  const toggleExpand = (key) => {
    setExpandedPhase(expandedPhase === key ? null : key);
  };

  const investMap = calc ? {
    analyse: calc.investPhase1, pv: calc.investPhase2, speicher: calc.investPhase3,
    waerme: calc.investPhase4, ladeinfra: calc.investPhase5, bess: calc.investPhase6,
  } : {};

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>
        <Icon name="target" size={22} color="#FFCE00" /> Phasen & Konfiguration
      </h2>
      <p style={{ color: "var(--gray-text)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Wähle die Transformationsphasen und konfiguriere die Parameter.
      </p>

      {/* Live KPI bar */}
      {calc && (
        <div className="card" style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "space-between", padding: "0.75rem 1rem" }}>
          {[
            { label: "Investition", value: fmtEuro(calc.investGesamt), color: "#222222" },
            { label: "Einsparung/a", value: fmtEuro(calc.gesamtertrag), color: "#2D8C4E" },
            { label: "Amortisation", value: `${fmtNum(calc.amortisationGesamt, 1)} J.`, color: "#FFCE00" },
            { label: "CO₂", value: `${fmtNum(calc.co2Gesamt)} t/a`, color: "#2D8C4E" },
            { label: "Autarkie", value: `${calc.autarkie}%`, color: "#FFCE00" },
            { label: "EK-Rendite", value: `${fmtNum(calc.ekRendite, 1)}%`, color: "#E6B800" },
            { label: "DSCR", value: `${fmtNum(calc.dscr, 2)}`, color: "#666666" },
          ].map((kpi) => (
            <div key={kpi.label} style={{ textAlign: "center", minWidth: 80 }}>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: kpi.color }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: "0.6rem", color: "var(--gray-text)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                {kpi.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Phase toggles */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
        {phases.map((p, i) => (
          <div key={p.key}>
            <div
              className={`phase-toggle ${p.enabled ? "enabled" : ""}`}
              onClick={() => togglePhase(i)}
            >
              <div className="toggle-switch" />
              <Icon name={PHASE_ICONS[p.key] || "target"} size={20} color={p.enabled ? "#FFCE00" : "#666666"} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                  {["I", "II", "III", "IV", "V", "VI"][i]}. {p.label}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--gray-text)" }}>
                  {PHASE_DESCRIPTIONS[p.key] || ""}
                </div>
              </div>
              {/* Live investment badge */}
              {p.enabled && calc && investMap[p.key] > 0 && (
                <span style={{
                  fontSize: "0.7rem", fontWeight: 700,
                  color: "#222222", background: "rgba(255,206,0,0.15)",
                  padding: "0.2rem 0.5rem", borderRadius: "1rem", whiteSpace: "nowrap",
                }}>
                  {fmtEuro(investMap[p.key])}
                </span>
              )}
              {p.enabled && PHASE_CONFIGS[p.key] && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => { e.stopPropagation(); toggleExpand(p.key); }}
                >
                  <Icon name={expandedPhase === p.key ? "arrowLeft" : "settings"} size={12} />
                  {expandedPhase === p.key ? "Schließen" : "Konfigurieren"}
                </button>
              )}
            </div>

            {expandedPhase === p.key && PHASE_CONFIGS[p.key] && (
              <div className="card" style={{ marginTop: "0.5rem", marginLeft: "3rem" }}>
                <SliderGroup
                  sliders={PHASE_CONFIGS[p.key]}
                  data={phaseConfig[p.key] || {}}
                  onChange={(d) => onConfigChange({ ...phaseConfig, [p.key]: d })}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Finance section */}
      <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Icon name="money" size={18} color="#FFCE00" /> Finanzierung
      </h3>
      <div className="card">
        <SliderGroup
          sliders={FINANCE_SLIDERS}
          data={finance || {}}
          onChange={(d) => onFinanceChange(d)}
        />
        {/* Finance KPIs */}
        {calc && (
          <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {[
              { label: "Eigenkapital", value: fmtEuro(calc.ekBetrag) },
              { label: "Kredit", value: fmtEuro(calc.kreditBetrag) },
              { label: "Annuität", value: `${fmtEuro(calc.annuitaet)}/a` },
              { label: "Gesamtzins", value: fmtEuro(calc.totalZinskosten) },
              { label: "CF nach FK", value: `${fmtEuro(calc.cfNachSchuldendienst)}/a` },
            ].map((item) => (
              <div key={item.label} style={{ fontSize: "0.75rem" }}>
                <span style={{ color: "var(--gray-text)" }}>{item.label}: </span>
                <span style={{ fontWeight: 700, color: "#222222" }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
