/**
 * Generalized calculation engine for energy transformation pitches.
 * Full Eckart-level calculations with NaN guards, 20-year projection, Tilgungsplan.
 */

const PV_YIELD = 950; // kWh/kWp/a (Bavaria average)
const CO2_GRID = 0.382; // t CO₂/MWh (DE grid mix 2024)
const CO2_GAS = 0.201; // t CO₂/MWh
const CO2_DIESEL = 2.65; // kg CO₂/l
const EEG_TARIFF = 0.075; // €/kWh

export function calculateAll(project) {
  const e = project.energy || {};
  const pc = project.phaseConfig || {};
  const fin = project.finance || {};
  const phases = project.phases || [];
  const mob = pc.ladeinfra || {};

  const stromverbrauch = e.stromverbrauch || 10000;
  const gasverbrauch = e.gasverbrauch || 5000;
  const strompreis = e.strompreis || 22; // ct/kWh
  const gaspreis = e.gaspreis || 7;
  const dieselpreis = mob.dieselpreis || 1.55;

  /* ── PV ── */
  const pvConf = pc.pv || {};
  const pvDach = pvConf.pvDach || 0;
  const pvFassade = pvConf.pvFassade || 0;
  const pvCarport = pvConf.pvCarport || 0;
  const pvFreiflaeche = pvConf.pvFreiflaeche || 0;
  const pvBestand = e.existingPV || 0;
  const totalPV = pvDach + pvFassade + pvCarport + pvFreiflaeche + pvBestand;
  const pvErzeugung = Math.round(totalPV * PV_YIELD); // MWh/a

  /* ── Self-consumption ── */
  const baseRatio = pvErzeugung > 0
    ? Math.max(0, Math.min(0.55, (stromverbrauch / pvErzeugung) * 0.55))
    : 0;
  const spConf = pc.speicher || {};
  const standortBESS = spConf.kapazitaet || 0;
  const bessBoost = standortBESS > 0 && pvErzeugung > 0
    ? Math.max(0, Math.min(0.25, (standortBESS / pvErzeugung) * 3))
    : 0;
  const eigenverbrauchsquote = Math.round(Math.max(0, Math.min(93, (baseRatio + bessBoost) * 100)));
  const eigenverbrauch = Math.round(pvErzeugung * eigenverbrauchsquote / 100);
  const einspeisung = Math.round(pvErzeugung - eigenverbrauch);
  const restbezug = Math.max(0, stromverbrauch - eigenverbrauch);

  /* ── Strom savings ── */
  const stromEinsparung = Math.round(eigenverbrauch * strompreis * 10); // €/a
  const einspeiseErloese = Math.round(einspeisung * EEG_TARIFF * 1000);

  /* ── Peak Shaving ── */
  const peakShavingRate = standortBESS > 0 && stromverbrauch > 0
    ? Math.max(0, Math.min(0.15, (standortBESS / stromverbrauch) * 8))
    : 0;
  const peakShavingSavings = Math.round(stromverbrauch * strompreis * 10 * peakShavingRate * 0.12);

  /* ── Heat ── */
  const wConf = pc.waerme || {};
  const wpLeistung = wConf.wpLeistung || 0;
  const pufferspeicher = wConf.pufferspeicher || 0;
  const wpErzeugung = Math.round(wpLeistung * 2200); // MWh therm/a
  const gasErsatzRate = gasverbrauch > 0 ? Math.round(Math.max(0, Math.min(85, (wpErzeugung / gasverbrauch) * 100))) : 0;
  const gasEinsparung = Math.round(gasverbrauch * (gasErsatzRate / 100) * gaspreis * 10);

  /* ── Mobility PKW ── */
  const anzahlPKW = mob.anzahlPKW || 0;
  const anzahlLKW = mob.anzahlLKW || 0;
  const kmPKW = mob.kmPKW || 15000;
  const kmLKW = mob.kmLKW || 60000;
  const pkwDieselL = anzahlPKW * kmPKW * 0.07;
  const pkwDieselKosten = pkwDieselL * dieselpreis;
  const pkwStromKosten = anzahlPKW * kmPKW * 0.0002 * strompreis * 10;
  const pkwEinsparung = Math.max(0, Math.round(pkwDieselKosten - pkwStromKosten));

  /* ── Mobility LKW ── */
  const lkwDieselL = anzahlLKW * kmLKW * 0.32;
  const lkwDieselKosten = lkwDieselL * dieselpreis;
  const lkwStromKosten = anzahlLKW * kmLKW * 0.0012 * strompreis * 10;
  const lkwEinsparung = Math.max(0, Math.round(lkwDieselKosten - lkwStromKosten));
  const mobilitaetEinsparung = pkwEinsparung + lkwEinsparung;

  /* ── Graustrom-BESS ── */
  const bConf = pc.bess || {};
  const graustromBESS = bConf.kapazitaet || 0;
  const bessLeistung = graustromBESS / 2; // MW (2h system)
  const bessErloes = Math.round(graustromBESS * 42500); // €/a

  /* ── CO₂ ── */
  const co2Strom = Math.round(eigenverbrauch * CO2_GRID);
  const co2Waerme = Math.round(gasverbrauch * (gasErsatzRate / 100) * CO2_GAS);
  const co2PKW = Math.round(pkwDieselL * CO2_DIESEL / 1000);
  const co2LKW = Math.round(lkwDieselL * CO2_DIESEL / 1000);
  const co2Gesamt = co2Strom + co2Waerme + co2PKW + co2LKW;
  const co2Kosten = Math.round(co2Gesamt * 60); // €/a (ETS ~60 €/t)

  /* ── Investitionen ── */
  const isEnabled = (key) => phases.find(p => p.key === key)?.enabled;

  const investPhase1 = 65000;
  const investPhase2 = isEnabled("pv")
    ? Math.round(pvDach * 650000 + pvFassade * 650000 + pvCarport * 1200000 + pvFreiflaeche * 550000)
    : 0;
  const investPhase3 = isEnabled("speicher")
    ? Math.round(standortBESS * 187000 + (standortBESS > 0 ? 185000 : 0))
    : 0;
  const investPhase4 = isEnabled("waerme") && wpLeistung > 0
    ? Math.round(wpLeistung * 400000 + 1000000 + pufferspeicher * 600 + 800000)
    : 0;
  const investPhase5 = isEnabled("ladeinfra") && (anzahlPKW > 0 || anzahlLKW > 0)
    ? Math.round(
        anzahlPKW * 2500
        + (anzahlPKW > 0 ? Math.ceil(anzahlPKW / 12) * 75000 : 0)
        + (anzahlLKW > 0 ? Math.max(1, Math.ceil(anzahlLKW * 0.5)) * 200000 : 0)
        + 350000
      )
    : 0;
  const investPhase6 = isEnabled("bess") && graustromBESS > 0
    ? Math.round(graustromBESS * 175000 + 6500000)
    : 0;

  const investStandort = investPhase1 + investPhase2 + investPhase3 + investPhase4 + investPhase5;
  const investGesamt = investStandort + investPhase6;

  /* ── Savings summary ── */
  const einsparungStandort = stromEinsparung + einspeiseErloese + peakShavingSavings + gasEinsparung + mobilitaetEinsparung;
  const gesamtertrag = einsparungStandort + bessErloes;
  const amortisationStandort = einsparungStandort > 0 ? Math.round((investStandort / einsparungStandort) * 10) / 10 : 99;
  const amortisationGesamt = gesamtertrag > 0 ? Math.round((investGesamt / gesamtertrag) * 10) / 10 : 99;
  const bessRenditeRaw = investPhase6 > 0 ? (bessErloes / investPhase6) * 100 : 0;
  const bessRendite = isFinite(bessRenditeRaw) ? Math.round(bessRenditeRaw * 10) / 10 : 0;

  /* ── Autarkie ── */
  const autarkieRaw = stromverbrauch > 0
    ? Math.min(95, Math.round(Math.max(0, Math.min(1, eigenverbrauch / stromverbrauch)) * 60 + (gasErsatzRate / 100) * 30 + 5))
    : 0;
  const autarkie = isFinite(autarkieRaw) ? autarkieRaw : 0;

  /* ── Finanzierung ── */
  const ekAnteilPct = fin.ekAnteil || 30;
  const ekBetrag = Math.round(investGesamt * (ekAnteilPct / 100));
  const kreditBetrag = investGesamt - ekBetrag;
  const zinsRate = (fin.kreditZins || 4.5) / 100;
  const kreditLaufzeit = fin.kreditLaufzeit || 15;
  const tilgungsfrei = fin.tilgungsfrei || 2;
  const tilgungsJahre = Math.max(1, kreditLaufzeit - tilgungsfrei);
  const zinsTilgungsfrei = Math.round(kreditBetrag * zinsRate);

  const annuitaetRaw = tilgungsJahre > 0 && zinsRate > 0
    ? kreditBetrag * (zinsRate * Math.pow(1 + zinsRate, tilgungsJahre)) / (Math.pow(1 + zinsRate, tilgungsJahre) - 1)
    : tilgungsJahre > 0 ? kreditBetrag / tilgungsJahre : 0;
  const annuitaet = isFinite(annuitaetRaw) ? Math.round(annuitaetRaw) : 0;

  const totalSchuldendienst = zinsTilgungsfrei * tilgungsfrei + annuitaet * tilgungsJahre;
  const totalZinskosten = Math.round(totalSchuldendienst - kreditBetrag);
  const cfNachSchuldendienst = Math.round(gesamtertrag - annuitaet);
  const ekRenditeRaw = ekBetrag > 0 ? (cfNachSchuldendienst / ekBetrag) * 100 : 0;
  const ekRendite = isFinite(ekRenditeRaw) ? Math.round(ekRenditeRaw * 10) / 10 : 0;
  const dscrRaw = annuitaet > 0 ? gesamtertrag / annuitaet : 99;
  const dscr = isFinite(dscrRaw) ? Math.round(dscrRaw * 100) / 100 : 99;

  return {
    totalPV, pvErzeugung, eigenverbrauchsquote, eigenverbrauch, einspeisung, restbezug,
    standortBESS, peakShavingSavings,
    wpLeistung, pufferspeicher, wpErzeugung, gasErsatzRate, gasEinsparung,
    anzahlPKW, anzahlLKW, kmPKW, kmLKW, dieselpreis,
    pkwEinsparung, lkwEinsparung, mobilitaetEinsparung,
    graustromBESS, bessLeistung, bessErloes, bessRendite,
    stromEinsparung, einspeiseErloese, peakShavingSavings,
    einsparungStandort, gesamtertrag,
    co2Strom, co2Waerme, co2PKW, co2LKW, co2Gesamt, co2Kosten,
    investPhase1, investPhase2, investPhase3, investPhase4, investPhase5, investPhase6,
    investStandort, investGesamt,
    amortisationStandort, amortisationGesamt, autarkie,
    ekBetrag, kreditBetrag, zinsTilgungsfrei, annuitaet,
    totalZinskosten, cfNachSchuldendienst, ekRendite, dscr, tilgungsJahre,
  };
}

