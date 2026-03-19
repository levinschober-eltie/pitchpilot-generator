import Icon from "./Icons";

const SLIDERS = [
  { key: "stromverbrauch", label: "Jahresstromverbrauch", unit: "MWh/a", min: 500, max: 100000, step: 500 },
  { key: "gasverbrauch", label: "Jahresgasverbrauch", unit: "MWh/a", min: 0, max: 50000, step: 500 },
  { key: "strompreis", label: "Strompreis", unit: "ct/kWh", min: 10, max: 40, step: 0.5 },
  { key: "gaspreis", label: "Gaspreis", unit: "ct/kWh", min: 3, max: 15, step: 0.5 },
  { key: "peakLoad", label: "Spitzenlast", unit: "kW", min: 100, max: 20000, step: 100 },
  { key: "existingPV", label: "Bestehende PV", unit: "MWp", min: 0, max: 10, step: 0.1 },
];

function fmtVal(val, key) {
  if (key === "strompreis" || key === "gaspreis" || key === "existingPV") {
    return Number(val).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  return Number(val).toLocaleString("de-DE");
}

export default function EnergyStep({ data, onChange }) {
  const d = data || {};
  const set = (key, value) => onChange({ [key]: value });

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>
        <Icon name="bolt" size={22} color="#D4A843" /> Energieprofil
      </h2>
      <p style={{ color: "var(--soft-gray)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Aktuelle Energieverbräuche und -kosten des Standorts.
      </p>

      {SLIDERS.map((s) => (
        <div className="slider-row" key={s.key}>
          <label>{s.label}</label>
          <input
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={d[s.key] ?? s.min}
            onChange={(e) => set(s.key, parseFloat(e.target.value))}
          />
          <span className="slider-value">
            {fmtVal(d[s.key] ?? s.min, s.key)} {s.unit}
          </span>
        </div>
      ))}

      <div className="grid-2" style={{ marginTop: "1.5rem" }}>
        <div className="form-group">
          <label>Breitengrad</label>
          <input
            type="number"
            step="0.01"
            value={d.latitude ?? 49.5}
            onChange={(e) => set("latitude", parseFloat(e.target.value))}
            placeholder="49.5"
          />
        </div>
        <div className="form-group">
          <label>Längengrad</label>
          <input
            type="number"
            step="0.01"
            value={d.longitude ?? 11.5}
            onChange={(e) => set("longitude", parseFloat(e.target.value))}
            placeholder="11.5"
          />
        </div>
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--soft-gray)" }}>
        Koordinaten werden für die Solar-Ertragsberechnung und Marktanalyse verwendet.
        Später: automatischer Import aus SolarStudio.
      </p>
    </div>
  );
}
