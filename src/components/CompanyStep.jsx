import { useState, useMemo, useCallback, useRef } from "react";
import Icon from "./Icons";
import { THEME_LIST, resolveTheme } from "../themes";
import { analyzeWebsiteCI } from "../ciAnalyzer";
import { getCO2ByPLZ } from "../data/bundeslandCO2";

const INDUSTRIES = [
  { value: "produktion", label: "Produktion / Fertigung" },
  { value: "chemie", label: "Chemie / Pharma" },
  { value: "automotive", label: "Automotive / Zulieferer" },
  { value: "lebensmittel", label: "Lebensmittel / Getränke" },
  { value: "logistik", label: "Logistik / Transport" },
  { value: "metall", label: "Metall / Stahl" },
  { value: "papier", label: "Papier / Verpackung" },
  { value: "textil", label: "Textil / Bekleidung" },
  { value: "glas", label: "Glas / Keramik" },
  { value: "holz", label: "Holz / Möbel" },
  { value: "bau", label: "Bau / Baustoff" },
  { value: "elektronik", label: "Elektronik / IT" },
  { value: "sonstig", label: "Sonstige Industrie" },
];

/** 5-color swatch preview for a theme */
function ThemeSwatch({ theme }) {
  const colors = [theme.navy, theme.gold, theme.green, theme.greenLight, theme.warmWhite];
  return (
    <div style={{ display: "flex", gap: 2, height: 18, borderRadius: 4, overflow: "hidden" }}>
      {colors.map((c, i) => (
        <div key={i} style={{ flex: 1, background: c, minWidth: 14 }} />
      ))}
    </div>
  );
}

/** Mini preview strip showing how the selected theme looks */
function ThemePreview({ themeConfig }) {
  const resolved = useMemo(() => resolveTheme(themeConfig), [themeConfig]);

  return (
    <div
      style={{
        height: 200,
        borderRadius: 12,
        overflow: "hidden",
        background: `linear-gradient(135deg, ${resolved.navyDeep} 0%, ${resolved.navy} 50%, ${resolved.navyLight} 100%)`,
        padding: "1.25rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "0.7rem",
        marginBottom: "1.25rem",
        border: "1px solid var(--border)",
        position: "relative",
      }}
    >
      <div style={{ fontSize: "0.65rem", color: resolved.midGray, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "-0.3rem" }}>
        Vorschau
      </div>
      <div
        style={{
          fontFamily: resolved.font,
          fontSize: "1.3rem",
          fontWeight: 700,
          color: resolved.gold,
          lineHeight: 1.2,
        }}
      >
        Überschrift Beispieltext
      </div>
      <div
        style={{
          fontFamily: resolved.fontSerif,
          fontSize: "0.85rem",
          color: resolved.warmWhite,
          opacity: 0.85,
          lineHeight: 1.5,
          maxWidth: 380,
        }}
      >
        Dies ist ein Beispiel für Fließtext in der gewählten Stilvorlage.
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem" }}>
        <div
          style={{
            padding: "0.35rem 1rem",
            borderRadius: 6,
            background: resolved.gold,
            color: resolved.navyDeep,
            fontSize: "0.75rem",
            fontWeight: 600,
            fontFamily: resolved.font,
          }}
        >
          Button
        </div>
        <div
          style={{
            padding: "0.35rem 1rem",
            borderRadius: 6,
            background: "transparent",
            border: `1.5px solid ${resolved.gold}`,
            color: resolved.gold,
            fontSize: "0.75rem",
            fontWeight: 600,
            fontFamily: resolved.font,
          }}
        >
          Sekundär
        </div>
      </div>
      {/* Accent color dot */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: resolved.green,
          opacity: 0.7,
        }}
      />
    </div>
  );
}

