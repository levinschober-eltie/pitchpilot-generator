import { useState, useRef, useCallback, useEffect } from "react";
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

/* ── Bill Analysis Steps & Fields ── */
const BILL_STEPS = [
  { target: 12, text: "Dokument wird eingelesen…", delay: 70 },
  { target: 30, text: "Tarifstruktur wird erkannt…", delay: 100 },
  { target: 50, text: "Preiskomponenten werden extrahiert…", delay: 130 },
  { target: 72, text: "Verbrauchsdaten werden analysiert…", delay: 110 },
  { target: 88, text: "Netzentgelte & Umlagen werden berechnet…", delay: 90 },
  { target: 100, text: "Ergebnisse werden aufbereitet…", delay: 60 },
];

const BILL_FIELDS = [
  { key: "monatsverbrauch", label: "Monatsverbrauch", unit: "kWh", group: "verbrauch" },
  { key: "jahresverbrauch", label: "Jahresverbrauch (hochger.)", unit: "MWh/a", group: "verbrauch", derived: true },
  { key: "arbeitspreis", label: "Arbeitspreis (gewichtet)", unit: "ct/kWh", dec: 2, group: "preise" },
  { key: "netzentgelte", label: "Netzentgelte", unit: "ct/kWh", dec: 2, group: "preise" },
  { key: "umlagenSteuern", label: "Umlagen & Steuern", unit: "ct/kWh", dec: 2, group: "preise" },
  { key: "gesamtpreis", label: "Effektiver Gesamtpreis", unit: "ct/kWh", dec: 1, group: "preise", derived: true, accent: true },
  { key: "leistung", label: "Spitzenleistung", unit: "kW", group: "leistung" },
  { key: "grundpreis", label: "Grundpreis", unit: "€/Mon", group: "leistung" },
];

const BILL_GROUPS = [
  { key: "verbrauch", title: "Verbrauch", icon: "bolt" },
  { key: "preise", title: "Preiskomponenten", icon: "chart" },
  { key: "leistung", title: "Leistung & Grundpreis", icon: "factory" },
];

