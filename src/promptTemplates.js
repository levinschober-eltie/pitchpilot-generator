/**
 * Prompt pipeline for Claude API — generates complete pitch content.
 * Oriented on the Eckart Werke presentation structure.
 */

import { calculateAll, fmtEuro, fmtNum } from "./calcEngine";
import { streamClaude, callClaude } from "./claudeApi";

const SYSTEM_PROMPT = `Du bist ein Experte für Energietransformations-Pitches an Industrieunternehmen.
Du erstellst professionelle, überzeugende Inhalte für interaktive Präsentationsseiten.

WICHTIG:
- Schreibe auf Deutsch, professionell aber nicht steif
- Verwende konkrete Zahlen aus den bereitgestellten Daten
- Jede Phase braucht: headline (kurzer Slogan, kursiv), description (2-3 Sätze Narrativ), highlights (4 Stück mit icon/title/text), results (3-4 Bullet-Points)
- Antworte NUR mit validem JSON — kein Markdown, keine Erklärungen
- Icons müssen aus dieser Liste stammen: sun, battery, fire, car, factory, leaf, money, shield, chart, bolt, globe, target, clock, tools, building, grid`;

/**
 * Build the user prompt with all project data.
 */
function buildUserPrompt(project) {
  const calc = calculateAll(project);
  const company = project.company || {};
  const energy = project.energy || {};
  const phases = (project.phases || []).filter(p => p.enabled);
  const phaseConfig = project.phaseConfig || {};

  return `Erstelle den kompletten Pitch-Inhalt für folgendes Projekt:

## Unternehmen
- Name: ${company.name || "Unbekannt"}
- Standort: ${company.city || "Deutschland"}
- Branche: ${company.industry || "Produktion"}
- Mitarbeiter: ${company.employeeCount || "k.A."}
- Beschreibung: ${company.description || "Industrieunternehmen"}

## Energieprofil
- Stromverbrauch: ${fmtNum(energy.stromverbrauch)} MWh/a
- Gasverbrauch: ${fmtNum(energy.gasverbrauch)} MWh/a
- Strompreis: ${energy.strompreis} ct/kWh
- Gaspreis: ${energy.gaspreis} ct/kWh
- Bestehende PV: ${energy.existingPV || 0} MWp

## Berechnete KPIs
- Gesamt-PV: ${fmtNum(calc.totalPV, 1)} MWp
- PV-Erzeugung: ${fmtNum(calc.pvErzeugung)} MWh/a
- Eigenverbrauchsquote: ${fmtNum(calc.eigenverbrauchsquote * 100)}%
- Jährliche Einsparung: ${fmtEuro(calc.gesamtEinsparungJahr)}
- CO₂-Reduktion: ${fmtNum(calc.co2Gesamt)} t/a
- Gesamtinvestition: ${fmtEuro(calc.investGesamt)}
- Amortisation: ${fmtNum(calc.amortisation, 1)} Jahre
- Autarkiegrad: ${fmtNum(calc.autarkie)}%

## Gewünschte Phasen (${phases.length} Stück)
${phases.map((p, i) => {
  const num = ["I", "II", "III", "IV", "V", "VI"][i] || (i + 1).toString();
  const conf = phaseConfig[p.key] || {};
  return `${num}. ${p.label} — Config: ${JSON.stringify(conf)}`;
}).join("\n")}

## Investitionen pro Phase
- Analyse: ${fmtEuro(calc.investAnalyse)}
- PV: ${fmtEuro(calc.investPV)}
- Speicher: ${fmtEuro(calc.investSpeicher)}
- Wärme: ${fmtEuro(calc.investWaerme)}
- Ladeinfra: ${fmtEuro(calc.investLade)}
- BESS: ${fmtEuro(calc.investBESS)}

Erstelle ein JSON-Objekt mit folgender Struktur:

{
  "intro": {
    "headline": "Erstellt für [Firmenname]",
    "subtitle": "Phasenkonzept zur Energietransformation",
    "tagline": "Kurzer motivierender Slogan"
  },
  "phases": [
    {
      "num": "I",
      "title": "Phasentitel",
      "subtitle": "Untertitel/Slogan",
      "months": "Monat X–Y",
      "color": "gold|green|navy",
      "icon": "icon_name",
      "headline": "Kursiver Einleitungssatz",
      "description": "2-3 Sätze Narrativ mit konkreten Zahlen",
      "results": ["Ergebnis 1", "Ergebnis 2", "Ergebnis 3"],
      "kpis": [
        { "label": "KPI Name", "value": "Wert mit Einheit" }
      ],
      "highlights": [
        { "icon": "icon_name", "title": "Titel", "text": "Kurzbeschreibung" }
      ],
      "investTotal": "€-Betrag",
      "roi": "ROI-Beschreibung",
      "independenceScore": 15
    }
  ],
  "finalSummary": {
    "headline": "Zusammenfassendes Statement",
    "heroCards": [
      { "icon": "leaf", "label": "CO₂-Reduktion", "value": "X t/a", "accent": "green" },
      { "icon": "money", "label": "Jahreseinsparung", "value": "X €/a", "accent": "gold" }
    ],
    "investTotal": "Gesamtinvestition",
    "autarkie": "X%",
    "amortisation": "X Jahre"
  }
}

WICHTIG: Antworte NUR mit dem JSON. Kein \`\`\`json, kein Markdown.
Die independenceScore-Werte sollen aufsteigend sein (15 → 95 in der letzten Phase).
Die Monate sollen realistisch aufeinanderfolgen.
Passe die Farben sinnvoll an: gold für Analyse/Finanzen, green für PV/Speicher/Umwelt, navy für Technik.`;
}