export default function CompanyStep({ data, onChange, consultant, onConsultantChange, theme, onThemeChange }) {
  const d = data || {};
  const set = (key, value) => onChange({ [key]: value });
  const con = consultant || {};
  const setCon = (key, value) => onConsultantChange?.({ ...con, [key]: value });
  const th = theme || { preset: "eckart" };

  const [ciUrl, setCiUrl] = useState(th.websiteUrl || "");
  const [ciLoading, setCiLoading] = useState(false);
  const [ciError, setCiError] = useState(null);
  const [ciResult, setCiResult] = useState(th.customColors || null);
  const ciUrlRef = useRef(ciUrl);
  ciUrlRef.current = ciUrl;

  const handleCiAnalyze = useCallback(async () => {
    const url = ciUrlRef.current;
    if (!url.trim()) return;
    setCiLoading(true);
    setCiError(null);
    try {
      const { data, error } = await analyzeWebsiteCI(url);
      if (data) {
        setCiResult(data);
        onThemeChange?.({
          preset: "custom",
          customColors: data,
          font: data.font,
          websiteUrl: url.trim(),
        });
      } else {
        setCiError(error || "Analyse fehlgeschlagen. Bitte URL prüfen.");
      }
    } catch {
      setCiError("Analyse fehlgeschlagen. Bitte URL prüfen.");
    } finally {
      setCiLoading(false);
    }
  }, [onThemeChange]);

  const selectPreset = (key) => {
    setCiResult(null);
    setCiError(null);
    onThemeChange?.({ preset: key, customColors: null, font: null, websiteUrl: th.websiteUrl });
  };

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>
        <Icon name="building" size={22} color="var(--yellow)" /> Unternehmensdaten
      </h2>
      <p style={{ color: "var(--gray-text)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Grunddaten des Unternehmens für den Pitch.
      </p>

      <div className="grid-2">
        <div className="form-group">
          <label>Firmenname *</label>
          <input
            type="text"
            value={d.name || ""}
            onChange={(e) => set("name", e.target.value)}
            placeholder="z.B. ECKART GmbH"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Branche</label>
          <select value={d.industry || "produktion"} onChange={(e) => set("industry", e.target.value)}>
            {INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>Adresse</label>
          <input
            type="text"
            value={d.address || ""}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Straße, Hausnummer"
          />
        </div>
        <div className="form-group">
          <label>Stadt</label>
          <input
            type="text"
            value={d.city || ""}
            onChange={(e) => set("city", e.target.value)}
            placeholder="z.B. Hartenstein"
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>PLZ</label>
          <input
            type="text"
            value={d.plz || ""}
            onChange={(e) => set("plz", e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="z.B. 91235"
            maxLength={5}
            inputMode="numeric"
          />
          {d.plz && d.plz.length === 5 && (() => {
            const { co2Grid, bundesland } = getCO2ByPLZ(d.plz);
            return bundesland ? (
              <div style={{ marginTop: "0.3rem", fontSize: "0.72rem", color: "var(--green)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Icon name="pin" size={11} color="var(--green)" />
                {bundesland} · CO₂-Faktor: {co2Grid.toFixed(3)} t/MWh
                {co2Grid < 0.382 && <span style={{ color: "var(--green)", fontWeight: 600 }}> (−{Math.round((1 - co2Grid / 0.382) * 100)}% vs. DE-Schnitt)</span>}
                {co2Grid > 0.382 && <span style={{ color: "var(--red)", fontWeight: 600 }}> (+{Math.round((co2Grid / 0.382 - 1) * 100)}% vs. DE-Schnitt)</span>}
              </div>
            ) : null;
          })()}
        </div>
        <div className="form-group" />
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>Mitarbeiterzahl</label>
          <input
            type="number"
            value={d.employeeCount || ""}
            onChange={(e) => set("employeeCount", parseInt(e.target.value) || 0)}
            placeholder="z.B. 500"
            min="1"
          />
        </div>
        <div className="form-group">
          <label>Logo URL (optional)</label>
          <input
            type="url"
            value={d.logoUrl || ""}
            onChange={(e) => set("logoUrl", e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="form-group">
        <label>Unternehmensbeschreibung</label>
        <textarea
          rows={3}
          value={d.description || ""}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Kurze Beschreibung: Was produziert das Unternehmen? Besonderheiten des Standorts?"
          style={{ resize: "vertical" }}
        />
      </div>

      {/* ── Berater / Consultant Section ── */}
      <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "0.3rem" }}>
          <Icon name="user" size={18} color="var(--yellow)" /> Berater (optional)
        </h3>
        <p style={{ color: "var(--gray-text)", marginBottom: "1rem", fontSize: "0.85rem" }}>
          Wird auf der Präsentation als Ansprechpartner angezeigt.
        </p>
        <div className="grid-2">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={con.name || ""}
              onChange={(e) => setCon("name", e.target.value)}
              placeholder="z.B. Max Mustermann"
            />
          </div>
          <div className="form-group">
            <label>Firma</label>
            <input
              type="text"
              value={con.company || ""}
              onChange={(e) => setCon("company", e.target.value)}
              placeholder="z.B. Elite PV GmbH"
            />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>E-Mail</label>
            <input
              type="email"
              value={con.email || ""}
              onChange={(e) => setCon("email", e.target.value)}
              placeholder="berater@firma.de"
            />
          </div>
          <div className="form-group">
            <label>Telefon</label>
            <input
              type="tel"
              value={con.phone || ""}
              onChange={(e) => setCon("phone", e.target.value)}
              placeholder="z.B. +49 171 1234567"
            />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>Titel / Rolle</label>
            <input
              type="text"
              value={con.label || ""}
              onChange={(e) => setCon("label", e.target.value)}
              placeholder="z.B. Energieberater"
            />
          </div>
          <div className="form-group" />
        </div>
      </div>

      {/* ── Stil & CI Section ── */}
      <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "0.3rem" }}>
          <Icon name="eye" size={18} color="var(--yellow)" /> Stil & Corporate Identity
        </h3>
        <p style={{ color: "var(--gray-text)", marginBottom: "1rem", fontSize: "0.85rem" }}>
          Wähle einen Präsentationsstil oder analysiere die Firmen-Website.
        </p>

        {/* Theme Presets */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.6rem", marginBottom: "1.25rem" }}>
          {THEME_LIST.map((t) => {
            const isActive = th.preset === t.key && !th.customColors;
            return (
              <button
                key={t.key}
                onClick={() => selectPreset(t.key)}
                style={{
                  padding: "0.65rem 0.7rem",
                  borderRadius: 10,
                  border: isActive ? "2px solid var(--yellow)" : "2px solid var(--border)",
                  background: isActive ? "rgba(255,206,0,0.08)" : "var(--off-white)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
              >
                <ThemeSwatch theme={t} />
                <div style={{ fontSize: "0.85rem", fontWeight: 600, marginTop: "0.4rem", color: "var(--black)" }}>{t.name}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--gray-text)", lineHeight: 1.3, marginTop: "0.15rem" }}>{t.description}</div>
              </button>
            );
          })}

          {/* Custom CI card */}
          {ciResult && (
            <button
              onClick={() => onThemeChange?.({ ...th, preset: "custom" })}
              style={{
                padding: "0.65rem 0.7rem",
                borderRadius: 10,
                border: th.preset === "custom" ? "2px solid var(--yellow)" : "2px solid var(--border)",
                background: th.preset === "custom" ? "rgba(255,206,0,0.08)" : "var(--off-white)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", gap: 2, height: 18, borderRadius: 4, overflow: "hidden" }}>
                {[ciResult.secondary, ciResult.primary, ciResult.accent, ciResult.bg, ciResult.text].map((c, i) => (
                  <div key={i} style={{ flex: 1, background: c, minWidth: 14, border: "1px solid rgba(0,0,0,0.08)" }} />
                ))}
              </div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, marginTop: "0.4rem", color: "var(--black)" }}>Eigene CI</div>
              <div style={{ fontSize: "0.7rem", color: "var(--gray-text)", lineHeight: 1.3, marginTop: "0.15rem" }}>Aus Website extrahiert</div>
            </button>
          )}
        </div>

        {/* Live Theme Preview */}
        <ThemePreview themeConfig={th} />

        {/* Website CI Analysis */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Website-URL für CI-Analyse</label>
            <input
              type="url"
              value={ciUrl}
              onChange={(e) => setCiUrl(e.target.value)}
              placeholder="z.B. www.eckart.net"
              onKeyDown={(e) => { if (e.key === "Enter") handleCiAnalyze(); }}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleCiAnalyze}
            disabled={ciLoading || !ciUrl.trim()}
            style={{ whiteSpace: "nowrap", height: 38 }}
          >
            {ciLoading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <span className="spinner" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Analysiere...
              </span>
            ) : (
              <>
                <Icon name="chart" size={14} /> CI analysieren
              </>
            )}
          </button>
        </div>

        {ciError && (
          <div style={{ marginTop: "0.5rem", padding: "0.4rem 0.6rem", borderRadius: 6, background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.2)", color: "#c0392b", fontSize: "0.8rem" }}>
            {ciError}
          </div>
        )}

        {ciResult && (
          <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.8rem", borderRadius: 8, background: "rgba(45,140,78,0.06)", border: "1px solid rgba(45,140,78,0.15)" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--black)", marginBottom: "0.4rem" }}>
              Extrahierte CI-Farben
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                { label: "Primär", color: ciResult.primary },
                { label: "Sekundär", color: ciResult.secondary },
                { label: "Akzent", color: ciResult.accent },
                { label: "Hintergrund", color: ciResult.bg },
                { label: "Text", color: ciResult.text },
              ].map((c) => (
                <div key={c.label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: c.color, border: "1px solid rgba(0,0,0,0.15)" }} />
                  <span style={{ fontSize: "0.72rem", color: "var(--gray-text)" }}>{c.label}</span>
                  <span style={{ fontSize: "0.65rem", fontFamily: "monospace", color: "var(--gray-dark)" }}>{c.color}</span>
                </div>
              ))}
            </div>
            {ciResult.font && (
              <div style={{ marginTop: "0.3rem", fontSize: "0.72rem", color: "var(--gray-text)" }}>
                Schriftart: <strong>{ciResult.font}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