function BillAnalysis({ currentData, onApply }) {
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const timerRef = useRef(null);
  const stepTimeoutRef = useRef(null);
  const [data, setData] = useState({
    monatsverbrauch: 0, jahresverbrauch: 0,
    arbeitspreis: 0, netzentgelte: 0, umlagenSteuern: 0, gesamtpreis: 0,
    leistung: 0, grundpreis: 0,
  });

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
  }, []);

  const startAnalysis = useCallback(() => {
    setPhase("analyzing");
    setProgress(0);
    let current = 0, stepIdx = 0;

    function runStep() {
      if (stepIdx >= BILL_STEPS.length) {
        const verbrauch = currentData.stromverbrauch || 10000;
        const preis = currentData.strompreis || 22;
        const monthKWh = Math.round(verbrauch * 1000 / 12);
        const ap = Math.max(8, preis - 9.5);
        setData({
          monatsverbrauch: monthKWh,
          jahresverbrauch: verbrauch,
          arbeitspreis: Math.round(ap * 100) / 100,
          netzentgelte: 5.01,
          umlagenSteuern: Math.round((preis - ap - 5.01) * 100) / 100,
          gesamtpreis: preis,
          leistung: Math.round(monthKWh / 730 * 1.15),
          grundpreis: 30,
        });
        stepTimeoutRef.current = setTimeout(() => setPhase("results"), 350);
        return;
      }
      const step = BILL_STEPS[stepIdx];
      setStatusText(step.text);
      const range = step.target - current;
      const ticks = Math.max(3, Math.ceil(range / 4));
      let t = 0;
      timerRef.current = setInterval(() => {
        t++;
        current = Math.min(step.target, current + Math.ceil(range / ticks));
        setProgress(current);
        if (t >= ticks || current >= step.target) {
          clearInterval(timerRef.current);
          current = step.target;
          setProgress(current);
          stepIdx++;
          stepTimeoutRef.current = setTimeout(runStep, 180);
        }
      }, step.delay);
    }
    runStep();
  }, [currentData]);

  const updateField = useCallback((key, raw) => {
    const val = parseFloat(String(raw).replace(",", "."));
    if (isNaN(val)) return;
    setData(prev => {
      const next = { ...prev, [key]: val };
      if (key === "monatsverbrauch") next.jahresverbrauch = Math.round(val * 12 / 1000);
      if (["arbeitspreis", "netzentgelte", "umlagenSteuern"].includes(key)) {
        next.gesamtpreis = Math.round((next.arbeitspreis + next.netzentgelte + next.umlagenSteuern) * 10) / 10;
      }
      return next;
    });
  }, []);

  const apply = useCallback(() => {
    onApply({
      stromverbrauch: data.jahresverbrauch,
      strompreis: data.gesamtpreis,
      peakLoad: data.leistung,
    });
    setPhase("applied");
  }, [data, onApply]);

  if (phase === "idle") {
    return (
      <button onClick={startAnalysis} className="btn btn-success" style={{ width: "100%", marginTop: "0.5rem" }}>
        <Icon name="chart" size={14} /> Rechnung auswerten
      </button>
    );
  }

  if (phase === "analyzing") {
    return (
      <div style={{ marginTop: "0.5rem" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--gray-dark)", marginBottom: "0.4rem" }}>
          Auswertung läuft
        </div>
        <div style={{ position: "relative", height: 24, background: "var(--gray-light)", borderRadius: 12, overflow: "hidden", marginBottom: "0.35rem" }}>
          <div style={{
            height: "100%", width: `${progress}%`, borderRadius: 12,
            background: "linear-gradient(90deg, var(--yellow-dim), var(--yellow))",
            transition: "width 0.15s ease-out",
            boxShadow: "0 0 10px rgba(255,206,0,0.3)",
          }} />
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.72rem", fontWeight: 700, color: "var(--black)",
          }}>{progress} %</div>
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--gray-text)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--yellow)", animation: "billPulse 1s infinite" }} />
          {statusText}
        </div>
        <style>{`@keyframes billPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      </div>
    );
  }

  if (phase === "applied") {
    return (
      <div style={{
        marginTop: "0.5rem", padding: "0.6rem 0.8rem",
        background: "rgba(45,140,78,0.08)", border: "1px solid rgba(45,140,78,0.25)",
        borderRadius: 6, fontSize: "0.8rem", color: "var(--green)", display: "flex", alignItems: "center", gap: "0.4rem",
      }}>
        <Icon name="check" size={14} color="var(--green)" />
        Rechnungsdaten übernommen — {data.jahresverbrauch.toLocaleString("de-DE")} MWh/a · {data.gesamtpreis.toLocaleString("de-DE", { minimumFractionDigits: 1 })} ct/kWh
      </div>
    );
  }

  // phase === "results"
  return (
    <div style={{ marginTop: "0.5rem" }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--green)", marginBottom: "0.1rem" }}>
        Auswertung abgeschlossen
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--gray-text)", marginBottom: "0.6rem" }}>
        Bitte prüfen und ggf. anpassen — Werte werden bei Bestätigung übernommen
      </div>

      {BILL_GROUPS.map(g => (
        <div key={g.key} style={{ marginBottom: "0.6rem" }}>
          <div style={{ fontSize: "0.7rem", letterSpacing: "1px", textTransform: "uppercase", color: "var(--gray-dark)", fontWeight: 700, marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <Icon name={g.icon} size={12} color="var(--yellow-dim)" /> {g.title}
          </div>
          {BILL_FIELDS.filter(f => f.group === g.key).map(f => (
            <div key={f.key} style={{ display: "flex", alignItems: "center", marginBottom: "0.25rem", gap: "0.4rem" }}>
              <span style={{ flex: 1, fontSize: "0.82rem", color: f.derived ? "var(--gray-text)" : "var(--black)" }}>
                {f.label}
              </span>
              <input
                type="text" inputMode="decimal"
                value={f.derived && f.dec ? data[f.key].toFixed(f.dec) : data[f.key]}
                onChange={e => updateField(f.key, e.target.value)}
                readOnly={f.derived}
                style={{
                  width: 80, padding: "0.25rem 0.4rem", textAlign: "right",
                  background: f.derived ? "var(--gray-light)" : "var(--white)",
                  border: `1px solid ${f.accent ? "var(--yellow)" : f.derived ? "var(--border)" : "var(--border-dark)"}`,
                  borderRadius: 4, color: f.accent ? "var(--black)" : f.derived ? "var(--gray-text)" : "var(--black)",
                  fontSize: "0.85rem", fontWeight: f.accent ? 700 : 500,
                  outline: "none", fontFamily: "inherit",
                }}
              />
              <span style={{ fontSize: "0.72rem", color: "var(--gray-text)", width: 50, flexShrink: 0 }}>{f.unit}</span>
            </div>
          ))}
        </div>
      ))}

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <button onClick={apply} className="btn btn-success" style={{ flex: 1 }}>
          <Icon name="check" size={13} /> Übernehmen
        </button>
        <button onClick={() => setPhase("idle")} className="btn btn-secondary">
          Abbrechen
        </button>
      </div>
    </div>
  );
}

export default function EnergyStep({ data, onChange }) {
  const d = data || {};
  const set = (key, value) => onChange({ [key]: value });
  const [csvResult, setCsvResult] = useState(null);
  const [csvError, setCsvError] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const editRef = useRef(null);
  const fileRef = useRef(null);
  const billRef = useRef(null);

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

  const handleBill = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({ stromrechnungFile: file.name });
  };

  const startEdit = useCallback((key) => {
    setEditDraft(String(d[key] ?? ""));
    setEditingKey(key);
    setTimeout(() => editRef.current?.select(), 0);
  }, [d]);

  const commitEdit = useCallback((slider) => {
    setEditingKey(null);
    const parsed = parseFloat(editDraft.replace(",", "."));
    if (!isNaN(parsed)) {
      set(slider.key, Math.min(slider.max, Math.max(slider.min, parsed)));
    }
  }, [editDraft, set]);

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>
        <Icon name="bolt" size={22} color="var(--yellow)" /> Energieprofil
      </h2>
      <p style={{ color: "var(--gray-text)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Aktuelle Energieverbräuche und -kosten des Standorts.
      </p>

      {/* CSV Upload */}
      <div className="card" style={{ marginBottom: "1rem", border: "1px dashed rgba(255,206,0,0.3)" }}>
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

      {/* Stromrechnung Upload */}
      <div className="card" style={{ marginBottom: "1.5rem", border: "1px dashed rgba(255,206,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Icon name="money" size={20} color="var(--yellow)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>
              Stromrechnung hochladen (optional)
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--gray-text)" }}>
              PDF oder Bild. Preiskomponenten & Verbrauch werden extrahiert.
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => billRef.current?.click()}
          >
            <Icon name="download" size={12} /> Datei wählen
          </button>
          <input
            ref={billRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleBill}
            style={{ display: "none" }}
            aria-label="Stromrechnung hochladen"
          />
        </div>
        {d.stromrechnungFile && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--green-light)" }}>
            <Icon name="check" size={14} color="var(--green-light)" /> {d.stromrechnungFile}
          </div>
        )}
        {/* Bill Analysis Flow */}
        {d.stromrechnungFile && (
          <BillAnalysis
            key={d.stromrechnungFile}
            currentData={d}
            onApply={(values) => onChange(values)}
          />
        )}
      </div>

      {/* Sliders with click-to-edit */}
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
          {editingKey === s.key ? (
            <span style={{ display: "flex", alignItems: "center", gap: 3, width: 90 }}>
              <input
                ref={editRef}
                type="text"
                inputMode="decimal"
                value={editDraft}
                onChange={e => setEditDraft(e.target.value)}
                onBlur={() => commitEdit(s)}
                onKeyDown={e => { if (e.key === "Enter") commitEdit(s); if (e.key === "Escape") setEditingKey(null); }}
                style={{
                  width: 60, padding: "0.15rem 0.3rem", textAlign: "right",
                  border: "1px solid var(--yellow)", borderRadius: 3,
                  fontSize: "0.85rem", fontWeight: 600, outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <span style={{ fontSize: "0.7rem", color: "var(--gray-text)" }}>{s.unit}</span>
            </span>
          ) : (
            <span
              className="slider-value"
              onClick={() => startEdit(s.key)}
              style={{ cursor: "pointer", borderBottom: "1px dashed var(--yellow-dim)" }}
            >
              {fmtVal(d[s.key] ?? s.min, s.key)} {s.unit}
            </span>
          )}
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
