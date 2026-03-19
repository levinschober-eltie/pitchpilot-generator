import { useState, useEffect } from "react";
import { getApiKey, setApiKey } from "../store";
import Icon from "./Icons";

export default function Settings() {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasKey, setHasKey] = useState(!!getApiKey());

  useEffect(() => {
    setHasKey(!!getApiKey());
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setApiKey(key.trim());
    setHasKey(!!key.trim());
    setKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setApiKey("");
    setHasKey(false);
  };

  return (
    <div className="fade-in" style={{ maxWidth: 600 }}>
      <h2 style={{ fontSize: "1.3rem", marginBottom: "1.5rem" }}>
        <Icon name="settings" size={22} color="var(--yellow)" /> Einstellungen
      </h2>

      {/* Claude API Key */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Icon name="sparkle" size={18} color="var(--yellow)" /> Claude API
        </h3>

        <div style={{ fontSize: "0.85rem", color: "var(--gray-text)", marginBottom: "1rem", lineHeight: 1.5 }}>
          Für die AI-gestützte Pitch-Generierung wird ein Anthropic API-Key benötigt.
          Der Key wird nur in deinem Browser (SessionStorage) gespeichert und beim Schließen des Tabs gelöscht.
        </div>

        {hasKey ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Icon name="check" size={16} color="var(--green)" />
              <span style={{ color: "var(--green)", fontWeight: 700, fontSize: "0.85rem" }}>
                API-Key ist gesetzt
              </span>
            </div>
            <button className="btn btn-danger btn-sm" onClick={handleClear}>
              <Icon name="trash" size={12} /> Key entfernen
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Anthropic API Key</label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-ant-..."
                autoComplete="off"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={!key.trim()}>
              <Icon name="check" size={14} /> Speichern
            </button>
            {saved && (
              <span style={{ marginLeft: "0.75rem", color: "var(--green)", fontSize: "0.85rem" }}>
                Gespeichert!
              </span>
            )}
          </form>
        )}
      </div>

      {/* SolarStudio Integration (placeholder) */}
      <div className="card" style={{ opacity: 0.6 }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Icon name="sun" size={18} color="var(--gray-text)" /> SolarStudio-Anbindung
        </h3>
        <div style={{ fontSize: "0.85rem", color: "var(--gray-text)", lineHeight: 1.5 }}>
          Automatischer Import von 3D-Planungsdaten aus SolarStudio.
          Dachflächen, Ausrichtungen und Ertrags-Simulationen werden direkt übernommen.
        </div>
        <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", background: "var(--gray-light)", borderRadius: "4px", fontSize: "0.75rem", color: "var(--gray-text)" }}>
          Coming soon — wird in einem separaten Projekt entwickelt.
        </div>
      </div>

      {/* Info */}
      <div style={{ marginTop: "2rem", fontSize: "0.75rem", color: "var(--gray-text)" }}>
        PitchPilot Generator v1.0 — Elite PV GmbH
      </div>
    </div>
  );
}
