import { useState } from "react";
import Icon from "./Icons";

const PHASE_ICONS = {
  analyse: "factory",
  pv: "sun",
  speicher: "battery",
  waerme: "fire",
  ladeinfra: "car",
  bess: "grid",
};

const PHASE_DESCRIPTIONS = {
  analyse: "Bestandsaufnahme, Lastgang-Analyse, Potenzialermittlung",
  pv: "Dach-, Fassaden- und Carport-PV-Anlagen",
  speicher: "Batteriespeicher und Energiemanagementsystem",
  waerme: "Wärmepumpen, Prozesswärme-Dekarbonisierung",
  ladeinfra: "E-Fahrzeug Ladeinfrastruktur für PKW und LKW",
  bess: "Großspeicher für Netzdienstleistungen und Arbitrage",
};

const PHASE_CONFIGS = {
  pv: [
    { key: "pvDach", label: "PV Dach", unit: "MWp", min: 0, max: 15, step: 0.1 },
    { key: "pvFassade", label: "PV Fassade", unit: "MWp", min: 0, max: 5, step: 0.1 },
    { key: "pvCarport", label: "PV Carport", unit: "MWp", min: 0, max: 5, step: 0.1 },
  ],
  speicher: [
    { key: "kapazitaet", label: "Speicherkapazität", unit: "MWh", min: 0.5, max: 30, step: 0.5 },
  ],
  waerme: [
    { key: "wpLeistung", label: "Wärmepumpen-Leistung", unit: "MW", min: 0.5, max: 20, step: 0.5 },
    { key: "pufferspeicher", label: "Pufferspeicher", unit: "m³", min: 10, max: 1000, step: 10 },
  ],
  ladeinfra: [
    { key: "anzahlPKW", label: "PKW-Ladepunkte", unit: "Stk.", min: 0, max: 200, step: 1 },
    { key: "anzahlLKW", label: "LKW-Ladepunkte", unit: "Stk.", min: 0, max: 30, step: 1 },
  ],
  bess: [
    { key: "kapazitaet", label: "BESS Kapazität", unit: "MWh", min: 10, max: 500, step: 10 },
  ],
};

const FINANCE_SLIDERS = [
  { key: "ekAnteil", label: "Eigenkapitalanteil", unit: "%", min: 10, max: 100, step: 5 },
  { key: "kreditZins", label: "Kreditzins", unit: "%", min: 2, max: 8, step: 0.25 },
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
          minimumFractionDigits: s.step < 1 ? 1 : 0,
          maximumFractionDigits: s.step < 1 ? 1 : 0,
        })}{" "}
        {s.unit}
      </span>
    </div>
  ));
}

export default function PhaseStep({ phases, phaseConfig, finance, onPhasesChange, onConfigChange, onFinanceChange }) {
  const [expandedPhase, setExpandedPhase] = useState(null);

  const togglePhase = (idx) => {
    const updated = [...phases];
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    onPhasesChange(updated);
  };

  const toggleExpand = (key) => {
    setExpandedPhase(expandedPhase === key ? null : key);
  };

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>
        <Icon name="target" size={22} color="#D4A843" /> Phasen & Konfiguration
      </h2>
      <p style={{ color: "var(--soft-gray)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Wähle die Transformationsphasen und konfiguriere die Parameter.
      </p>

      {/* Phase toggles */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
        {phases.map((p, i) => (
          <div key={p.key}>
            <div
              className={`phase-toggle ${p.enabled ? "enabled" : ""}`}
              onClick={() => togglePhase(i)}
            >
              <div className="toggle-switch" />
              <Icon name={PHASE_ICONS[p.key] || "target"} size={20} color={p.enabled ? "#D4A843" : "#B0B0A6"} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Calibri, sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>
                  {["I", "II", "III", "IV", "V", "VI"][i]}. {p.label}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--soft-gray)", fontFamily: "Calibri, sans-serif" }}>
                  {PHASE_DESCRIPTIONS[p.key] || ""}
                </div>
              </div>
              {p.enabled && PHASE_CONFIGS[p.key] && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(p.key);
                  }}
                >
                  <Icon name={expandedPhase === p.key ? "arrowLeft" : "settings"} size={12} />
                  {expandedPhase === p.key ? "Schließen" : "Konfigurieren"}
                </button>
              )}
            </div>

            {/* Phase config sliders */}
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
        <Icon name="money" size={18} color="#D4A843" /> Finanzierung
      </h3>
      <div className="card">
        <SliderGroup
          sliders={FINANCE_SLIDERS}
          data={finance || {}}
          onChange={(d) => onFinanceChange(d)}
        />
      </div>
    </div>
  );
}