/**
 * Generate pitch content using Claude API.
 * @param {object} project - Complete project data
 * @param {function} onChunk - Optional streaming callback
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<object>} Parsed pitch content
 */
export async function generatePitchContent(project, onChunk, signal) {
  const userPrompt = buildUserPrompt(project);
  let responseText;

  if (onChunk) {
    responseText = await streamClaude(SYSTEM_PROMPT, userPrompt, onChunk, { signal });
  } else {
    responseText = await callClaude(SYSTEM_PROMPT, userPrompt, { signal });
  }

  // Parse JSON from response (handle potential markdown wrapping)
  let cleaned = responseText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Claude hat kein gültiges JSON zurückgegeben. Bitte erneut versuchen.\n\nAntwort: " + cleaned.slice(0, 500));
  }
}

/**
 * Generate a fallback/template content without AI.
 * Uses calculation results to fill a generic template.
 */
export function generateFallbackContent(project) {
  const calc = calculateAll(project);
  const company = project.company || {};
  const phases = (project.phases || []).filter(p => p.enabled);
  const nums = ["I", "II", "III", "IV", "V", "VI"];
  const colors = ["gold", "green", "green", "navy", "navy", "gold"];
  const icons = ["factory", "sun", "battery", "fire", "car", "grid"];

  const phaseDescriptions = {
    analyse: {
      title: "Analyse & Bewertung",
      subtitle: "Bestandsaufnahme & Potenzialanalyse",
      headline: "Eine fundierte Analyse bildet das Fundament jeder erfolgreichen Transformation.",
      description: `Umfassende Bestandsaufnahme der Energieinfrastruktur bei ${company.name || "Ihrem Unternehmen"}. Erfassung aller Verbrauchsdaten, Lastgänge und bestehender Anlagen als Basis für die Transformationsplanung.`,
      results: ["Detaillierter Energiebericht", "Lastgang-Analyse", "Potenzialermittlung aller Dachflächen", "Wirtschaftlichkeitsvorschau"],
      kpis: [{ label: "Investition", value: fmtEuro(calc.investAnalyse) }, { label: "Dauer", value: "2-3 Monate" }],
      highlights: [
        { icon: "chart", title: "Lastgang-Analyse", text: "15-Minuten-Auflösung aller Verbrauchsdaten" },
        { icon: "building", title: "Gebäude-Scan", text: "Statik, Dachflächen, Ausrichtung" },
        { icon: "target", title: "Potenzial", text: "Maximale PV-Belegung ermitteln" },
        { icon: "tools", title: "Konzept", text: "Individueller Transformationsfahrplan" },
      ],
    },
    pv: {
      title: "PV-Ausbau",
      subtitle: "Solare Eigenversorgung",
      headline: "Sonnenenergie ist der günstigste Strom — direkt vom eigenen Dach.",
      description: `${fmtNum(calc.totalPV, 1)} MWp Gesamtleistung erzeugen rund ${fmtNum(calc.pvErzeugung)} MWh pro Jahr. Bei einem Eigenverbrauch von ${fmtNum(calc.eigenverbrauchsquote * 100)}% reduziert sich der Netzbezug massiv.`,
      results: [`${fmtNum(calc.totalPV, 1)} MWp installierte Leistung`, `${fmtNum(calc.pvErzeugung)} MWh/a Jahreserzeugung`, `${fmtEuro(calc.stromEinsparung)} jährliche Stromeinsparung`, `${fmtEuro(calc.einspeiseErloese)} Einspeiseerlöse`],
      kpis: [{ label: "Gesamt-PV", value: `${fmtNum(calc.totalPV, 1)} MWp` }, { label: "Erzeugung", value: `${fmtNum(calc.pvErzeugung)} MWh/a` }, { label: "Eigenverbrauch", value: `${fmtNum(calc.eigenverbrauchsquote * 100)}%` }, { label: "Investition", value: fmtEuro(calc.investPV) }],
      highlights: [
        { icon: "sun", title: "Dachanlagen", text: `${fmtNum((project.phaseConfig?.pv?.pvDach || 0), 1)} MWp auf bestehenden Dachflächen` },
        { icon: "bolt", title: "Eigenverbrauch", text: `${fmtNum(calc.eigenverbrauchsquote * 100)}% direkte Nutzung` },
        { icon: "money", title: "Einsparung", text: `${fmtEuro(calc.stromEinsparung)} pro Jahr` },
        { icon: "leaf", title: "CO₂", text: `${fmtNum(calc.co2Strom)} t/a vermieden` },
      ],
    },
    speicher: {
      title: "Speicher & Steuerung",
      subtitle: "Intelligentes Energiemanagement",
      headline: "Speicher verwandeln volatile Erzeugung in planbare Versorgungssicherheit.",
      description: `${fmtNum(calc.bessKap)} MWh Batteriespeicher ermöglichen Peak-Shaving und maximieren den Eigenverbrauch. Das Energiemanagementsystem orchestriert alle Erzeuger und Verbraucher optimal.`,
      results: [`${fmtNum(calc.bessKap)} MWh Speicherkapazität`, `${fmtEuro(calc.peakShavingSavings)} Peak-Shaving-Einsparung`, "Intelligentes Lastmanagement", "Netzstabilisierung"],
      kpis: [{ label: "Kapazität", value: `${fmtNum(calc.bessKap)} MWh` }, { label: "Peak-Shaving", value: fmtEuro(calc.peakShavingSavings) }, { label: "Investition", value: fmtEuro(calc.investSpeicher) }],
      highlights: [
        { icon: "battery", title: "BESS", text: `${fmtNum(calc.bessKap)} MWh Lithium-Eisenphosphat` },
        { icon: "grid", title: "EMS", text: "Echtzeitsteuerung aller Energieflüsse" },
        { icon: "shield", title: "Backup", text: "Notstromfähigkeit bei Netzausfall" },
        { icon: "chart", title: "Peak-Shaving", text: `${fmtEuro(calc.peakShavingSavings)}/a Leistungspreisreduktion` },
      ],
    },
    waerme: {
      title: "Wärmekonzept",
      subtitle: "Dekarbonisierung der Prozesswärme",
      headline: "Wärmepumpen ersetzen fossile Brenner — mit Faktor 3,5 Effizienzgewinn.",
      description: `${fmtNum(calc.wpLeistung, 1)} MW Wärmepumpenleistung substituiert ${fmtNum(calc.gasErsatzRate * 100)}% des bisherigen Gasverbrauchs. Die Kopplung mit PV-Strom maximiert die Wirtschaftlichkeit.`,
      results: [`${fmtNum(calc.gasErsatzRate * 100)}% Gassubstitution`, `${fmtEuro(calc.gasEinsparung)} Gaseinsparung brutto`, `${fmtNum(calc.co2Waerme)} t/a CO₂-Reduktion`, `COP 3,5 Jahresarbeitszahl`],
      kpis: [{ label: "WP-Leistung", value: `${fmtNum(calc.wpLeistung, 1)} MW` }, { label: "Gasersatz", value: `${fmtNum(calc.gasErsatzRate * 100)}%` }, { label: "Einsparung", value: fmtEuro(calc.waermeNetto) }, { label: "Investition", value: fmtEuro(calc.investWaerme) }],
      highlights: [
        { icon: "fire", title: "Wärmepumpe", text: `${fmtNum(calc.wpLeistung, 1)} MW Kaskade` },
        { icon: "leaf", title: "CO₂-frei", text: `${fmtNum(calc.co2Waerme)} t/a weniger Emissionen` },
        { icon: "bolt", title: "COP 3,5", text: "3,5x mehr Wärme als eingesetzter Strom" },
        { icon: "money", title: "Netto-Effekt", text: `${fmtEuro(calc.waermeNetto)}/a Einsparung` },
      ],
    },
    ladeinfra: {
      title: "Ladeinfrastruktur",
      subtitle: "Elektrifizierung der Flotte",
      headline: "Eigenstrom tanken statt Diesel kaufen — der logische nächste Schritt.",
      description: `${calc.anzahlPKW} PKW-Ladepunkte und ${calc.anzahlLKW} LKW-Ladeplätze, gespeist aus eigener PV-Erzeugung. Jährliche Mobilitätskosteneinsparung von ${fmtEuro(calc.mobilitaetEinsparung)}.`,
      results: [`${calc.anzahlPKW + calc.anzahlLKW} Ladepunkte gesamt`, `${fmtEuro(calc.mobilitaetEinsparung)} Kraftstoffeinsparung/a`, `${fmtNum(calc.co2Mobilitaet)} t/a CO₂-Reduktion`, "100% Eigenstrom-Versorgung möglich"],
      kpis: [{ label: "PKW-Lader", value: `${calc.anzahlPKW}x AC` }, { label: "LKW-Lader", value: `${calc.anzahlLKW}x DC` }, { label: "Einsparung", value: fmtEuro(calc.mobilitaetEinsparung) }, { label: "Investition", value: fmtEuro(calc.investLade) }],
      highlights: [
        { icon: "car", title: "PKW", text: `${calc.anzahlPKW} AC-Wallboxen à 22 kW` },
        { icon: "bolt", title: "LKW", text: `${calc.anzahlLKW} DC-Schnelllader à 150 kW` },
        { icon: "sun", title: "Solar-Laden", text: "PV-Überschuss priorisiert" },
        { icon: "money", title: "Einsparung", text: `${fmtEuro(calc.mobilitaetEinsparung)}/a vs. Diesel` },
      ],
    },
    bess: {
      title: "Graustrom-BESS",
      subtitle: "Netzdienstleistungen & Arbitrage",
      headline: "Großspeicher als Profit-Center — Energiehandel auf Industrieniveau.",
      description: `${fmtNum(calc.graustromBESS)} MWh Großspeicher für Regelenergie und Arbitrage am EPEX Spot-Markt. Jährliche Erlöse von ${fmtEuro(calc.bessRevenue)} bei einer Rendite von ${fmtNum(calc.bessRendite, 1)}%.`,
      results: [`${fmtNum(calc.graustromBESS)} MWh Speicherkapazität`, `${fmtEuro(calc.bessRevenue)} Jahreserlöse`, `${fmtNum(calc.bessRendite, 1)}% Rendite p.a.`, "FCR/aFRR Präqualifikation"],
      kpis: [{ label: "Kapazität", value: `${fmtNum(calc.graustromBESS)} MWh` }, { label: "Erlöse", value: `${fmtEuro(calc.bessRevenue)}/a` }, { label: "Rendite", value: `${fmtNum(calc.bessRendite, 1)}%` }, { label: "Investition", value: fmtEuro(calc.investBESS) }],
      highlights: [
        { icon: "grid", title: "Arbitrage", text: "Günstig laden, teuer einspeisen" },
        { icon: "shield", title: "Regelenergie", text: "FCR + aFRR Teilnahme" },
        { icon: "chart", title: "Rendite", text: `${fmtNum(calc.bessRendite, 1)}% Eigenkapitalrendite` },
        { icon: "money", title: "Erlöse", text: `${fmtEuro(calc.bessRevenue)} pro Jahr` },
      ],
    },
  };

  const generatedPhases = phases.map((p, i) => {
    const tmpl = phaseDescriptions[p.key] || {};
    const investMap = {
      analyse: calc.investAnalyse,
      pv: calc.investPV,
      speicher: calc.investSpeicher,
      waerme: calc.investWaerme,
      ladeinfra: calc.investLade,
      bess: calc.investBESS,
    };
    const scores = phases.map((_, idx) => 15 + Math.round((80 / (phases.length - 1 || 1)) * idx));
    const monthStart = i === 0 ? 1 : phases.slice(0, i).reduce((s, _, j) => s + (j === 0 ? 3 : 6), 0);
    const monthEnd = monthStart + (i === 0 ? 3 : 6) - 1;

    return {
      num: nums[i] || `${i + 1}`,
      title: tmpl.title || p.label,
      subtitle: tmpl.subtitle || "",
      months: `Monat ${monthStart}–${monthEnd}`,
      color: colors[i] || "gold",
      icon: icons[i] || "factory",
      headline: tmpl.headline || "",
      description: tmpl.description || "",
      results: tmpl.results || [],
      kpis: tmpl.kpis || [],
      highlights: tmpl.highlights || [],
      investTotal: fmtEuro(investMap[p.key] || 0),
      roi: "",
      independenceScore: scores[i] || 15,
    };
  });

  return {
    intro: {
      headline: `Erstellt für ${company.name || "Ihr Unternehmen"}`,
      subtitle: "Phasenkonzept zur Energietransformation",
      tagline: "Vom Verbraucher zum Prosumer — Ihr Weg zur Energieautarkie",
    },
    phases: generatedPhases,
    finalSummary: {
      headline: `${company.name || "Ihr Unternehmen"} wird zum Energieproduzenten`,
      heroCards: [
        { icon: "leaf", label: "CO₂-Reduktion", value: `${fmtNum(calc.co2Gesamt)} t/a`, accent: "green" },
        { icon: "money", label: "Jahreseinsparung", value: fmtEuro(calc.gesamtEinsparungJahr), accent: "gold" },
      ],
      investTotal: fmtEuro(calc.investGesamt),
      autarkie: `${fmtNum(calc.autarkie)}%`,
      amortisation: `${fmtNum(calc.amortisation, 1)} Jahre`,
    },
  };
}
