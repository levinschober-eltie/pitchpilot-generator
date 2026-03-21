/**
 * Prompt pipeline for Claude API — generates complete pitch content.
 * Eckart-Niveau: investment detail, funding, roi, regulatorik, risk, levers, pillars.
 */

import { calculateAll, fmtEuro, fmtNum } from "./calcEngine";
import { streamClaude, callClaude } from "./claudeApi";

const SYSTEM_PROMPT = `Du bist ein Experte für Energietransformations-Pitches an Industrieunternehmen.
Du erstellst professionelle, überzeugende Inhalte für interaktive Präsentationsseiten.

WICHTIG:
- Schreibe auf Deutsch, professionell aber nicht steif
- Verwende konkrete Zahlen aus den bereitgestellten Daten
- Jede Phase braucht: headline, description, highlights (4), results (5-7), investment (Einzelpositionen), funding (2-3), roi, roiValue, independenceLabel
- finalSummary braucht: headline, heroCards, systemKpis (6), investmentSummary, economicSummary, levers (6), regulatorik (4-6), riskManagement (4-5), pillars
- Antworte NUR mit validem JSON — kein Markdown, keine Erklärungen
- Icons müssen aus: sun, battery, fire, car, factory, leaf, money, shield, chart, bolt, globe, target, clock, tools, building, grid, search, plug, satellite, microscope, document, gear, chartUp, chartDown, trophy, parking, thermometer, bank, sparkle, eye, cloudSun, pin`;

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
- Eigenverbrauchsquote: ${calc.eigenverbrauchsquote}%
- Jährlicher Gesamtertrag: ${fmtEuro(calc.gesamtertrag)}
- CO₂-Reduktion: ${fmtNum(calc.co2Gesamt)} t/a
- Gesamtinvestition: ${fmtEuro(calc.investGesamt)}
- Amortisation: ${fmtNum(calc.amortisationGesamt, 1)} Jahre
- Autarkiegrad: ${fmtNum(calc.autarkie)}%

## Gewünschte Phasen (${phases.length} Stück)
${phases.map((p, i) => {
  const num = ["I", "II", "III", "IV", "V", "VI"][i] || (i + 1).toString();
  const conf = phaseConfig[p.key] || {};
  return `${num}. ${p.label} — Config: ${JSON.stringify(conf)}`;
}).join("\n")}

## Investitionen pro Phase (berechnet)
- Analyse: ${fmtEuro(calc.investPhase1)}
- PV: ${fmtEuro(calc.investPhase2)}
- Speicher: ${fmtEuro(calc.investPhase3)}
- Wärme: ${fmtEuro(calc.investPhase4)}
- Ladeinfra: ${fmtEuro(calc.investPhase5)}
- BESS: ${fmtEuro(calc.investPhase6)}

## Weitere Berechnungen
- Stromersparnis: ${fmtEuro(calc.stromEinsparung)}/a
- Einspeiseerlöse: ${fmtEuro(calc.einspeiseErloese)}/a
- Peak Shaving: ${fmtEuro(calc.peakShavingSavings)}/a
- Gaseinsparung: ${fmtEuro(calc.gasEinsparung)}/a
- Mobilitätseinsparung: ${fmtEuro(calc.mobilitaetEinsparung)}/a
- BESS-Erlöse: ${fmtEuro(calc.bessErloes)}/a
- BESS-Rendite: ${fmtNum(calc.bessRendite, 1)}%
- CO₂ Strom: ${fmtNum(calc.co2Strom)} t, Wärme: ${fmtNum(calc.co2Waerme)} t, Mobilität: ${fmtNum(calc.co2PKW + calc.co2LKW)} t

Erstelle ein JSON-Objekt mit folgender Struktur:

{
  "intro": {
    "headline": "Erstellt für [Firmenname] — Energietransformation",
    "subtitle": "Phasenkonzept zur Energietransformation",
    "tagline": "Kurzer motivierender Slogan mit Standort"
  },
  "phases": [
    {
      "num": "I",
      "title": "Phasentitel",
      "subtitle": "Kurzer Untertitel-Slogan",
      "months": "Monat X–Y",
      "color": "gold|green",
      "icon": "icon_name",
      "headline": "Kursiver Einleitungssatz — prägnant, motivierend",
      "description": "2-3 Sätze Narrativ mit konkreten Zahlen und Firmenbezug",
      "results": ["5-7 konkrete Lieferergebnisse"],
      "kpis": [{ "label": "KPI Name", "value": "Wert mit Einheit" }],
      "highlights": [{ "icon": "icon", "title": "Titel", "text": "Beschreibung" }],
      "investment": [{ "label": "Position (€/Einheit)", "range": "X–Y Mio €" }],
      "funding": [{ "label": "Förderprogramm", "value": "Art der Förderung" }],
      "investTotal": "Gesamtinvestition dieser Phase",
      "roi": "ROI-Beschreibung",
      "roiValue": "Konkreter ROI-Wert",
      "independenceScore": 15,
      "independenceLabel": "Status-Label für Autarkie-Ring"
    }
  ],
  "finalSummary": {
    "headline": "Zusammenfassendes Statement — Vom Verbraucher zur Plattform",
    "heroCards": [
      { "icon": "leaf", "label": "CO₂-Einsparung", "value": "~X t", "accent": "green", "details": [{"label": "Strom", "value": "–X t"}] },
      { "icon": "money", "label": "Gesamtertrag", "value": "X Mio €", "accent": "gold", "details": [{"label": "Standort", "value": "X €/a"}] }
    ],
    "investTotal": "Gesamtinvestition",
    "systemKpis": [{ "label": "SYSTEM-KPI", "value": "Wert", "sub": "Erklärung" }],
    "investmentSummary": [{ "phase": "I", "label": "Phasenname", "range": "X Mio €", "roi": "ROI", "score": 15, "maxMio": 0.08 }],
    "economicSummary": {
      "savings": [{ "label": "Einsparungsposition", "value": "X €/a" }],
      "totals": { "annualSavings": "X €/a", "investStandort": "X €", "paybackStandort": "X Jahre", "bessRevenue": "X €/a" },
      "conclusion": "Zusammenfassendes Fazit-Statement"
    },
    "levers": [{ "icon": "icon", "title": "Hebel-Titel", "desc": "Beschreibung" }],
    "regulatorik": [{ "icon": "icon", "title": "Regulierung", "desc": "Beschreibung", "status": "Konform|Erfüllt|Ready" }],
    "riskManagement": [{ "icon": "icon", "title": "Risiko", "desc": "Beschreibung + Mitigation", "impact": "Niedrig|Mittel|Hoch" }],
    "pillars": [{ "icon": "icon", "label": "Säulen-Name", "phase": "II" }]
  }
}

WICHTIG: Antworte NUR mit dem JSON. Kein \`\`\`json, kein Markdown.
Die independenceScore-Werte sollen aufsteigend sein (15 → 95 in der letzten Phase).
Die Monate sollen realistisch aufeinanderfolgen.
Farben: gold für Analyse/Finanzen/Wärme, green für PV/Speicher/Laden/BESS.
investmentSummary muss maxMio als numerischen Wert enthalten (für Balkendiagramm).`;
}

/**
 * Generate pitch content using Claude API.
 */
export async function generatePitchContent(project, onChunk, signal) {
  const userPrompt = buildUserPrompt(project);
  let responseText;

  if (onChunk) {
    responseText = await streamClaude(SYSTEM_PROMPT, userPrompt, onChunk, { signal });
  } else {
    responseText = await callClaude(SYSTEM_PROMPT, userPrompt, { signal });
  }

  let cleaned = responseText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Claude hat kein gültiges JSON zurückgegeben. Bitte erneut versuchen.");
  }
}

/**
 * Generate a fallback/template content without AI.
 * Uses calculation results to fill a complete template.
 */