/** 20-Year Cashflow Projection */
export function project20Years(project) {
  const calc = calculateAll(project);
  const fin = project.finance || {};
  const zinsRate = (fin.kreditZins || 4.5) / 100;
  const tilgungsfrei = fin.tilgungsfrei || 2;

  // Tilgungsplan
  let restschuld = calc.kreditBetrag;
  const debtSchedule = [];
  for (let y = 0; y <= 20; y++) {
    if (y === 0) { debtSchedule.push({ zins: 0, tilgung: 0, annuitaet: 0, rest: restschuld }); continue; }
    if (restschuld <= 0) { debtSchedule.push({ zins: 0, tilgung: 0, annuitaet: 0, rest: 0 }); continue; }
    const zins = restschuld * zinsRate;
    let tilgung = 0;
    if (y > tilgungsfrei && restschuld > 0) {
      tilgung = Math.min(restschuld, calc.annuitaet - zins);
      if (tilgung < 0) tilgung = 0;
    }
    restschuld = Math.max(0, restschuld - tilgung);
    debtSchedule.push({ zins: Math.round(zins), tilgung: Math.round(tilgung), annuitaet: Math.round(zins + tilgung), rest: Math.round(restschuld) });
  }

  // Cashflow rows
  const rows = [];
  let cumCf = 0, cumCfFin = 0;
  for (let y = 0; y <= 20; y++) {
    if (y === 0) {
      rows.push({
        y, inv: -calc.investGesamt, invFin: -calc.ekBetrag,
        strom: 0, einsp: 0, peak: 0, gas: 0, mob: 0, bess: 0, wart: 0,
        cf: -calc.investGesamt, cum: -calc.investGesamt,
        debt: 0, cfFin: -calc.ekBetrag, cumFin: -calc.ekBetrag,
        restschuld: calc.kreditBetrag,
      });
      cumCf = -calc.investGesamt;
      cumCfFin = -calc.ekBetrag;
      continue;
    }
    const pvF = Math.pow(0.995, y);
    const pF = Math.pow(1.02, y);
    const strom = Math.round(calc.stromEinsparung * pvF * pF);
    const einsp = Math.round(calc.einspeiseErloese * pvF);
    const peak = Math.round(calc.peakShavingSavings * pF);
    const gas = Math.round(calc.gasEinsparung * Math.pow(1.025, y));
    const mob = Math.round(calc.mobilitaetEinsparung * pF);
    const bess = Math.round(calc.bessErloes * Math.pow(1.01, y));
    const wart = Math.round(calc.investStandort * 0.015 + calc.investPhase6 * 0.008);
    const cf = strom + einsp + peak + gas + mob + bess - wart;
    cumCf += cf;
    const debt = debtSchedule[y].annuitaet;
    const cfFin = cf - debt;
    cumCfFin += cfFin;
    rows.push({
      y, inv: 0, invFin: 0,
      strom, einsp, peak, gas, mob, bess, wart,
      cf, cum: Math.round(cumCf),
      debt, cfFin, cumFin: Math.round(cumCfFin),
      restschuld: debtSchedule[y].rest,
    });
  }
  return { rows, debtSchedule, calc };
}

