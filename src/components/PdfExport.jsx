import { useState, useCallback, useEffect } from "react";
import { calculateAll, project20Years, fmtEuro, fmtNum, getPhaseCalcItems, getDynamicHeroCards } from "../calcEngine";
import { C } from "../colors";
import { useTheme } from "../ThemeContext";
import Icon from "./Icons";

/* ─────────────────────────────────────────────
   Section registry
───────────────────────────────────────────── */
const SECTIONS = [
  { key: "cover",        label: "Deckblatt",                    group: "p", def: true,  locked: true },
  { key: "overview",     label: "Auf einen Blick",              group: "p", def: true  },
  { key: "phases",       label: "Phasenübersicht",              group: "p", def: true  },
  { key: "roadmap",      label: "Investitions-Roadmap",         group: "w", def: true  },
  { key: "finanzierung", label: "Finanzierung & Kreditstruktur",group: "w", def: true  },
  { key: "cashflow",     label: "20-Jahres Cashflow-Projektion",group: "w", def: true  },
  { key: "savings",      label: "Jährliche Einsparungen & Erlöse", group: "w", def: true  },
  { key: "regulatorik",  label: "Regulatorik & Compliance",     group: "w", def: true  },
  { key: "foerdermittel",label: "Fördermittel je Phase",        group: "w", def: true  },
  { key: "risiko",       label: "Risikomanagement",             group: "w", def: false },
  { key: "konfiguration",label: "Individuelle Kalkulation",     group: "w", def: false },
];

/* ─────────────────────────────────────────────
   SVG Cashflow Chart (embedded as string)
───────────────────────────────────────────── */
function buildCashflowSvg(rows) {
  const W = 800, H = 300, PAD = { t: 20, r: 20, b: 50, l: 80 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  const maxY = Math.max(...rows.map(r => Math.max(r.cum || 0, r.cumFin || 0, 0)));
  const minY = Math.min(...rows.map(r => Math.min(r.cum || 0, r.cumFin || 0, 0)));
  const range = maxY - minY || 1;

  const toX = y => PAD.l + (y / 20) * cw;
  const toY = v => PAD.t + ch - ((v - minY) / range) * ch;

  const polyline = (key, color, dash = "") =>
    `<polyline points="${rows.map(r => `${toX(r.y)},${toY(r[key])}`).join(" ")}" fill="none" stroke="${color}" stroke-width="2.5" ${dash ? `stroke-dasharray="${dash}"` : ""} />`;

  // Zero line
  const zy = toY(0);
  const zeroLine = `<line x1="${PAD.l}" y1="${zy}" x2="${PAD.l + cw}" y2="${zy}" stroke="#aaa" stroke-width="1" stroke-dasharray="4 3"/>`;

  // X-axis labels (every 5 years)
  const xLabels = [0, 5, 10, 15, 20].map(y =>
    `<text x="${toX(y)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#555">${y}</text>`
  ).join("");

  // Y-axis labels (3 ticks)
  const yTicks = [minY, (minY + maxY) / 2, maxY].map(v => {
    const yp = toY(v);
    const label = Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)} Mio.` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)} T` : `${Math.round(v)}`;
    return `<text x="${PAD.l - 8}" y="${yp + 4}" text-anchor="end" font-size="10" fill="#555">${label}</text>`;
  }).join("");

  const legend = `
    <rect x="${PAD.l}" y="${H - 48}" width="14" height="3" fill="#1B2A4A"/>
    <text x="${PAD.l + 18}" y="${H - 44}" font-size="10" fill="#333">Kum. CF (unlevered)</text>
    <rect x="${PAD.l + 160}" y="${H - 48}" width="14" height="3" fill="#D4A843"/>
    <text x="${PAD.l + 178}" y="${H - 44}" font-size="10" fill="#333">Kum. CF nach FK</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="max-width:100%">
    ${zeroLine}
    ${polyline("cum", "#1B2A4A")}
    ${polyline("cumFin", "#D4A843", "6 3")}
    ${xLabels}
    ${yTicks}
    ${legend}
    <text x="${PAD.l + cw / 2}" y="${H - 2}" text-anchor="middle" font-size="10" fill="#888">Jahr</text>
  </svg>`;
}