export function generateFallbackContent(project) {
  const calc = calculateAll(project);
  const company = project.company || {};
  const phases = (project.phases || []).filter(p => p.enabled);
  const nums = ["I", "II", "III", "IV", "V", "VI"];
  const colors = ["gold", "green", "green", "gold", "green", "green"];
  const icons = ["search", "sun", "bolt", "fire", "plug", "bolt"];
  const pc = project.phaseConfig || {};

  const phaseDescriptions = {
    analyse: {
      title: "Analyse & Bewertung",
      subtitle: "Bestandsaufnahme & Potenzialanalyse",
      headline: "Eine fundierte Analyse bildet das Fundament jeder erfolgreichen Transformation.",
      description: `Umfassende Bestandsaufnahme der Energieinfrastruktur bei ${company.name || "Ihrem Unternehmen"}. Erfassung aller Verbrauchsdaten, Lastgänge und bestehender Anlagen als Basis für die Transformationsplanung.`,
      results: ["Detaillierter Energiebericht erstellt", "Lastgang-Analyse in 15-Min-Auflösung", "Dachflächen-Potenzial vollständig erfasst", "Thermische Bestandsaufnahme abgeschlossen", "Wirtschaftlichkeitsmodell auf realer Datenbasis"],
      kpis: [{ label: "Investition", value: fmtEuro(calc.investPhase1) }, { label: "Dauer", value: "2–3 Monate" }],
      investment: [{ label: "Standortanalyse & Gutachten", range: fmtEuro(calc.investPhase1) }],
      funding: [{ label: "BAFA Energieberatung", value: "bis 80 % Zuschuss" }, { label: "KfW 295", value: "Tilgungszuschuss" }],
      roi: "Entscheidungsgrundlage für alle Folgeinvestitionen",
      roiValue: "Datenbasierte Dimensionierung",
      independenceLabel: "Datenbasis erstellt",
      highlights: [
        { icon: "chart", title: "Lastgang-Analyse", text: "15-Minuten-Auflösung aller Verbrauchsdaten" },
        { icon: "building", title: "Gebäude-Scan", text: "Statik, Dachflächen, Ausrichtung" },
        { icon: "target", title: "Potenzialanalyse", text: "Maximale PV-Belegung ermittelt" },
        { icon: "tools", title: "Transformationsfahrplan", text: "Individueller Maßnahmenplan" },
      ],
    },
    pv: {
      title: "Gebäudehülle & PV",
      subtitle: "Solare Eigenversorgung",
      headline: "Sonnenenergie ist der günstigste Strom — direkt vom eigenen Dach.",
      description: `${fmtNum(calc.totalPV, 1)} MWp Gesamtleistung erzeugen rund ${fmtNum(calc.pvErzeugung)} MWh pro Jahr. Bei einem Eigenverbrauch von ${calc.eigenverbrauchsquote}% reduziert sich der Netzbezug massiv.`,
      results: [`${fmtNum(calc.totalPV, 1)} MWp installierte Leistung`, `${fmtNum(calc.pvErzeugung)} MWh/a Jahreserzeugung`, `${calc.eigenverbrauchsquote}% Eigenverbrauchsquote`, `${fmtEuro(calc.stromEinsparung)}/a Stromeinsparung`, `${fmtEuro(calc.einspeiseErloese)}/a Einspeiseerlöse`],
      kpis: [{ label: "Gesamt-PV", value: `${fmtNum(calc.totalPV, 1)} MWp` }, { label: "Erzeugung", value: `${fmtNum(calc.pvErzeugung)} MWh/a` }, { label: "Eigenverbrauch", value: `${calc.eigenverbrauchsquote}%` }, { label: "Investition", value: fmtEuro(calc.investPhase2) }],
      investment: [
        { label: `Dach-PV ${fmtNum(pc.pv?.pvDach || 0, 1)} MWp (650 €/kWp)`, range: fmtEuro((pc.pv?.pvDach || 0) * 650000) },
        ...(pc.pv?.pvFassade ? [{ label: `Fassaden-PV ${fmtNum(pc.pv.pvFassade, 1)} MWp (650 €/kWp)`, range: fmtEuro(pc.pv.pvFassade * 650000) }] : []),
        ...(pc.pv?.pvCarport ? [{ label: `Carport-PV ${fmtNum(pc.pv.pvCarport, 1)} MWp (1.200 €/kWp)`, range: fmtEuro(pc.pv.pvCarport * 1200000) }] : []),
      ],
      funding: [{ label: "KfW 270 (Erneuerbare)", value: "Zinsverbilligung" }, { label: "EEG-Einspeisevergütung", value: "Überschusseinspeisung" }],
      roi: "Strombezugskosten-Reduktion",
      roiValue: `${calc.eigenverbrauchsquote}% Eigenverbrauch`,
      independenceLabel: "Erzeugungsportfolio aufgebaut",
      highlights: [
        { icon: "sun", title: "Dachanlagen", text: `${fmtNum(pc.pv?.pvDach || 0, 1)} MWp auf bestehenden Dachflächen` },
        { icon: "bolt", title: "Eigenverbrauch", text: `${calc.eigenverbrauchsquote}% direkte Nutzung` },
        { icon: "money", title: "Einsparung", text: `${fmtEuro(calc.stromEinsparung)} pro Jahr` },
        { icon: "leaf", title: "CO₂-Vermeidung", text: `${fmtNum(calc.co2Strom)} t/a weniger Emissionen` },
      ],
    },
    speicher: {
      title: "Speicher & Steuerung",
      subtitle: "Intelligentes Energiemanagement",
      headline: "Speicher verwandeln volatile Erzeugung in planbare Versorgungssicherheit.",
      description: `${fmtNum(calc.standortBESS, 1)} MWh Batteriespeicher ermöglichen Peak-Shaving und maximieren den Eigenverbrauch. Das EMS orchestriert alle Erzeuger und Verbraucher optimal.`,
      results: [`${fmtNum(calc.standortBESS, 1)} MWh Speicherkapazität`, `${fmtEuro(calc.peakShavingSavings)}/a Peak-Shaving-Einsparung`, "Intelligentes Lastmanagement", "Spotmarkt-Optimierung", "Prognosebasierte Steuerung"],
      kpis: [{ label: "Kapazität", value: `${fmtNum(calc.standortBESS, 1)} MWh` }, { label: "Peak-Shaving", value: `${fmtEuro(calc.peakShavingSavings)}/a` }, { label: "Investition", value: fmtEuro(calc.investPhase3) }],
      investment: [
        { label: `BESS ${fmtNum(calc.standortBESS, 1)} MWh (187 €/kWh)`, range: fmtEuro(calc.standortBESS * 187000) },
        { label: "EMS & Integration", range: fmtEuro(calc.standortBESS > 0 ? 185000 : 0) },
      ],
      funding: [{ label: "KfW 270 (Speicher)", value: "Zinsvergünstigung" }, { label: "Landesförderung", value: "Speicher-Zuschuss" }],
      roi: "Peak Shaving + Spotmarkt-Optimierung",
      roiValue: `${fmtEuro(calc.peakShavingSavings)}/a Einsparung`,
      independenceLabel: "Steuerbarkeit erreicht",
      highlights: [
        { icon: "battery", title: "BESS", text: `${fmtNum(calc.standortBESS, 1)} MWh Lithium-Eisenphosphat` },
        { icon: "grid", title: "EMS", text: "Echtzeitsteuerung aller Energieflüsse" },
        { icon: "shield", title: "Backup", text: "Notstromfähigkeit bei Netzausfall" },
        { icon: "chart", title: "Peak-Shaving", text: `${fmtEuro(calc.peakShavingSavings)}/a Leistungspreisreduktion` },
      ],
    },
    waerme: {
      title: "Wärmekonzept",
      subtitle: "Dekarbonisierung der Prozesswärme",
      headline: "Wärmepumpen ersetzen fossile Brenner — mit Faktor 4 Effizienzgewinn.",
      description: `${fmtNum(calc.wpLeistung, 1)} MW Wärmepumpenleistung substituiert ${calc.gasErsatzRate}% des bisherigen Gasverbrauchs. Die Kopplung mit PV-Strom maximiert die Wirtschaftlichkeit.`,
      results: [`${calc.gasErsatzRate}% Gassubstitution`, `${fmtEuro(calc.gasEinsparung)}/a Gaseinsparung`, `${fmtNum(calc.co2Waerme)} t/a CO₂-Reduktion`, "Wärmenetz verbindet alle Verbraucher", "Pufferspeicher für Lastausgleich"],
      kpis: [{ label: "WP-Leistung", value: `${fmtNum(calc.wpLeistung, 1)} MW` }, { label: "Gasersatz", value: `${calc.gasErsatzRate}%` }, { label: "Einsparung", value: `${fmtEuro(calc.gasEinsparung)}/a` }, { label: "Investition", value: fmtEuro(calc.investPhase4) }],
      investment: [
        { label: `WP-Kaskade ${fmtNum(calc.wpLeistung, 1)} MW (400 T€/MW)`, range: fmtEuro(calc.wpLeistung * 400000) },
        { label: "Pufferspeicher + Verteilung", range: fmtEuro(1000000 + (calc.pufferspeicher || 0) * 600) },
        { label: "Wärmenetz + Dämmung", range: fmtEuro(800000) },
      ],
      funding: [{ label: "BEG (Bundesförderung Effiziente Gebäude)", value: "bis 40 % Zuschuss" }, { label: "KfW 261", value: "Tilgungszuschuss" }],
      roi: "Gaskosten-Reduktion + CO₂-Vermeidung",
      roiValue: `${calc.gasErsatzRate}% weniger Gas`,
      independenceLabel: "Thermische Unabhängigkeit",
      highlights: [
        { icon: "fire", title: "Wärmepumpe", text: `${fmtNum(calc.wpLeistung, 1)} MW Kaskade` },
        { icon: "leaf", title: "CO₂-frei", text: `${fmtNum(calc.co2Waerme)} t/a weniger Emissionen` },
        { icon: "thermometer", title: "COP 4", text: "4x mehr Wärme als eingesetzter Strom" },
        { icon: "money", title: "Einsparung", text: `${fmtEuro(calc.gasEinsparung)}/a Gaskosten-Reduktion` },
      ],
    },
    ladeinfra: {
      title: "Ladeinfrastruktur",
      subtitle: "Elektrifizierung der Flotte",
      headline: "Eigenstrom tanken statt Diesel kaufen — der logische nächste Schritt.",
      description: `${calc.anzahlPKW} PKW-Ladepunkte und ${calc.anzahlLKW} LKW-Ladeplätze, gespeist aus eigener PV-Erzeugung. Jährliche Mobilitätskosteneinsparung von ${fmtEuro(calc.mobilitaetEinsparung)}.`,
      results: [`${calc.anzahlPKW + calc.anzahlLKW} Ladepunkte gesamt`, `${fmtEuro(calc.mobilitaetEinsparung)}/a Kraftstoffeinsparung`, `${fmtNum(calc.co2PKW + calc.co2LKW)} t/a CO₂-Reduktion`, "PV-geführtes Lastmanagement", "GEIG-konforme Ausstattung"],
      kpis: [{ label: "PKW-Lader", value: `${calc.anzahlPKW}× AC` }, { label: "LKW-Lader", value: `${calc.anzahlLKW}× DC` }, { label: "Einsparung", value: `${fmtEuro(calc.mobilitaetEinsparung)}/a` }, { label: "Investition", value: fmtEuro(calc.investPhase5) }],
      investment: [
        { label: `${calc.anzahlPKW} AC-Wallboxen (2.500 €/Stk)`, range: fmtEuro(calc.anzahlPKW * 2500) },
        ...(calc.anzahlLKW > 0 ? [{ label: `${calc.anzahlLKW} DC/HPC-Lader`, range: fmtEuro(Math.max(1, Math.ceil(calc.anzahlLKW * 0.5)) * 200000) }] : []),
        { label: "Lastmanagement + Netz", range: fmtEuro(350000) },
      ],
      funding: [{ label: "THG-Quotenhandel", value: "Erstattung pro Ladepunkt" }, { label: "GEIG-Pflicht ab 2026", value: "Regulatorische Compliance" }],
      roi: "Diesel-Einsparung + Compliance",
      roiValue: "Fuhrpark-Elektrifizierung",
      independenceLabel: "Mobilität elektrifiziert",
      highlights: [
        { icon: "plug", title: "AC-Ladepark", text: `${calc.anzahlPKW} Wallboxen à 22 kW` },
        { icon: "bolt", title: "DC-Schnelllader", text: `${calc.anzahlLKW > 0 ? calc.anzahlLKW + " DC-Lader für Fuhrpark" : "Optional erweiterbar"}` },
        { icon: "sun", title: "Solar-Laden", text: "PV-Überschuss priorisiert" },
        { icon: "money", title: "Einsparung", text: `${fmtEuro(calc.mobilitaetEinsparung)}/a vs. Diesel` },
      ],
    },
    bess: {
      title: "Graustrom-BESS",
      subtitle: "Netzdienstleistungen & Arbitrage",
      headline: "Großspeicher als Profit-Center — Energiehandel auf Industrieniveau.",
      description: `${fmtNum(calc.graustromBESS)} MWh Großspeicher für Regelenergie und Arbitrage am EPEX Spot-Markt. Jährliche Erlöse von ${fmtEuro(calc.bessErloes)} bei einer Rendite von ${fmtNum(calc.bessRendite, 1)}%.`,
      results: [`${fmtNum(calc.graustromBESS)} MWh / ${fmtNum(calc.bessLeistung)} MW in Betrieb`, `${fmtEuro(calc.bessErloes)}/a Jahreserlöse`, `${fmtNum(calc.bessRendite, 1)}% Rendite p.a.`, "Arbitrage + FCR + Redispatch", "24/7 SCADA-Monitoring"],
      kpis: [{ label: "Kapazität", value: `${fmtNum(calc.graustromBESS)} MWh` }, { label: "Leistung", value: `${fmtNum(calc.bessLeistung)} MW` }, { label: "Erlöse", value: `${fmtEuro(calc.bessErloes)}/a` }, { label: "Rendite", value: `${fmtNum(calc.bessRendite, 1)}% p.a.` }],
      investment: [
        { label: `BESS ${fmtNum(calc.graustromBESS)} MWh (175 T€/MWh)`, range: fmtEuro(calc.graustromBESS * 175000) },
        { label: "Netzanschluss + Trafo", range: fmtEuro(6500000) },
      ],
      funding: [{ label: "Projektfinanzierung (Non-Recourse SPV)", value: "Cashflow-besichert" }, { label: "EU Innovation Fund", value: "Co-Finanzierung" }],
      roi: "Arbitrage + Regelenergie + Redispatch",
      roiValue: `${fmtNum(calc.bessRendite, 1)}% p.a.`,
      independenceLabel: "Strategisch unangreifbar",
      highlights: [
        { icon: "battery", title: "Großspeicher", text: `${fmtNum(calc.graustromBESS)} MWh — Skaleneffekte senken €/kWh` },
        { icon: "chart", title: "Erlösströme", text: "Arbitrage, FCR, Redispatch diversifiziert" },
        { icon: "bolt", title: "Netzanschluss", text: "Bestehende Infrastruktur nutzen" },
        { icon: "factory", title: "SCADA 24/7", text: "Vollautomatisches Monitoring" },
      ],
    },
  };

  const investMap = {
    analyse: calc.investPhase1, pv: calc.investPhase2, speicher: calc.investPhase3,
    waerme: calc.investPhase4, ladeinfra: calc.investPhase5, bess: calc.investPhase6,
  };

  const generatedPhases = phases.map((p, i) => {
    const tmpl = phaseDescriptions[p.key] || {};
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
      investment: tmpl.investment || [],
      funding: tmpl.funding || [],
      investTotal: fmtEuro(investMap[p.key] || 0),
      roi: tmpl.roi || "",
      roiValue: tmpl.roiValue || "",
      independenceScore: scores[i] || 15,
      independenceLabel: tmpl.independenceLabel || "",
    };
  });

  // Build investmentSummary from generated phases
  const investmentSummary = generatedPhases.map(p => ({
    phase: p.num,
    label: p.title,
    range: p.investTotal,
    roi: p.roiValue || p.roi,
    score: p.independenceScore,
    maxMio: (investMap[phases.find(ph => ph.label === p.title || ph.key)?.key] || 0) / 1e6,
  }));

  return {
    intro: {
      headline: `${company.name || "Ihr Unternehmen"} — Energietransformation`,
      subtitle: "Phasenkonzept zur Energietransformation",
      tagline: `Integriertes Energiesystem · ${company.city || "Deutschland"}`,
    },
    phases: generatedPhases,
    finalSummary: {
      headline: `Vom Energieverbraucher zur Energieplattform`,
      heroCards: [
        {
          icon: "leaf", accent: "green",
          label: "CO₂-Einsparung pro Jahr",
          value: `~${fmtNum(calc.co2Gesamt)} t`,
          details: [
            { label: "Strom (PV statt Netz)", value: `–${fmtNum(calc.co2Strom)} t` },
            { label: "Wärme (WP statt Gas)", value: `–${fmtNum(calc.co2Waerme)} t` },
            { label: "Mobilität (E statt Diesel)", value: `–${fmtNum(calc.co2PKW + calc.co2LKW)} t` },
          ],
        },
        {
          icon: "money", accent: "gold",
          label: "Jährlicher Gesamtertrag",
          value: fmtEuro(calc.gesamtertrag),
          details: [
            { label: "Standort-Einsparungen (I–V)", value: `${fmtEuro(calc.einsparungStandort)}/a` },
            { label: "BESS-Erlöse (VI)", value: `${fmtEuro(calc.bessErloes)}/a` },
          ],
        },
      ],
      investTotal: fmtEuro(calc.investGesamt),

      systemKpis: [
        { label: "PV-LEISTUNG", value: `${fmtNum(calc.totalPV, 1)} MWp`, sub: "Gesamt installiert" },
        { label: "SPEICHER", value: `${fmtNum(calc.standortBESS, 1)} MWh`, sub: "Standort-BESS" },
        ...(calc.wpLeistung > 0 ? [{ label: "WÄRMEPUMPE", value: `${fmtNum(calc.wpLeistung, 1)} MW`, sub: "COP ~4 · Abwärme-basiert" }] : []),
        ...(calc.anzahlPKW + calc.anzahlLKW > 0 ? [{ label: "LADEPUNKTE", value: `${calc.anzahlPKW + calc.anzahlLKW}+`, sub: "AC + DC" }] : []),
        ...(calc.graustromBESS > 0 ? [{ label: "GRAUSTROM-BESS", value: `${fmtNum(calc.bessLeistung)} MW / ${fmtNum(calc.graustromBESS)} MWh`, sub: "Arbitrage + FCR" }] : []),
        { label: "CO₂-EINSPARUNG", value: `~${fmtNum(calc.co2Gesamt)} t/a`, sub: "Strom + Wärme + Mobilität" },
      ],

      investmentSummary,

      economicSummary: {
        savings: [
          { label: "PV-Eigenverbrauch (Stromkosten-Reduktion)", value: `${fmtEuro(calc.stromEinsparung)}/a` },
          { label: "Einspeiseerlöse", value: `${fmtEuro(calc.einspeiseErloese)}/a` },
          ...(calc.peakShavingSavings > 0 ? [{ label: "Peak Shaving & Spotmarkt", value: `${fmtEuro(calc.peakShavingSavings)}/a` }] : []),
          ...(calc.gasEinsparung > 0 ? [{ label: "Gaskosten-Reduktion (WP)", value: `${fmtEuro(calc.gasEinsparung)}/a` }] : []),
          ...(calc.mobilitaetEinsparung > 0 ? [{ label: "Mobilitäts-Einsparung", value: `${fmtEuro(calc.mobilitaetEinsparung)}/a` }] : []),
        ],
        totals: {
          annualSavings: `${fmtEuro(calc.einsparungStandort)}/a`,
          investStandort: fmtEuro(calc.investStandort),
          paybackStandort: `~${fmtNum(calc.amortisationStandort, 1)} Jahre`,
          bessRevenue: calc.bessErloes > 0 ? `${fmtEuro(calc.bessErloes)}/a` : null,
        },
        conclusion: `Das integrierte Energiesystem erreicht eine Amortisation von ~${fmtNum(calc.amortisationGesamt, 1)} Jahren bei jährlichen Einsparungen von ${fmtEuro(calc.einsparungStandort)}${calc.bessErloes > 0 ? `. Hinzu kommen ${fmtEuro(calc.bessErloes)}/a aus dem Graustrom-BESS — ein eigenständiges Ertragsmodell mit ${fmtNum(calc.bessRendite, 1)}% Rendite` : ""}. Zusammen entsteht eine Energieplattform mit ${fmtNum(calc.autarkie)}% Autarkie.`,
      },

      levers: [
        { icon: "sun", title: "PV-Eigenverbrauch", desc: `${fmtNum(calc.totalPV, 1)} MWp senken den Strombezug — direkte Kostenreduktion ab Tag 1` },
        ...(calc.standortBESS > 0 ? [{ icon: "battery", title: "Speicher & Peak Shaving", desc: `${fmtNum(calc.standortBESS, 1)} MWh Standort-BESS kappt Lastspitzen und optimiert Eigenverbrauch` }] : []),
        ...(calc.wpLeistung > 0 ? [{ icon: "fire", title: "Wärme-Elektrifizierung", desc: `${fmtNum(calc.wpLeistung, 1)} MW WP-Kaskade ersetzt ${calc.gasErsatzRate}% des Gasbezugs` }] : []),
        ...(calc.anzahlPKW > 0 ? [{ icon: "plug", title: "E-Mobilität", desc: `${calc.anzahlPKW + calc.anzahlLKW}+ Ladepunkte elektrifizieren den Fuhrpark` }] : []),
        ...(calc.graustromBESS > 0 ? [{ icon: "bolt", title: "BESS-Arbitrage", desc: `${fmtNum(calc.bessLeistung)} MW / ${fmtNum(calc.graustromBESS)} MWh — ${fmtNum(calc.bessRendite, 1)}% Rendite p.a.` }] : []),
        { icon: "chart", title: "EMS-Integration", desc: "Standortweites Energiemanagement steuert alle Flüsse in Echtzeit" },
      ],

      regulatorik: [
        { icon: "leaf", title: "CSRD / ESG-Reporting", desc: "Scope 1+2 Reduktion dokumentiert — Green Finance Zugang gesichert", status: "Adressiert" },
        { icon: "globe", title: "EU-Taxonomie", desc: "Investitionen taxonomie-konform", status: "Konform" },
        { icon: "document", title: "GEIG-Pflicht 2026", desc: "Ladeinfrastruktur-Pflicht erfüllt", status: "Erfüllt" },
        { icon: "bank", title: "CO₂-Bepreisung (BEHG)", desc: "Steigende CO₂-Kosten durch Elektrifizierung eliminiert", status: "Abgesichert" },
      ],

      riskManagement: [
        { icon: "chartDown", title: "Strompreis-Volatilität", desc: "Hohe Eigenverbrauchsquote reduziert Marktpreisabhängigkeit", impact: "Niedrig" },
        ...(calc.graustromBESS > 0 ? [{ icon: "battery", title: "BESS-Marktrisiko", desc: "Diversifizierte Erlösströme — kein Single-Point-of-Failure", impact: "Mittel" }] : []),
        { icon: "gear", title: "Technologie-Risiko", desc: "Ausschließlich marktreife Komponenten (LFP, monokristalline PV, Industrie-WP)", impact: "Niedrig" },
        { icon: "document", title: "Regulatorisches Risiko", desc: "Alle aktuellen Anforderungen erfüllt, EU-Taxonomie-konform", impact: "Niedrig" },
      ],

      pillars: [
        { icon: "sun", label: "Dezentrale Erzeugung", phase: "II" },
        ...(calc.standortBESS > 0 ? [{ icon: "battery", label: "Intelligente Speicherung", phase: "III" }] : []),
        ...(calc.wpLeistung > 0 ? [{ icon: "fire", label: "Wärme-Elektrifizierung", phase: "IV" }] : []),
        ...(calc.anzahlPKW > 0 ? [{ icon: "plug", label: "Elektromobilität", phase: "V" }] : []),
        ...(calc.graustromBESS > 0 ? [{ icon: "bolt", label: "Energiehandel", phase: "VI" }] : []),
        { icon: "chart", label: "System-Steuerung", phase: "I–VI" },
      ],
    },
  };
}
