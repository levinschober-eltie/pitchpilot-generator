import { useState, useRef } from "react";
import { parseLastgangCSV } from "../calcEngine";
import Icon from "./Icons";

const SLIDERS = [
  { key: "stromverbrauch", label: "Jahresstromverbrauch", unit: "MWh/a", min: 500, max: 100000, step: 500 },
  { key: "gasverbrauch", label: "Jahresgasverbrauch", unit: "MWh/a", min: 0, max: 50000, step: 500 },
  { key: "strompreis", label: "Strompreis (netto)", unit: "ct/kWh", min: 8, max: 40, step: 0.5 },
  { key: "gaspreis", label: "Gaspreis (netto)", unit: "ct/kWh", min: 2, max: 18, step: 0.5 },
  { key: "peakLoad", label: "Spitzenlast", unit: "kW", min: 100, max: 20000, step: 100 },
  { key: "existingPV", label: "Bestehende PV-Anlagen", unit: "MWp", min: 0, max: 10, step: 0.1 },
];

function fmtVal(val, key) {
  if (["strompreis", "gaspreis", "existingPV"].includes(key)) {
    return Number(val).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  return Number(val).toLocaleString("de-DE");
}

export default function EnergyStep({ data, onChange }) {
  const d = data || {};
  const set = (key, value) => onChange({ [key]: value });
  const [csvResult, setCsvResult] = useState(null);
  const [csvError, setCsvError] = useState(null);
  const fileRef = useRef(null);

  const handleCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setCsvError("Datei zu groß (max. 50 MB)");
      return;
    }
    if (!file.name.endsWith(".csv")) {
      setCsvError("Nur .csv Dateien erlaubt");
      return;
    }
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = parseLastgangCSV(ev.target.result);
      if (result) {
        setCsvResult(result);
        onChange({
          stromverbrauch: result.annualMWh,
          peakLoad: result.peakKW,
          lastgangFile: file.name,
        });
      } else {
        setCsvError("CSV konnte nicht geparst werden. Benötigt min. 100 Datenpunkte.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>
        <Icon name="bolt" size={22} color="var(--yellow)" /> Energieprofil
      </h2>
      <p style={{ color: "var(--gray-text)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Aktuelle Energieverbräuche und -kosten des Standorts.
      </p>

      {/* CSV Upload */}
      <div className="card" style={{ marginBottom: "1.5rem", border: "1px dashed rgba(255,206,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Icon name="chart" size={20} color="var(--yellow)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>
              Lastgang-Upload (optional)
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--gray-text)" }}>
              CSV mit 15-min oder Stundenwerten. Stromverbrauch & Spitzenlast werden automatisch erkannt.
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fileRef.current?.click()}
          >
            <Icon name="download" size={12} /> CSV wählen
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleCSV}
            style={{ display: "none" }}
            aria-label="Lastgang CSV hochladen"
          />
        </div>
        {d.lastgangFile && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--green-light)" }}>
            <Icon name="check" size={14} color="var(--green-light)" /> {d.lastgangFile}
            {csvResult && (
              <span style={{ color: "var(--gray-text)", marginLeft: "0.75rem" }}>
                {csvResult.dataPoints.toLocaleString("de-DE")} Datenpunkte · {csvResult.annualMWh.toLocaleString("de-DE")} MWh/a · Peak {csvResult.peakKW.toLocaleString("de-DE")} kW
              </span>
            )}
          </div>
        )}
        {csvError && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--red)" }}>
            {csvError}
          </div>
        )}
      </div>

      {/* Sliders */}
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

      {/* Coordinates */}
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
      <p style={{ fontSize: "0.75rem", color: "var(--gray-text)" }}>
        Koordinaten für Solar-Ertragsberechnung & Marktanalyse. Später: Import aus SolarStudio.
      </p>
    </div>
  );
}