/** Phase-specific KPI items */
export function getPhaseCalcItems(phaseKey, calc) {
  const items = {
    analyse: [{ label: "Investition", value: fmtEuro(calc.investPhase1) }],
    pv: [
      { label: "Gesamt-PV", value: `${fmtNum(calc.totalPV, 1)} MWp`, accent: true },
      { label: "Jahreserzeugung", value: `${fmtNum(calc.pvErzeugung)} MWh/a` },
      { label: "Eigenverbrauch", value: `${calc.eigenverbrauchsquote}%` },
      { label: "Investition", value: fmtEuro(calc.investPhase2) },
      { label: "Stromersparnis", value: `${fmtEuro(calc.stromEinsparung)}/a`, accent: true },
    ],
    speicher: [
      { label: "BESS Kapazität", value: `${fmtNum(calc.standortBESS, 1)} MWh` },
      { label: "Peak Shaving", value: `${fmtEuro(calc.peakShavingSavings)}/a`, accent: true },
      { label: "Investition", value: fmtEuro(calc.investPhase3) },
    ],
    waerme: [
      { label: "WP-Leistung", value: `${fmtNum(calc.wpLeistung, 1)} MW` },
      { label: "Gasreduktion", value: `${calc.gasErsatzRate}%` },
      { label: "Gasersparnis", value: `${fmtEuro(calc.gasEinsparung)}/a`, accent: true },
      { label: "Investition", value: fmtEuro(calc.investPhase4) },
    ],
    ladeinfra: [
      { label: "PKW Ladepunkte", value: `${calc.anzahlPKW}` },
      { label: "LKW Ladepunkte", value: `${calc.anzahlLKW}` },
      { label: "Mobilitätseinsparung", value: `${fmtEuro(calc.mobilitaetEinsparung)}/a`, accent: true },
      { label: "Investition", value: fmtEuro(calc.investPhase5) },
    ],
    bess: [
      { label: "Leistung / Kapazität", value: `${fmtNum(calc.bessLeistung)} MW / ${fmtNum(calc.graustromBESS)} MWh` },
      { label: "Jährliche Erlöse", value: `${fmtEuro(calc.bessErloes)}/a`, accent: true },
      { label: "Rendite", value: `${fmtNum(calc.bessRendite, 1)}% p.a.`, accent: true },
      { label: "Investition", value: fmtEuro(calc.investPhase6) },
    ],
  };
  return items[phaseKey] || null;
}

