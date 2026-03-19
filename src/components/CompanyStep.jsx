import Icon from "./Icons";

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

export default function CompanyStep({ data, onChange }) {
  const d = data || {};
  const set = (key, value) => onChange({ [key]: value });

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
          <label>Stadt / PLZ</label>
          <input
            type="text"
            value={d.city || ""}
            onChange={(e) => set("city", e.target.value)}
            placeholder="z.B. 91235 Hartenstein"
          />
        </div>
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
    </div>
  );
}
