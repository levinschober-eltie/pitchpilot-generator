/**
 * Generalized calculation engine for energy transformation pitches.
 * Adapted from Eckart calcEngine — all values derived from project config.
 */

const PV_YIELD = 950; // kWh/kWp/a (Bavaria average)
const CO2_GRID = 0.382; // t CO₂/MWh (DE grid mix 2024)
const CO2_GAS = 0.201; // t CO₂/MWh
const EEG_VERGUETUNG = 0.075; // €/kWh

export function calculateAll(project) {
  const e = project.energy || {};
  const pc = project.phaseConfig || {};
  const fin = project.finance || {};
  const phases = project.phases || [];

  const stromverbrauch = e.stromverbrauch || 10000; // MWh/a
  const gasverbrauch = e.gasverbrauch || 5000;
  const strompreis = (e.strompreis || 22) / 100; // €/kWh
  const gaspreis = (e.gaspreis || 7) / 100;

  // PV
  const pvConf = pc.pv || {};
  const pvDach = pvConf.pvDach || 0;
  const pvFassade = pvConf.pvFassade || 0;
  const pvCarport = pvConf.pvCarport || 0;
  const pvBestand = e.existingPV || 0;
  const totalPV = pvDach + pvFassade + pvCarport + pvBestand;
  const pvErzeugung = totalPV * PV_YIELD; // MWh/a
  const eigenverbrauchsquote = totalPV > 0 ? Math.min(0.85, 0.3 + (stromverbrauch * 1000) / (pvErzeugung > 0 ? pvErzeugung : 1) * 0.15) : 0;
  const eigenverbrauch = pvErzeugung * eigenverbrauchsquote / 1000; // MWh
  const einspeisung = pvErzeugung / 1000 - eigenverbrauch;
  const restbezug = Math.max(0, stromverbrauch - eigenverbrauch);

  // Storage
  const spConf = pc.speicher || {};
  const bessKap = spConf.kapazitaet || 0;
  const peakShavingSavings = spConf.peakShaving && bessKap > 0 ? bessKap * 25000 : 0; // €/a

  // Heat
  const wConf = pc.waerme || {};
  const wpLeistung = wConf.wpLeistung || 0;
  const cop = 3.5;
  const waermeErzeugung = wpLeistung * 2000; // MWh/a (2000 Volllaststunden)
  const gasErsatzRate = gasverbrauch > 0 ? Math.min(1, waermeErzeugung / gasverbrauch) : 0;
  const gasEinsparung = gasverbrauch * gasErsatzRate * gaspreis * 1000; // €/a
  const wpStromkosten = waermeErzeugung / cop * strompreis * 1000;
  const waermeNetto = gasEinsparung - wpStromkosten;

  // Mobility
  const lConf = pc.ladeinfra || {};
  const anzahlPKW = lConf.anzahlPKW || 0;
  const anzahlLKW = lConf.anzahlLKW || 0;
  const mobilitaetEinsparung = anzahlPKW * 1200 + anzahlLKW * 5000; // €/a (Diesel→Strom savings)

  // BESS (grid-scale)
  const bConf = pc.bess || {};
  const graustromBESS = bConf.kapazitaet || 0;
  const bessRevenue = graustromBESS * 85000; // €/a (850 €/MWh/a revenue)
  const bessInvest = graustromBESS * 250000; // €
  const bessRendite = bessInvest > 0 ? (bessRevenue / bessInvest * 100) : 0;

  // Savings
  const stromEinsparung = eigenverbrauch * strompreis * 1000; // €/a
  const einspeiseErloese = einspeisung * EEG_VERGUETUNG * 1000;
  const gesamtEinsparungJahr = stromEinsparung + einspeiseErloese + peakShavingSavings + waermeNetto + mobilitaetEinsparung + bessRevenue;

  // CO₂
  const co2Strom = eigenverbrauch * CO2_GRID; // t/a
  const co2Waerme = gasverbrauch * gasErsatzRate * CO2_GAS;
  const co2Mobilitaet = (anzahlPKW * 2.5 + anzahlLKW * 15); // t/a
  const co2Gesamt = co2Strom + co2Waerme + co2Mobilitaet;

  // Investment per phase
  const pvEnabled = phases.find(p => p.key === "pv")?.enabled;
  const spEnabled = phases.find(p => p.key === "speicher")?.enabled;
  const wEnabled = phases.find(p => p.key === "waerme")?.enabled;
  const lEnabled = phases.find(p => p.key === "ladeinfra")?.enabled;
  const bEnabled = phases.find(p => p.key === "bess")?.enabled;

  const investAnalyse = 65000;
  const investPV = pvEnabled ? totalPV * 850000 : 0;
  const investSpeicher = spEnabled ? bessKap * 450000 : 0;
  const investWaerme = wEnabled ? wpLeistung * 600000 : 0;
  const investLade = lEnabled ? (anzahlPKW * 8000 + anzahlLKW * 45000) : 0;
  const investBESS = bEnabled ? bessInvest : 0;
  const investGesamt = investAnalyse + investPV + investSpeicher + investWaerme + investLade + investBESS;

  // Finance
  const ekAnteil = (fin.ekAnteil || 30) / 100;
  const ekBetrag = investGesamt * ekAnteil;
  const kreditBetrag = investGesamt - ekBetrag;
  const zins = (fin.kreditZins || 4.5) / 100;
  const laufzeit = fin.kreditLaufzeit || 15;
  const annuitaetsFaktor = zins > 0 ? (zins * Math.pow(1 + zins, laufzeit)) / (Math.pow(1 + zins, laufzeit) - 1) : 1 / laufzeit;
  const annuitaet = kreditBetrag * annuitaetsFaktor;

  const amortisation = gesamtEinsparungJahr > 0 ? investGesamt / gesamtEinsparungJahr : 99;
  const autarkie = stromverbrauch > 0 ? Math.min(95, (eigenverbrauch / stromverbrauch) * 100 + (bessKap > 0 ? 15 : 0)) : 0;

  return {
    // PV
    totalPV, pvErzeugung, eigenverbrauchsquote, eigenverbrauch, einspeisung, restbezug,
    // Storage
    bessKap, peakShavingSavings,
    // Heat
    wpLeistung, gasErsatzRate, gasEinsparung, waermeNetto, waermeErzeugung,
    // Mobility
    anzahlPKW, anzahlLKW, mobilitaetEinsparung,
    // BESS
    graustromBESS, bessRevenue, bessRendite,
    // Savings
    stromEinsparung, einspeiseErloese, gesamtEinsparungJahr,
    // CO₂
    co2Strom, co2Waerme, co2Mobilitaet, co2Gesamt,
    // Investment
    investAnalyse, investPV, investSpeicher, investWaerme, investLade, investBESS, investGesamt,
    // Finance
    ekBetrag, kreditBetrag, annuitaet, amortisation, autarkie,
  };
}

/** Format Euro values */
export function fmtEuro(val) {
  if (!val || isNaN(val)) return "0 €";
  if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1).replace(".", ",") + " Mio. €";
  if (Math.abs(val) >= 1e3) return Math.round(val / 1e3).toLocaleString("de-DE") + " T€";
  return Math.round(val).toLocaleString("de-DE") + " €";
}

export function fmtNum(val, dec = 0) {
  if (val == null || isNaN(val)) return "0";
  return Number(val).toLocaleString("de-DE", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