/** Dynamic hero cards for final summary */
export function getDynamicHeroCards(calc) {
  return [
    {
      icon: "leaf", accent: "green",
      label: "CO₂-Einsparung pro Jahr",
      value: `~${fmtNum(calc.co2Gesamt)} t`,
      sub: `${fmtEuro(calc.co2Kosten)}/a vermiedene CO₂-Kosten`,
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
      sub: "Einsparung + Erlöse pro Jahr",
      details: [
        { label: "Standort (I–V)", value: `${fmtEuro(calc.einsparungStandort)}/a` },
        { label: "BESS Erlöse (VI)", value: `${fmtEuro(calc.bessErloes)}/a` },
      ],
    },
  ];
}

/** CSV Lastgang parser */
export function parseLastgangCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 10) return null;
  const sep = lines[0].includes(";") ? ";" : ",";
  const startIdx = /^[a-zA-Z"Datum]/.test(lines[0]) ? 1 : 0;
  const values = [];
  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(sep);
    for (let j = parts.length - 1; j >= 0; j--) {
      const val = parseFloat(parts[j].replace(",", ".").replace(/[^\d.-]/g, ""));
      if (!isNaN(val) && val >= 0) { values.push(val); break; }
    }
  }
  if (values.length < 100) return null;
  const total = values.reduce((a, b) => a + b, 0);
  const peak = Math.max(...values.slice(0, 50000));
  let annualMWh;
  if (values.length > 30000) annualMWh = total * 0.25 / 1000;
  else if (values.length > 7000) annualMWh = total / 1000;
  else annualMWh = total / 1000;
  return { annualMWh: Math.round(annualMWh), peakKW: Math.round(peak), dataPoints: values.length };
}

/** Format Euro */
export function fmtEuro(n) {
  if (!isFinite(n)) return "0 €";
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1).replace(".", ",")} Mio. €`;
  if (Math.abs(n) >= 1e3) return `${Math.round(n / 1e3).toLocaleString("de-DE")} T€`;
  return `${Math.round(n).toLocaleString("de-DE")} €`;
}

/** Format number */
export function fmtNum(val, dec = 0) {
  if (val == null || !isFinite(val)) return "0";
  return Number(val).toLocaleString("de-DE", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