/* ─────────────────────────────────────────────
   SVG Revenue Bar Chart
───────────────────────────────────────────── */
function buildRevenueSvg(calc) {
  const segments = [
    { label: "Strom",       value: calc.stromEinsparung,      color: "#1B2A4A" },
    { label: "Einspeisung", value: calc.einspeiseErloese,     color: "#253757" },
    { label: "Peak Shaving",value: calc.peakShavingSavings,   color: "#3498DB" },
    { label: "Gas",         value: calc.gasEinsparung,        color: "#2D6A4F" },
    { label: "Mobilität",   value: calc.mobilitaetEinsparung, color: "#4CAF7D" },
    { label: "BESS",        value: calc.bessErloes,           color: "#D4A843" },
  ].filter(s => s.value > 0);

  const W = 800, H = 250, PAD = { t: 20, r: 20, b: 60, l: 80 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;
  const max = Math.max(...segments.map(s => s.value), 1);
  const barW = Math.min(60, cw / Math.max(segments.length, 1) - 12);

  const bars = segments.map((s, i) => {
    const bh = (s.value / max) * ch;
    const x = PAD.l + (i / segments.length) * cw + (cw / segments.length - barW) / 2;
    const y = PAD.t + ch - bh;
    const lbl = Math.abs(s.value) >= 1e6 ? `${(s.value / 1e6).toFixed(1)}M€` : Math.abs(s.value) >= 1e3 ? `${Math.round(s.value / 1e3)}T€` : `${s.value}€`;
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${bh}" fill="${s.color}" rx="2"/>
      <text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="9" fill="#333">${lbl}</text>
      <text x="${x + barW / 2}" y="${H - 8}" text-anchor="middle" font-size="9" fill="#555" transform="rotate(-25, ${x + barW / 2}, ${H - 8})">${s.label}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="max-width:100%">
    ${bars}
  </svg>`;
}

/* ─────────────────────────────────────────────
   SVG Debt Service Chart
───────────────────────────────────────────── */
function buildDebtSvg(debtSchedule) {
  const W = 800, H = 200, PAD = { t: 20, r: 20, b: 40, l: 80 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;
  const rows = debtSchedule.slice(1, 21);
  const max = Math.max(...rows.map(r => r.annuitaet), 1);
  const barW = Math.max(4, cw / rows.length - 3);

  const bars = rows.map((r, i) => {
    const x = PAD.l + (i / rows.length) * cw;
    const totalH = (r.annuitaet / max) * ch;
    const tH = r.annuitaet > 0 ? (r.tilgung / r.annuitaet) * totalH : 0;
    const zH = totalH - tH;
    const baseY = PAD.t + ch;
    return `
      <rect x="${x}" y="${baseY - totalH}" width="${barW}" height="${zH}" fill="#E74C3C" rx="1"/>
      <rect x="${x}" y="${baseY - tH}" width="${barW}" height="${tH}" fill="#1B2A4A" rx="1"/>
      <text x="${x + barW / 2}" y="${H - 4}" text-anchor="middle" font-size="9" fill="#555">${i + 1}</text>`;
  }).join("");

  const legend = `
    <rect x="${PAD.l}" y="${PAD.t}" width="12" height="10" fill="#1B2A4A"/>
    <text x="${PAD.l + 16}" y="${PAD.t + 9}" font-size="10" fill="#333">Tilgung</text>
    <rect x="${PAD.l + 80}" y="${PAD.t}" width="12" height="10" fill="#E74C3C"/>
    <text x="${PAD.l + 96}" y="${PAD.t + 9}" font-size="10" fill="#333">Zinsen</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="max-width:100%">
    ${bars}
    ${legend}
  </svg>`;
}

/* ─────────────────────────────────────────────
   HTML page builders
───────────────────────────────────────────── */
function pageCover(project) {
  const comp = project.company || {};
  const today = new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" });
  return `
    <div class="page cover-page">
      <div class="cover-inner">
        <div class="cover-logo">PitchPilot</div>
        <h1 class="cover-company">${comp.name || "Ihr Unternehmen"}</h1>
        <h2 class="cover-subtitle">Phasenkonzept zur Energietransformation</h2>
        <div class="cover-meta">
          ${comp.location ? `<span>${comp.location}</span>` : ""}
          <span>${today}</span>
        </div>
        <div class="cover-footer">Erstellt von PitchPilot — Energietransformation leicht gemacht</div>
      </div>
    </div>`;
}

function pageOverview(calc) {
  const items = [
    { label: "Gesamtinvestition",  value: fmtEuro(calc.investGesamt) },
    { label: "Amortisation",        value: `${fmtNum(calc.amortisationGesamt, 1)} Jahre` },
    { label: "Autarkie (Ziel)",     value: `${calc.autarkie} %` },
    { label: "CO₂-Reduktion/Jahr",  value: `${fmtNum(calc.co2Gesamt)} t` },
    { label: "Jährl. Einsparung",   value: fmtEuro(calc.gesamtertrag) },
    { label: "EK-Rendite",          value: `${fmtNum(calc.ekRendite, 1)} % p.a.` },
    { label: "DSCR",                value: `${fmtNum(calc.dscr, 2)} ×` },
    { label: "BESS-Rendite",        value: `${fmtNum(calc.bessRendite, 1)} % p.a.` },
  ];
  return `
    <div class="page">
      <h2 class="section-title">Auf einen Blick</h2>
      <div class="kpi-grid">
        ${items.map(it => `
          <div class="kpi-card">
            <div class="kpi-label">${it.label}</div>
            <div class="kpi-value">${it.value}</div>
          </div>`).join("")}
      </div>
    </div>`;
}

function pagePhases(project, calc) {
  const phases = (project.phases || []).filter(p => p.enabled);
  const investMap = {
    analyse:   calc.investPhase1,
    pv:        calc.investPhase2,
    speicher:  calc.investPhase3,
    waerme:    calc.investPhase4,
    ladeinfra: calc.investPhase5,
    bess:      calc.investPhase6,
  };
  const benefitMap = {
    analyse:   "Energieprofil & Potenzialanalyse",
    pv:        `${fmtNum(calc.totalPV, 1)} MWp · ${fmtNum(calc.pvErzeugung)} MWh/a`,
    speicher:  `${fmtNum(calc.standortBESS, 1)} MWh BESS · Peak Shaving`,
    waerme:    `${calc.gasErsatzRate} % Gasreduktion · ${fmtNum(calc.wpLeistung, 1)} MW WP`,
    ladeinfra: `${calc.anzahlPKW} PKW + ${calc.anzahlLKW} LKW Ladepunkte`,
    bess:      `${fmtNum(calc.graustromBESS)} MWh · ${fmtNum(calc.bessRendite, 1)} % Rendite`,
  };
  const rows = phases.map((p, i) => `
    <tr>
      <td class="td-center">${i + 1}</td>
      <td><strong>${p.label || p.key}</strong></td>
      <td class="td-right">${fmtEuro(investMap[p.key] || 0)}</td>
      <td>${benefitMap[p.key] || "—"}</td>
    </tr>`).join("");
  return `
    <div class="page">
      <h2 class="section-title">Phasenübersicht</h2>
      <table>
        <thead>
          <tr><th>#</th><th>Phase</th><th class="td-right">Investition</th><th>Kernvorteil</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function pageRoadmap(project, calc) {
  const phases = (project.phases || []).filter(p => p.enabled);
  const zeitraumMap = {
    analyse:   "Monat 1–3",
    pv:        "Monat 4–12",
    speicher:  "Jahr 1–2",
    waerme:    "Jahr 2–3",
    ladeinfra: "Jahr 2–4",
    bess:      "Jahr 3–5",
  };
  const meilensteinMap = {
    analyse:   "Lastgang, Potenzialanalyse, Förderantrag",
    pv:        "Genehmigung, Errichtung, Inbetriebnahme",
    speicher:  "BMS-Integration, Grid-Code-Zertifizierung",
    waerme:    "Wärmepumpe, Pufferspeicher, Wärmenetz",
    ladeinfra: "Wallboxen, HPC-Lader, Lademanagement",
    bess:      "Netzanschluss, FCR/aFRR-Zulassung, Pooling",
  };
  const investMap = {
    analyse:   calc.investPhase1,
    pv:        calc.investPhase2,
    speicher:  calc.investPhase3,
    waerme:    calc.investPhase4,
    ladeinfra: calc.investPhase5,
    bess:      calc.investPhase6,
  };
  const rows = phases.map(p => `
    <tr>
      <td><strong>${p.label || p.key}</strong></td>
      <td>${zeitraumMap[p.key] || "—"}</td>
      <td class="td-right">${fmtEuro(investMap[p.key] || 0)}</td>
      <td>${meilensteinMap[p.key] || "—"}</td>
    </tr>`).join("");
  return `
    <div class="page">
      <h2 class="section-title">Investitions-Roadmap</h2>
      <table>
        <thead>
          <tr><th>Phase</th><th>Zeitraum</th><th class="td-right">Investition</th><th>Meilensteine</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function pageFinanzierung(calc, p20) {
  const fin20 = p20.debtSchedule;
  const structRows = `
    <tr>
      <td class="td-right">${fmtEuro(calc.investGesamt)}</td>
      <td class="td-right">${fmtEuro(calc.ekBetrag)}</td>
      <td class="td-right">${fmtEuro(calc.kreditBetrag)}</td>
      <td class="td-right">—</td>
      <td class="td-right">—</td>
    </tr>`;
  const debtRows = fin20.slice(1, 21).map((r, i) => `
    <tr>
      <td class="td-center">${i + 1}</td>
      <td class="td-right">${fmtEuro(r.rest)}</td>
      <td class="td-right">${fmtEuro(r.zins)}</td>
      <td class="td-right">${fmtEuro(r.tilgung)}</td>
      <td class="td-right">${fmtEuro(r.annuitaet)}</td>
    </tr>`).join("");
  return `
    <div class="page">
      <h2 class="section-title">Finanzierung & Kreditstruktur</h2>
      <h3 class="sub-title">Finanzierungsstruktur</h3>
      <table>
        <thead>
          <tr><th class="td-right">Investition</th><th class="td-right">Eigenkapital</th><th class="td-right">Fremdkapital</th><th class="td-right">Zinssatz</th><th class="td-right">Laufzeit</th></tr>
        </thead>
        <tbody>${structRows}</tbody>
      </table>
      <h3 class="sub-title" style="margin-top:18px">Tilgungsplan (20 Jahre)</h3>
      <table>
        <thead>
          <tr><th class="td-center">Jahr</th><th class="td-right">Restschuld</th><th class="td-right">Zinsen</th><th class="td-right">Tilgung</th><th class="td-right">Annuität</th></tr>
        </thead>
        <tbody>${debtRows}</tbody>
      </table>
    </div>`;
}

function pageCashflow(p20) {
  const { rows } = p20;
  const tableRows = rows.slice(1).map(r => `
    <tr>
      <td class="td-center">${r.y}</td>
      <td class="td-right">${fmtEuro(r.strom)}</td>
      <td class="td-right">${fmtEuro(r.bess)}</td>
      <td class="td-right">${fmtEuro(r.wart)}</td>
      <td class="td-right">${fmtEuro(r.cf)}</td>
      <td class="td-right">${fmtEuro(r.cum)}</td>
      <td class="td-right">${fmtEuro(r.debt)}</td>
      <td class="td-right">${fmtEuro(r.cfFin)}</td>
      <td class="td-right">${fmtEuro(r.cumFin)}</td>
    </tr>`).join("");
  const svgStr = buildCashflowSvg(rows);
  return `
    <div class="page">
      <h2 class="section-title">20-Jahres Cashflow-Projektion</h2>
      <div class="chart-wrap">${svgStr}</div>
      <table style="font-size:8.5px;margin-top:12px">
        <thead>
          <tr>
            <th class="td-center">Jahr</th>
            <th class="td-right">Einsparung</th>
            <th class="td-right">BESS</th>
            <th class="td-right">Wartung</th>
            <th class="td-right">CF</th>
            <th class="td-right">Kum.CF</th>
            <th class="td-right">Schuldendienst</th>
            <th class="td-right">CF nach FK</th>
            <th class="td-right">Kum.CF.FK</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;
}

function pageSavings(calc) {
  const items = [
    { label: "Stromeinsparung",  value: calc.stromEinsparung },
    { label: "Einspeiseerlöse",  value: calc.einspeiseErloese },
    { label: "Peak Shaving",     value: calc.peakShavingSavings },
    { label: "Gaseinsparung",    value: calc.gasEinsparung },
    { label: "Mobilität",        value: calc.mobilitaetEinsparung },
    { label: "BESS-Erlöse",      value: calc.bessErloes },
  ];
  const rows = items.map(it => `
    <tr>
      <td>${it.label}</td>
      <td class="td-right">${fmtEuro(it.value)}/a</td>
    </tr>`).join("");
  const total = items.reduce((s, i) => s + i.value, 0);
  const svgStr = buildRevenueSvg(calc);
  return `
    <div class="page">
      <h2 class="section-title">Jährliche Einsparungen & Erlöse</h2>
      <div class="chart-wrap">${svgStr}</div>
      <table style="margin-top:12px;max-width:420px">
        <thead>
          <tr><th>Position</th><th class="td-right">Betrag/Jahr</th></tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td><strong>Gesamt</strong></td>
            <td class="td-right"><strong>${fmtEuro(total)}/a</strong></td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

function pageRegulatorik() {
  const items = [
    { reg: "EnWG §14a",      thema: "Steuerbare Verbrauchseinrichtungen",       status: "Relevant ab 4,2 kW",   massnahme: "Netzentgeltreduzierung via smart meter" },
    { reg: "EEG 2023",       thema: "Eigenversorgung & Direktvermarktung",       status: "Pflicht ab 100 kW",    massnahme: "Direktvermarktungsvertrag, Messkonzept" },
    { reg: "GEG",            thema: "Gebäudeenergiegesetz — Wärmepumpen",        status: "65 %-EE-Pflicht",      massnahme: "WP erfüllt Anforderungen, Förderantrag BEW" },
    { reg: "EU-Taxonomie",   thema: "Nachhaltigkeitsbericht",                    status: "Ab 500 MA verpflichtend",massnahme: "CO₂-Reporting, DNSH-Dokumentation" },
    { reg: "CSRD",           thema: "Corporate Sustainability Reporting",        status: "Ab 2025 stufenweise",  massnahme: "Energiedaten als CSRD-Nachweis nutzen" },
  ];
  const rows = items.map(it => `
    <tr>
      <td><strong>${it.reg}</strong></td>
      <td>${it.thema}</td>
      <td>${it.status}</td>
      <td>${it.massnahme}</td>
    </tr>`).join("");
  return `
    <div class="page">
      <h2 class="section-title">Regulatorik & Compliance</h2>
      <table>
        <thead>
          <tr><th>Regelwerk</th><th>Thema</th><th>Status</th><th>Maßnahme</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function pageFoerdermittel(project) {
  const enabledKeys = (project.phases || []).filter(p => p.enabled).map(p => p.key);
  const allFoerder = [
    { phase: "Phase I – Analyse",    key: "analyse",   prog: "BAFA Energieberatung",      detail: "80 % Förderung bis 6.000 €" },
    { phase: "Phase II – PV",        key: "pv",        prog: "KfW 270",                   detail: "bis 1,5 % Zinsvorteil" },
    { phase: "Phase II – PV",        key: "pv",        prog: "EEG-Einspeisevergütung",    detail: "0,075 €/kWh für 20 Jahre" },
    { phase: "Phase III – Speicher", key: "speicher",  prog: "KfW 275",                   detail: "Speicherbonus integriert" },
    { phase: "Phase III – Speicher", key: "speicher",  prog: "Landesförderung Speicher",  detail: "Variiert je Bundesland" },
    { phase: "Phase IV – Wärme",     key: "waerme",    prog: "BEW (Bundesförderung EW)", detail: "30 % Investitionszuschuss" },
    { phase: "Phase IV – Wärme",     key: "waerme",    prog: "KfW 261/262",               detail: "Effizientes Gebäude" },
    { phase: "Phase V – Ladeinfra",  key: "ladeinfra", prog: "KfW 439/441",               detail: "Ladepunkte Gewerbe & Flotte" },
    { phase: "Phase V – Ladeinfra",  key: "ladeinfra", prog: "THG-Quote",                 detail: "Erlöse bis 350 €/Fahrzeug/a" },
    { phase: "Phase VI – BESS",      key: "bess",      prog: "Capital Markets / PPA",     detail: "Langfrist-Abnahmevertrag FCR" },
  ];
  const filtered = allFoerder.filter(f => enabledKeys.includes(f.key));
  const rows = filtered.map(f => `
    <tr>
      <td>${f.phase}</td>
      <td><strong>${f.prog}</strong></td>
      <td>${f.detail}</td>
    </tr>`).join("");
  return `
    <div class="page">
      <h2 class="section-title">Fördermittel je Phase</h2>
      <table>
        <thead>
          <tr><th>Phase</th><th>Programm</th><th>Konditionen</th></tr>
        </thead>
        <tbody>${rows || "<tr><td colspan='3'>Keine Phasen aktiviert</td></tr>"}</tbody>
      </table>
    </div>`;
}

function pageRisiko() {
  const items = [
    { risiko: "Strompreisverfall",   eintritt: "Mittel",   auswirkung: "Hoch",   massnahme: "Langfrist-PPA, feste EEG-Vergütung" },
    { risiko: "Technologierisiko",   eintritt: "Gering",   auswirkung: "Mittel", massnahme: "Vollwartungsvertrag, OEM-Garantien" },
    { risiko: "Genehmigungsrisiko",  eintritt: "Mittel",   auswirkung: "Mittel", massnahme: "Frühzeitige Behördenkontakte, Puffer" },
    { risiko: "Zinsänderung",        eintritt: "Mittel",   auswirkung: "Mittel", massnahme: "Zinsbindung 10–15 Jahre, KfW-Festzins" },
    { risiko: "Fachkräftemangel",    eintritt: "Hoch",     auswirkung: "Gering", massnahme: "Rahmenvertrag Installateur, Vorlaufzeit" },
  ];
  const rows = items.map(it => `
    <tr>
      <td><strong>${it.risiko}</strong></td>
      <td class="td-center">${it.eintritt}</td>
      <td class="td-center">${it.auswirkung}</td>
      <td>${it.massnahme}</td>
    </tr>`).join("");
  return `
    <div class="page">
      <h2 class="section-title">Risikomanagement</h2>
      <table>
        <thead>
          <tr><th>Risiko</th><th class="td-center">Eintritts-W.</th><th class="td-center">Auswirkung</th><th>Maßnahme</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function pageKonfiguration(project) {
  const e = project.energy || {};
  const pc = project.phaseConfig || {};
  const fin = project.finance || {};
  const pv = pc.pv || {};
  const sp = pc.speicher || {};
  const wa = pc.waerme || {};
  const la = pc.ladeinfra || {};
  const be = pc.bess || {};
  const rows = [
    ["Energieverbrauch", ""],
    ["Stromverbrauch",         `${fmtNum(e.stromverbrauch || 0)} MWh/a`],
    ["Gasverbrauch",           `${fmtNum(e.gasverbrauch || 0)} MWh/a`],
    ["Strompreis",             `${fmtNum(e.strompreis || 0, 1)} ct/kWh`],
    ["Gaspreis",               `${fmtNum(e.gaspreis || 0, 1)} ct/kWh`],
    ["Bestand PV",             `${fmtNum(e.existingPV || 0, 2)} MWp`],
    ["PV-Konfiguration", ""],
    ["PV Dach",                `${fmtNum(pv.pvDach || 0, 2)} MWp`],
    ["PV Fassade",             `${fmtNum(pv.pvFassade || 0, 2)} MWp`],
    ["PV Carport",             `${fmtNum(pv.pvCarport || 0, 2)} MWp`],
    ["PV Freifläche",          `${fmtNum(pv.pvFreiflaeche || 0, 2)} MWp`],
    ["Speicher", ""],
    ["BESS Kapazität (Standort)", `${fmtNum(sp.kapazitaet || 0, 1)} MWh`],
    ["Wärme", ""],
    ["Wärmepumpe Leistung",   `${fmtNum(wa.wpLeistung || 0, 1)} MW`],
    ["Pufferspeicher",         `${fmtNum(wa.pufferspeicher || 0)} m³`],
    ["Ladeinfrastruktur", ""],
    ["Anzahl PKW",             `${fmtNum(la.anzahlPKW || 0)}`],
    ["Anzahl LKW",             `${fmtNum(la.anzahlLKW || 0)}`],
    ["km PKW/a",               `${fmtNum(la.kmPKW || 0)}`],
    ["km LKW/a",               `${fmtNum(la.kmLKW || 0)}`],
    ["Graustrom-BESS", ""],
    ["BESS Kapazität (Großspeicher)", `${fmtNum(be.kapazitaet || 0, 1)} MWh`],
    ["Finanzierung", ""],
    ["EK-Anteil",              `${fmtNum(fin.ekAnteil || 30)} %`],
    ["Kredit-Zinssatz",        `${fmtNum(fin.kreditZins || 4.5, 2)} %`],
    ["Kreditlaufzeit",         `${fmtNum(fin.kreditLaufzeit || 15)} Jahre`],
    ["Tilgungsfreie Jahre",    `${fmtNum(fin.tilgungsfrei || 2)} Jahre`],
  ].map(([k, v]) => v === ""
    ? `<tr class="config-header"><td colspan="2"><strong>${k}</strong></td></tr>`
    : `<tr><td>${k}</td><td class="td-right">${v}</td></tr>`
  ).join("");
  return `
    <div class="page">
      <h2 class="section-title">Individuelle Kalkulation</h2>
      <table style="max-width:480px">
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ─────────────────────────────────────────────
   Full HTML document
───────────────────────────────────────────── */
function buildHtmlDocument(project, selected) {
  const calc = calculateAll(project);
  const p20  = project20Years(project);
  const comp = project.company || {};

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #2B2B2B; background: #fff; }
    .page { page-break-after: always; padding: 8mm 0; min-height: 260mm; }
    .page:last-child { page-break-after: auto; }

    /* Cover */
    .cover-page { background: #1B2A4A; color: #F5F5F0; display: flex; align-items: center; justify-content: center; min-height: 277mm; }
    .cover-inner { text-align: center; padding: 40px; }
    .cover-logo { font-size: 13px; letter-spacing: 4px; text-transform: uppercase; color: #D4A843; margin-bottom: 32px; }
    .cover-company { font-size: 38px; font-weight: 700; color: #F5F5F0; margin-bottom: 16px; line-height: 1.2; }
    .cover-subtitle { font-size: 18px; color: #D4A843; margin-bottom: 32px; font-weight: 400; }
    .cover-meta { display: flex; gap: 24px; justify-content: center; color: #B0B0A6; font-size: 11px; margin-bottom: 48px; }
    .cover-footer { font-size: 9px; color: #B0B0A6; letter-spacing: 1px; }

    /* Typography */
    .section-title { font-size: 18px; font-weight: 700; color: #1B2A4A; border-bottom: 2px solid #D4A843; padding-bottom: 6px; margin-bottom: 16px; }
    .sub-title { font-size: 12px; font-weight: 600; color: #1B2A4A; margin-bottom: 8px; }

    /* KPI grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 8px; }
    .kpi-card { border: 1px solid #ddd; border-radius: 6px; padding: 10px 12px; background: #f9f9f7; }
    .kpi-label { font-size: 8.5px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .kpi-value { font-size: 16px; font-weight: 700; color: #1B2A4A; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    th { background: #1B2A4A; color: #F5F5F0; padding: 5px 8px; text-align: left; font-weight: 600; font-size: 9px; }
    td { padding: 4px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr:nth-child(even) td { background: #f7f7f5; }
    .td-right { text-align: right; }
    .td-center { text-align: center; }
    .total-row td { border-top: 2px solid #D4A843; background: #fffbf0 !important; }
    .config-header td { background: #f0f0ec !important; color: #1B2A4A; padding-top: 8px; }

    /* Chart */
    .chart-wrap { margin: 12px 0; overflow: hidden; }
    .chart-wrap svg { display: block; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { page-break-after: always; }
      .cover-page { -webkit-print-color-adjust: exact; }
    }
  `;

  const pages = [];

  if (selected.cover)        pages.push(pageCover(project));
  if (selected.overview)     pages.push(pageOverview(calc));
  if (selected.phases)       pages.push(pagePhases(project, calc));
  if (selected.roadmap)      pages.push(pageRoadmap(project, calc));
  if (selected.finanzierung) pages.push(pageFinanzierung(calc, p20));
  if (selected.cashflow)     pages.push(pageCashflow(p20));
  if (selected.savings)      pages.push(pageSavings(calc));
  if (selected.regulatorik)  pages.push(pageRegulatorik());
  if (selected.foerdermittel)pages.push(pageFoerdermittel(project));
  if (selected.risiko)       pages.push(pageRisiko());
  if (selected.konfiguration)pages.push(pageKonfiguration(project));

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${comp.name || "PitchPilot"} — Energietransformation</title>
  <style>${css}</style>
</head>
<body>
  ${pages.join("\n")}
</body>
</html>`;
}

/* ─────────────────────────────────────────────
   PDF generation
───────────────────────────────────────────── */
function generatePdf(project, selected) {
  const html = buildHtmlDocument(project, selected);
  const win = window.open("", "_blank");
  if (!win) {
    alert("Bitte Popup-Blocker für diese Seite deaktivieren.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    setTimeout(() => win.print(), 300);
  };
}

/* ─────────────────────────────────────────────
   Modal UI styles
───────────────────────────────────────────── */
function getStyles(T) {
  return {
    overlay: {
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(11,18,30,0.72)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    },
    dialog: {
      background: T.navy,
      border: `1px solid ${T.navyLight}`,
      borderRadius: "14px",
      width: "100%", maxWidth: "620px",
      maxHeight: "90vh",
      display: "flex", flexDirection: "column",
      boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
      overflow: "hidden",
    },
    header: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "20px 24px 16px",
      borderBottom: `1px solid ${T.navyLight}`,
    },
    headerTitle: {
      fontSize: "18px", fontWeight: 700, color: T.warmWhite,
      display: "flex", alignItems: "center", gap: "10px",
    },
    closeBtn: {
      width: "44px", height: "44px",
      background: "none", border: `1px solid ${T.navyLight}`,
      borderRadius: "8px", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: T.softGray, transition: "all 0.15s",
    },
    body: {
      flex: 1, overflowY: "auto", padding: "20px 24px",
    },
    groupLabel: {
      fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px",
      textTransform: "uppercase", color: T.gold,
      marginBottom: "8px", marginTop: "16px",
    },
    sectionGrid: {
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px",
    },
    checkItem: {
      display: "flex", alignItems: "center", gap: "10px",
      padding: "8px 10px", borderRadius: "8px",
      background: T.navyLight, cursor: "pointer",
      transition: "background 0.15s", userSelect: "none",
    },
    checkItemLocked: {
      display: "flex", alignItems: "center", gap: "10px",
      padding: "8px 10px", borderRadius: "8px",
      background: T.navyMid, cursor: "default",
      userSelect: "none", opacity: 0.75,
    },
    checkLabel: {
      fontSize: "13px", color: T.warmWhite, flex: 1,
    },
    checkLabelLocked: {
      fontSize: "13px", color: T.softGray, flex: 1,
    },
    lockedBadge: {
      fontSize: "9px", color: T.softGray, letterSpacing: "0.5px",
    },
    footer: {
      padding: "16px 24px",
      borderTop: `1px solid ${T.navyLight}`,
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
    },
    previewText: {
      fontSize: "12px", color: T.softGray,
    },
    previewCount: {
      color: T.gold, fontWeight: 700,
    },
    generateBtn: {
      display: "flex", alignItems: "center", gap: "8px",
      padding: "12px 24px",
      background: T.gold, color: T.navyDeep,
      border: "none", borderRadius: "8px",
      fontSize: "14px", fontWeight: 700, cursor: "pointer",
      transition: "background 0.15s",
    },
  };
}

/* ─────────────────────────────────────────────
   Checkbox component
───────────────────────────────────────────── */
function SectionCheck({ section, checked, onChange }) {
  const T = useTheme();
  const S = getStyles(T);
  if (section.locked) {
    return (
      <div style={S.checkItemLocked}>
        <div style={{
          width: 18, height: 18, borderRadius: 4,
          background: T.gold, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="check" size={11} color={T.navyDeep} />
        </div>
        <span style={S.checkLabelLocked}>{section.label}</span>
        <span style={S.lockedBadge}>Pflicht</span>
      </div>
    );
  }
  return (
    <label style={{ ...S.checkItem, background: checked ? T.navyMid : T.navyLight }}>
      <div style={{
        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
        background: checked ? T.gold : "transparent",
        border: `2px solid ${checked ? T.gold : T.softGray}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}>
        {checked && <Icon name="check" size={11} color={T.navyDeep} />}
      </div>
      <span style={S.checkLabel}>{section.label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(section.key, e.target.checked)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
      />
    </label>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function PdfExport({ project, onClose }) {
  const T = useTheme();
  const S = getStyles(T);
  const [selected, setSelected] = useState(() =>
    Object.fromEntries(SECTIONS.map(s => [s.key, s.def]))
  );
  const [generating, setGenerating] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleChange = useCallback((key, val) => {
    setSelected(prev => ({ ...prev, [key]: val }));
  }, []);

  const selectedCount = SECTIONS.filter(s => selected[s.key]).length;

  const handleGenerate = useCallback(() => {
    setGenerating(true);
    // defer to next tick so UI updates before blocking work
    setTimeout(() => {
      try {
        generatePdf(project, selected);
      } catch (err) {
        console.error("PDF generation error:", err);
        alert("Fehler beim PDF-Export. Bitte erneut versuchen.");
      } finally {
        setGenerating(false);
      }
    }, 50);
  }, [project, selected]);

  const pGroups = SECTIONS.filter(s => s.group === "p");
  const wGroups = SECTIONS.filter(s => s.group === "w");

  return (
    <div
      style={S.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="PDF Export"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={S.dialog}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.headerTitle}>
            <Icon name="download" size={20} color={T.gold} />
            PDF Export
          </div>
          <button
            style={S.closeBtn}
            onClick={onClose}
            aria-label="Schließen"
          >
            <Icon name="plus" size={18} color={T.softGray} style={{ transform: "rotate(45deg)" }} />
          </button>
        </div>

        {/* Body */}
        <div style={S.body}>
          <p style={{ fontSize: "12px", color: T.softGray, marginBottom: "4px" }}>
            Wählen Sie die Abschnitte aus, die im PDF enthalten sein sollen.
          </p>

          {/* Präsentation */}
          <div style={S.groupLabel}>Präsentation</div>
          <div style={S.sectionGrid}>
            {pGroups.map(s => (
              <SectionCheck
                key={s.key}
                section={s}
                checked={selected[s.key]}
                onChange={handleChange}
              />
            ))}
          </div>

          {/* Wirtschaftlichkeit */}
          <div style={S.groupLabel}>Wirtschaftlichkeit</div>
          <div style={S.sectionGrid}>
            {wGroups.map(s => (
              <SectionCheck
                key={s.key}
                section={s}
                checked={selected[s.key]}
                onChange={handleChange}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <div style={S.previewText}>
            <span style={S.previewCount}>{selectedCount}</span> von {SECTIONS.length} Abschnitten ausgewählt
          </div>
          <button
            style={{
              ...S.generateBtn,
              opacity: generating ? 0.7 : 1,
              cursor: generating ? "not-allowed" : "pointer",
            }}
            onClick={handleGenerate}
            disabled={generating}
          >
            <Icon name="download" size={16} color={T.navyDeep} />
            {generating ? "Wird erstellt…" : "PDF erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}
