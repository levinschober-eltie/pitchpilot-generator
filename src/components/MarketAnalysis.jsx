/**
 * MarketAnalysis.jsx
 * Comprehensive energy market analysis modal for PitchPilot Generator.
 * Generalized from Eckart Werke pitch — works with any project config.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { B, C } from "../colors";
import Icon from "./Icons";
import { fmtEuro, fmtNum } from "../calcEngine";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const HOURS_PER_YEAR = 8760;
const DEG = Math.PI / 180;

// Monthly clearness index factors (Jan–Dec)
const MONTHLY_CLEARNESS = [0.30, 0.36, 0.44, 0.48, 0.52, 0.54, 0.54, 0.52, 0.47, 0.38, 0.30, 0.26];

// Monthly extraterrestrial horizontal irradiance estimate (W/m²·h per day)
const MONTHLY_H0 = [1.9, 2.7, 4.3, 5.8, 7.0, 7.6, 7.4, 6.7, 5.2, 3.5, 2.1, 1.6];

// Monthly avg EPEX spot prices (€/MWh)
const MONTHLY_EPEX = [72, 55, 52, 38, 45, 58, 65, 72, 70, 78, 88, 80];

// Hourly shape profiles (normalized, 24 values)
const HOUR_SHAPE_SUMMER = [
  0.55, 0.50, 0.48, 0.46, 0.46, 0.52, 0.60, 0.72,
  0.85, 0.95, 1.00, 0.98, 0.96, 0.92, 0.90, 0.92,
  0.98, 1.05, 1.10, 1.08, 1.00, 0.90, 0.78, 0.65,
];
const HOUR_SHAPE_WINTER = [
  0.70, 0.65, 0.60, 0.58, 0.58, 0.62, 0.72, 0.88,
  1.00, 1.08, 1.10, 1.08, 1.04, 1.00, 0.98, 1.00,
  1.10, 1.20, 1.25, 1.20, 1.10, 1.00, 0.90, 0.80,
];

const AZIMUTH_OPTIONS = [
  { label: "S (0°)", value: 0 },
  { label: "SE (−45°)", value: -45 },
  { label: "E (−90°)", value: -90 },
  { label: "NE (−135°)", value: -135 },
  { label: "N (180°)", value: 180 },
  { label: "NW (135°)", value: 135 },
  { label: "W (90°)", value: 90 },
  { label: "SW (45°)", value: 45 },
];

/* ─────────────────────────────────────────────
   Seeded PRNG — mulberry32
───────────────────────────────────────────── */
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─────────────────────────────────────────────
   Sun position helpers
───────────────────────────────────────────── */
function dayOfYear(month0, day) {
  const D = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  return D[month0] + day;
}

function sunPosition(doy, hour, lat, lon, tzOffset) {
  const B = (360 / 365) * (doy - 1) * DEG;
  const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(B) - 0.032077 * Math.sin(B)
    - 0.014615 * Math.cos(2 * B) - 0.04089 * Math.sin(2 * B));
  const solarTime = hour + (4 * (lon - 15 * tzOffset) + eot) / 60;
  const omega = 15 * (solarTime - 12) * DEG;
  const decl = (23.45 * Math.sin((360 / 365) * (doy - 81) * DEG)) * DEG;
  const latR = lat * DEG;
  const sinAlt = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(omega);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const cosAz = (Math.sin(decl) - Math.sin(altitude) * Math.sin(latR))
    / (Math.cos(altitude) * Math.cos(latR) + 1e-9);
  const azimuth = (omega > 0 ? 1 : -1) * Math.acos(Math.max(-1, Math.min(1, cosAz)));
  return { altitude, azimuth, decl, omega };
}

/* Plane-of-Array irradiance (W/m²) using Liu-Jordan model */
function poaIrradiance(Gdir, Gdiff, Gref, altitude, sunAz, tilt, arrayAz) {
  if (altitude <= 0 || Gdir < 0) return Gdiff * 0.5 * (1 + Math.cos(tilt * DEG));
  const incidence = Math.acos(
    Math.sin(altitude) * Math.cos(tilt * DEG)
    + Math.cos(altitude) * Math.sin(tilt * DEG) * Math.cos(sunAz - arrayAz * DEG)
  );
  const cosInc = Math.cos(Math.max(0, incidence));
  const beamPOA = Gdir * Math.max(0, cosInc);
  const diffPOA = Gdiff * 0.5 * (1 + Math.cos(tilt * DEG));
  const refPOA = Gref * 0.2 * 0.5 * (1 - Math.cos(tilt * DEG));
  return Math.max(0, beamPOA + diffPOA + refPOA);
}

/* ─────────────────────────────────────────────
   Parametric solar simulation fallback
───────────────────────────────────────────── */
function simulateSolarParametric(arrays, lat, lon, tzOffset = 1) {
  const out = new Float64Array(HOURS_PER_YEAR);
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let h = 0;
  for (let m = 0; m < 12; m++) {
    const days = MONTH_DAYS[m];
    const clearness = MONTHLY_CLEARNESS[m];
    const h0 = MONTHLY_H0[m] * 1000; // → W/m²·h at peak
    for (let d = 0; d < days; d++) {
      const doy = dayOfYear(m, d + 1);
      for (let hr = 0; hr < 24; hr++, h++) {
        const { altitude, azimuth } = sunPosition(doy, hr + 0.5, lat, lon, tzOffset);
        if (altitude <= 0) continue;
        const sinAlt = Math.sin(altitude);
        const Gh = h0 * clearness * sinAlt;
        const Gdir = Gh * 0.85;
        const Gdiff = Gh * 0.15;
        let totalPOA = 0;
        for (const arr of arrays) {
          const poa = poaIrradiance(Gdir, Gdiff, Gh, altitude, azimuth, arr.tilt, arr.azimuth);
          totalPOA += (poa / 1000) * arr.capacity; // kWh per kWp × capacity
        }
        out[h] = totalPOA / 1000; // → kWh
      }
    }
  }
  return out;
}

/* ─────────────────────────────────────────────
   Parse Open-Meteo API response into hourly kWh
───────────────────────────────────────────── */
function parseOpenMeteoSolar(data, arrays, lat, lon, tzOffset) {
  const { time, direct_radiation, diffuse_radiation } = data.hourly || {};
  if (!time || !direct_radiation || time.length < 8000) return null;
  const out = new Float64Array(HOURS_PER_YEAR);
  let h = 0;
  for (let i = 0; i < time.length && h < HOURS_PER_YEAR; i++) {
    const t = new Date(time[i]);
    const doy = Math.floor((t - new Date(t.getFullYear(), 0, 0)) / 86400000);
    const hr = t.getHours() + 0.5;
    const { altitude, azimuth } = sunPosition(doy, hr, lat, lon, tzOffset);
    const Gdir = Math.max(0, direct_radiation[i] || 0);
    const Gdiff = Math.max(0, diffuse_radiation[i] || 0);
    const Gh = Gdir + Gdiff;
    let totalPOA = 0;
    for (const arr of arrays) {
      const poa = poaIrradiance(Gdir, Gdiff, Gh, altitude, azimuth, arr.tilt, arr.azimuth);
      totalPOA += (poa / 1000) * arr.capacity;
    }
    out[h] = totalPOA / 1000;
    h++;
  }
  return out;
}

/* ─────────────────────────────────────────────
   Parametric EPEX spot price fallback
───────────────────────────────────────────── */
function simulateEpexParametric() {
  const out = new Float64Array(HOURS_PER_YEAR);
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const rand = mulberry32(20240101);
  let h = 0;
  for (let m = 0; m < 12; m++) {
    const days = MONTH_DAYS[m];
    const avgPrice = MONTHLY_EPEX[m];
    const isSummer = m >= 3 && m <= 8;
    const shape = isSummer ? HOUR_SHAPE_SUMMER : HOUR_SHAPE_WINTER;
    for (let d = 0; d < days; d++) {
      const dow = (new Date(2023, m, d + 1)).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const wkFactor = isWeekend ? 0.88 : 1.0;
      for (let hr = 0; hr < 24; hr++, h++) {
        const noise = 1 + (rand() - 0.5) * 0.16; // ±8%
        out[h] = Math.max(0, avgPrice * shape[hr] * wkFactor * noise);
      }
    }
  }
  return out;
}

/* Parse energy-charts API */
function parseEnergyCharts(data) {
  const { unix_seconds, price } = data || {};
  if (!unix_seconds || !price || unix_seconds.length < 8000) return null;
  const out = new Float64Array(HOURS_PER_YEAR);
  for (let i = 0; i < Math.min(unix_seconds.length, HOURS_PER_YEAR); i++) {
    out[i] = Math.max(0, price[i] ?? 0);
  }
  return out;
}

/* ─────────────────────────────────────────────
   BESS greedy optimizer
───────────────────────────────────────────── */
function optimizeBESS(pvHourly, loadHourly, priceHourly, bessKWh, bessKW, efficiency) {
  const SOC_MIN = bessKWh * 0.08;
  const SOC_MAX = bessKWh * 0.92;
  const soc = new Float64Array(HOURS_PER_YEAR);
  const schedule = new Float64Array(HOURS_PER_YEAR); // + = charge, - = discharge
  let currentSoc = bessKWh * 0.5;
  let totalRevenue = 0;
  let totalCycles = 0;
  let totalCharged = 0;
  let totalDischarged = 0;

  // Pre-compute daily avg prices
  for (let day = 0; day < 365; day++) {
    const start = day * 24;
    let daySum = 0;
    for (let h = 0; h < 24; h++) daySum += priceHourly[start + h];
    const avgPrice = daySum / 24;
    const chargeThreshold = avgPrice * 0.78;
    const dischargeThreshold = avgPrice * 1.12;

    for (let h = 0; h < 24; h++) {
      const idx = start + h;
      const pv = pvHourly[idx] || 0;
      const load = loadHourly[idx] || 0;
      const price = priceHourly[idx] || 0;
      const surplus = Math.max(0, pv - load);
      let action = 0;

      if (surplus > 0 && currentSoc < SOC_MAX) {
        // 1. Charge from PV surplus
        const canCharge = Math.min(surplus, bessKW, SOC_MAX - currentSoc);
        action = canCharge;
        currentSoc += canCharge * efficiency;
        totalCharged += canCharge;
      } else if (price <= chargeThreshold && currentSoc < SOC_MAX) {
        // 2. Charge from grid when cheap
        const canCharge = Math.min(bessKW * 0.5, SOC_MAX - currentSoc);
        action = canCharge;
        currentSoc += canCharge * efficiency;
        totalCharged += canCharge;
      } else if (price >= dischargeThreshold && currentSoc > SOC_MIN) {
        // 3. Discharge when expensive
        const canDischarge = Math.min(bessKW, currentSoc - SOC_MIN);
        action = -canDischarge;
        currentSoc -= canDischarge;
        totalRevenue += canDischarge * (price / 1000); // €/kWh
        totalDischarged += canDischarge;
      }

      schedule[idx] = action;
      soc[idx] = currentSoc;
    }
  }
  totalCycles = totalCharged / (bessKWh * 2 || 1);
  return { schedule, soc, totalRevenue, totalCycles, totalCharged, totalDischarged };
}

/* ─────────────────────────────────────────────
   Flat load profile (uniform distribution)
───────────────────────────────────────────── */
function buildLoadProfile(annualMWh) {
  const out = new Float64Array(HOURS_PER_YEAR);
  const baseKWh = (annualMWh * 1000) / HOURS_PER_YEAR;
  // Simple diurnal shape
  const shape = [
    0.55, 0.50, 0.48, 0.46, 0.46, 0.55, 0.75, 1.00,
    1.15, 1.20, 1.20, 1.15, 1.10, 1.10, 1.15, 1.15,
    1.20, 1.25, 1.20, 1.10, 1.00, 0.90, 0.75, 0.60,
  ];
  const shapeSum = shape.reduce((a, b) => a + b, 0);
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let h = 0;
  for (let m = 0; m < 12; m++) {
    for (let d = 0; d < MONTH_DAYS[m]; d++) {
      for (let hr = 0; hr < 24; hr++, h++) {
        out[h] = baseKWh * (shape[hr] / shapeSum) * 24;
      }
    }
  }
  return out;
}

/* ─────────────────────────────────────────────
   Market calculation
───────────────────────────────────────────── */
function calcMarket(pvHourly, loadHourly, priceHourly, bessResult, params) {
  const { fixedPriceCt, co2Price, netzentgelteCt = 6.5, umlagenCt = 2.5 } = params;
  const marketingFeeCt = 0.3;
  const eegTariffCt = 7.5;

  let selfConsumption = 0, surplus = 0, deficit = 0;
  let dvRevenue = 0, eegRevenue = 0, dvBessRevenue = 0;
  let oldProcurement = 0, newProcurement = 0;
  let co2Avoided = 0;

  const MONTH_STARTS = [0, 744, 1416, 2160, 2880, 3624, 4344, 5088, 5832, 6552, 7296, 8016];

  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    const pv = pvHourly[h] || 0;
    const load = loadHourly[h] || 0;
    const price = priceHourly[h] || 0; // €/MWh

    const sc = Math.min(pv, load);
    const sur = Math.max(0, pv - load);
    const def = Math.max(0, load - pv);

    selfConsumption += sc;
    surplus += sur;
    deficit += def;

    // DV ohne BESS
    dvRevenue += sur * ((price / 100) - (marketingFeeCt / 100));
    eegRevenue += sur * (eegTariffCt / 100);

    // DV mit BESS — shifted discharge revenue
    const bessDischarge = bessResult ? Math.max(0, -(bessResult.schedule[h] || 0)) : 0;
    dvBessRevenue += (sur + bessDischarge) * ((price / 100) - (marketingFeeCt / 100));

    // Procurement
    oldProcurement += load * (fixedPriceCt / 100);
    newProcurement += def * ((price / 1000) + (netzentgelteCt / 100) + (umlagenCt / 100));

    // CO₂ — avoided grid imports: sc + bessDischarge offset
    co2Avoided += (sc + bessDischarge) * 0.0004; // t CO₂, 400 g/kWh
  }

  const procurementSavings = oldProcurement - newProcurement;
  return {
    selfConsumption,
    surplus,
    deficit,
    dvRevenue,
    eegRevenue,
    dvBessRevenue,
    oldProcurement,
    newProcurement,
    procurementSavings,
    co2Avoided,
    selfConsumptionRate: surplus + selfConsumption > 0 ? selfConsumption / (selfConsumption + surplus) : 0,
    autarkyRate: deficit + selfConsumption > 0 ? selfConsumption / (deficit + selfConsumption) : 0,
  };
}

/* ─────────────────────────────────────────────
   Aggregate helpers for charts
───────────────────────────────────────────── */
function aggregateMonthly(pvH, loadH, priceH) {
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const pv = [], load = [], sc = [], price = [];
  let h = 0;
  for (let m = 0; m < 12; m++) {
    let pvM = 0, loadM = 0, scM = 0, priceM = 0, cnt = 0;
    for (let d = 0; d < MONTH_DAYS[m]; d++) {
      for (let hr = 0; hr < 24; hr++, h++) {
        pvM += pvH[h] || 0;
        loadM += loadH[h] || 0;
        scM += Math.min(pvH[h] || 0, loadH[h] || 0);
        priceM += priceH[h] || 0;
        cnt++;
      }
    }
    pv.push(pvM / 1000); // MWh
    load.push(loadM / 1000);
    sc.push(scM / 1000);
    price.push(priceM / cnt);
  }
  return { pv, load, sc, price };
}

function aggregateDailyProfile(pvH, loadH, priceH, seasonFilter) {
  const pvAvg = new Float64Array(24);
  const loadAvg = new Float64Array(24);
  const priceAvg = new Float64Array(24);
  const counts = new Float64Array(24);
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let h = 0;
  for (let m = 0; m < 12; m++) {
    const include = seasonFilter === "gesamt"
      ? true
      : seasonFilter === "sommer"
        ? m >= 3 && m <= 8
        : m < 3 || m > 8;
    for (let d = 0; d < MONTH_DAYS[m]; d++) {
      for (let hr = 0; hr < 24; hr++, h++) {
        if (include) {
          pvAvg[hr] += pvH[h] || 0;
          loadAvg[hr] += loadH[h] || 0;
          priceAvg[hr] += priceH[h] || 0;
          counts[hr]++;
        }
      }
    }
  }
  return {
    pv: Array.from(pvAvg).map((v, i) => counts[i] > 0 ? v / counts[i] : 0),
    load: Array.from(loadAvg).map((v, i) => counts[i] > 0 ? v / counts[i] : 0),
    price: Array.from(priceAvg).map((v, i) => counts[i] > 0 ? v / counts[i] : 0),
  };
}

function aggregateBessSoc(socH, seasonFilter) {
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const result = [];
  let h = 0;
  for (let m = 0; m < 12; m++) {
    const include = seasonFilter === "gesamt"
      ? true
      : seasonFilter === "sommer"
        ? m >= 3 && m <= 8
        : m < 3 || m > 8;
    for (let d = 0; d < MONTH_DAYS[m]; d++) {
      if (include) {
        const dayStart = h;
        let dayAvg = 0;
        for (let hr = 0; hr < 24; hr++) dayAvg += socH[dayStart + hr] || 0;
        result.push(dayAvg / 24);
      }
      h += 24;
    }
  }
  return result;
}

/* ─────────────────────────────────────────────
   SVG Chart Components
───────────────────────────────────────────── */
const VB_W = 620, VB_H = 280;
const PAD = { t: 20, r: 60, b: 40, l: 55 };
const CW = VB_W - PAD.l - PAD.r;
const CH = VB_H - PAD.t - PAD.b;

function scaleY(val, max) { return CH - (val / (max || 1)) * CH; }

/* Chart theme palettes */
const CHART_DARK = {
  grid: C.navyLight, greenLight: C.greenLight, blue: "#29ABE2", gold: C.gold,
  softGray: C.softGray, warmWhite: C.warmWhite, red: C.red,
};
const CHART_LIGHT = {
  grid: "rgba(0,0,0,0.1)", greenLight: B.greenLight, blue: B.cyan, gold: B.yellowDim,
  softGray: B.grayText, warmWhite: B.black, red: B.red,
};

function ChartDailyProfile({ data, season, theme = CHART_DARK }) {
  const { pv, load, price } = data;
  const maxEnergy = Math.max(...pv, ...load, 0.01);
  const maxPrice = Math.max(...price, 0.01);
  const barW = CW / 24 * 0.4;

  const pricePoints = price.map((p, i) => {
    const x = PAD.l + (i + 0.5) * (CW / 24);
    const y = PAD.t + scaleY(p, maxPrice);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", height: "auto" }} aria-label="Tagesprofil">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={PAD.l} x2={PAD.l + CW} y1={PAD.t + f * CH} y2={PAD.t + f * CH}
          stroke={theme.grid} strokeWidth="0.5" strokeDasharray="3,3" />
      ))}
      {/* PV bars (green) */}
      {pv.map((v, i) => (
        <rect key={`pv${i}`}
          x={PAD.l + i * (CW / 24) + (CW / 24 - barW * 2 - 2) / 2}
          y={PAD.t + scaleY(v, maxEnergy)}
          width={barW} height={Math.max(0, (v / maxEnergy) * CH)}
          fill={theme.greenLight} fillOpacity={0.85} rx="1" />
      ))}
      {/* Load bars */}
      {load.map((v, i) => (
        <rect key={`ld${i}`}
          x={PAD.l + i * (CW / 24) + (CW / 24 - barW * 2 - 2) / 2 + barW + 2}
          y={PAD.t + scaleY(v, maxEnergy)}
          width={barW} height={Math.max(0, (v / maxEnergy) * CH)}
          fill={theme.blue} fillOpacity={0.75} rx="1" />
      ))}
      {/* Price line (gold dashed) */}
      <polyline points={pricePoints} fill="none" stroke={theme.gold} strokeWidth="1.5" strokeDasharray="4,3" />
      {/* Axes */}
      <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={PAD.t + CH} stroke={theme.softGray} strokeWidth="0.8" />
      <line x1={PAD.l} x2={PAD.l + CW} y1={PAD.t + CH} y2={PAD.t + CH} stroke={theme.softGray} strokeWidth="0.8" />
      {/* X labels */}
      {[0, 6, 12, 18, 23].map(h => (
        <text key={h} x={PAD.l + (h + 0.5) * (CW / 24)} y={PAD.t + CH + 14}
          textAnchor="middle" fill={theme.softGray} fontSize="9" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">{h}h</text>
      ))}
      {/* Y left labels */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <text key={f} x={PAD.l - 5} y={PAD.t + f * CH + 3}
          textAnchor="end" fill={theme.softGray} fontSize="8" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          {fmtNum(maxEnergy * (1 - f), 0)}
        </text>
      ))}
      {/* Y right labels (price) */}
      {[0, 0.5, 1].map(f => (
        <text key={f} x={PAD.l + CW + 5} y={PAD.t + f * CH + 3}
          textAnchor="start" fill={theme.gold} fontSize="8" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          {fmtNum(maxPrice * (1 - f), 0)}
        </text>
      ))}
      {/* Legend */}
      <rect x={PAD.l} y={VB_H - 12} width={8} height={8} fill={theme.greenLight} rx="1" />
      <text x={PAD.l + 11} y={VB_H - 5} fill={theme.softGray} fontSize="8" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">PV (kWh)</text>
      <rect x={PAD.l + 60} y={VB_H - 12} width={8} height={8} fill={theme.blue} rx="1" />
      <text x={PAD.l + 71} y={VB_H - 5} fill={theme.softGray} fontSize="8" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Last (kWh)</text>
      <line x1={PAD.l + 130} x2={PAD.l + 140} y1={VB_H - 8} y2={VB_H - 8} stroke={theme.gold} strokeWidth="1.5" strokeDasharray="4,2" />
      <text x={PAD.l + 143} y={VB_H - 5} fill={theme.gold} fontSize="8" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Preis (€/MWh)</text>
    </svg>
  );
}

function ChartMonthly({ monthly, theme = CHART_DARK }) {
  const { pv, load, sc, price } = monthly;
  const maxE = Math.max(...pv, ...load, 0.01);
  const maxP = Math.max(...price, 0.01);
  const bw = CW / 12 * 0.28;
  const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  const pricePoints = price.map((p, i) => {
    const x = PAD.l + (i + 0.5) * (CW / 12);
    const y = PAD.t + scaleY(p, maxP);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", height: "auto" }} aria-label="Monatsprofil">
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={PAD.l} x2={PAD.l + CW} y1={PAD.t + f * CH} y2={PAD.t + f * CH}
          stroke={theme.grid} strokeWidth="0.5" strokeDasharray="3,3" />
      ))}
      {pv.map((v, i) => {
        const x0 = PAD.l + i * (CW / 12) + (CW / 12 - bw * 3 - 4) / 2;
        return (
          <g key={i}>
            <rect x={x0} y={PAD.t + scaleY(v, maxE)} width={bw} height={Math.max(0, (v / maxE) * CH)} fill={theme.greenLight} fillOpacity={0.85} rx="1" />
            <rect x={x0 + bw + 2} y={PAD.t + scaleY(load[i], maxE)} width={bw} height={Math.max(0, (load[i] / maxE) * CH)} fill={theme.blue} fillOpacity={0.75} rx="1" />
            <rect x={x0 + bw * 2 + 4} y={PAD.t + scaleY(sc[i], maxE)} width={bw} height={Math.max(0, (sc[i] / maxE) * CH)} fill={theme.gold} fillOpacity={0.8} rx="1" />
            <text x={PAD.l + (i + 0.5) * (CW / 12)} y={PAD.t + CH + 14}
              textAnchor="middle" fill={theme.softGray} fontSize="9" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">{MONTHS[i]}</text>
          </g>
        );
      })}
      <polyline points={pricePoints} fill="none" stroke={theme.gold} strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={PAD.t + CH} stroke={theme.softGray} strokeWidth="0.8" />
      <line x1={PAD.l} x2={PAD.l + CW} y1={PAD.t + CH} y2={PAD.t + CH} stroke={theme.softGray} strokeWidth="0.8" />
      {[0, 0.5, 1].map(f => (
        <text key={f} x={PAD.l - 5} y={PAD.t + f * CH + 3}
          textAnchor="end" fill={theme.softGray} fontSize="8" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          {fmtNum(maxE * (1 - f), 0)}
        </text>
      ))}
      {[0, 0.5, 1].map(f => (
        <text key={f} x={PAD.l + CW + 5} y={PAD.t + f * CH + 3}
          textAnchor="start" fill={theme.gold} fontSize="8" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          {fmtNum(maxP * (1 - f), 0)}
        </text>
      ))}
      <rect x={PAD.l} y={VB_H - 12} width={8} height={8} fill={theme.greenLight} rx="1" />
      <text x={PAD.l + 11} y={VB_H - 5} fill={theme.softGray} fontSize="8" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">PV (MWh)</text>
      <rect x={PAD.l + 65} y={VB_H - 12} width={8} height={8} fill={theme.blue} rx="1" />
      <text x={PAD.l + 76} y={VB_H - 5} fill={theme.softGray} fontSize="8" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Last (MWh)</text>
      <rect x={PAD.l + 132} y={VB_H - 12} width={8} height={8} fill={theme.gold} rx="1" />
      <text x={PAD.l + 143} y={VB_H - 5} fill={theme.gold} fontSize="8" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Eigenverbrauch (MWh)</text>
    </svg>
  );
}

function ChartComparisonBars({ results, theme = CHART_DARK }) {
  if (!results) return null;
  const { dvRevenue, eegRevenue, dvBessRevenue, oldProcurement, newProcurement, procurementSavings } = results;

  const rows = [
    { label: "EEG-Einspeisung", val: eegRevenue, color: theme.softGray },
    { label: "Direktvermarktung", val: dvRevenue, color: theme.greenLight },
    { label: "DV + BESS", val: dvBessRevenue, color: theme.gold },
    { label: "Festpreis (alt)", val: oldProcurement, color: theme.red },
    { label: "Spot-Beschaffung", val: newProcurement, color: theme.blue },
    { label: "Beschaffungsersparnis", val: Math.abs(procurementSavings), color: theme.greenLight },
  ];

  const maxVal = Math.max(...rows.map(r => r.val), 1);
  const rowH = 30;
  const totalH = rows.length * rowH + 20;
  const barAreaW = VB_W - PAD.l - PAD.r - 80;

  return (
    <svg viewBox={`0 0 ${VB_W} ${totalH}`} style={{ width: "100%", height: "auto" }} aria-label="Vergleich">
      {rows.map((row, i) => {
        const barW = (row.val / maxVal) * barAreaW;
        const y = 10 + i * rowH;
        return (
          <g key={i}>
            <text x={PAD.l - 5} y={y + 14} textAnchor="end" fill={theme.softGray} fontSize="9" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">{row.label}</text>
            <rect x={PAD.l} y={y + 4} width={Math.max(0, barW)} height={18} fill={row.color} fillOpacity={0.85} rx="2" />
            <text x={PAD.l + barW + 6} y={y + 15} fill={theme.warmWhite} fontSize="9" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              {fmtEuro(row.val)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ChartBessSoc({ socData, bessKWh, theme = CHART_DARK }) {
  if (!socData || socData.length === 0) return null;
  const maxSoc = bessKWh || Math.max(...socData, 1);
  const n = Math.min(socData.length, 365);
  const xStep = CW / n;

  const points = socData.slice(0, n).map((v, i) => {
    const x = PAD.l + i * xStep;
    const y = PAD.t + scaleY(v, maxSoc);
    return `${x},${y}`;
  });

  const areaPath = `M${PAD.l},${PAD.t + CH} ${points.join(" ")} L${PAD.l + (n - 1) * xStep},${PAD.t + CH} Z`;
  const polyline = points.join(" ");

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", height: "auto" }} aria-label="BESS Ladezustand">
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={PAD.l} x2={PAD.l + CW} y1={PAD.t + f * CH} y2={PAD.t + f * CH}
          stroke={theme.grid} strokeWidth="0.5" strokeDasharray="3,3" />
      ))}
      {/* SOC min/max bands */}
      <rect x={PAD.l} y={PAD.t} width={CW} height={(1 - 0.92) * CH} fill={theme.gold} fillOpacity={0.1} />
      <rect x={PAD.l} y={PAD.t + 0.92 * CH} width={CW} height={0.08 * CH} fill={theme.red} fillOpacity={0.1} />
      {/* Area fill */}
      <path d={areaPath} fill={theme.blue} fillOpacity={0.2} />
      <polyline points={polyline} fill="none" stroke={theme.blue} strokeWidth="1.2" />
      <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={PAD.t + CH} stroke={theme.softGray} strokeWidth="0.8" />
      <line x1={PAD.l} x2={PAD.l + CW} y1={PAD.t + CH} y2={PAD.t + CH} stroke={theme.softGray} strokeWidth="0.8" />
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <text key={f} x={PAD.l - 5} y={PAD.t + f * CH + 3}
          textAnchor="end" fill={theme.softGray} fontSize="8" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          {fmtNum(maxSoc * (1 - f), 0)}
        </text>
      ))}
      {[0, 3, 6, 9].map(q => (
        <text key={q} x={PAD.l + (q / 12) * CW} y={PAD.t + CH + 14}
          textAnchor="middle" fill={theme.softGray} fontSize="9" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          {["Jan", "Apr", "Jul", "Okt"][q / 3]}
        </text>
      ))}
      <text x={PAD.l + 5} y={PAD.t + 12} fill={theme.softGray} fontSize="8" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">kWh</text>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Styles helper
───────────────────────────────────────────── */
const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 9000,
    background: "rgba(15,26,46,0.85)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "flex-start", justifyContent: "center",
    overflowY: "auto", padding: "2rem 1rem",
  },
  modal: {
    background: C.navyDeep, borderRadius: "12px", width: "100%", maxWidth: "900px",
    border: `1px solid ${C.navyLight}`, boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
    position: "relative",
  },
  header: {
    background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDim} 100%)`,
    borderRadius: "12px 12px 0 0", padding: "1.25rem 1.5rem",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  closeBtn: {
    background: "rgba(0,0,0,0.2)", border: "none", borderRadius: "50%",
    width: 44, height: 44, cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center", color: C.navyDeep,
    flexShrink: 0,
  },
  body: { padding: "1.5rem" },
  section: {
    background: C.navy, borderRadius: "8px", padding: "1.25rem",
    marginBottom: "1rem", border: `1px solid ${C.navyLight}`,
  },
  sectionTitle: {
    fontFamily: "Georgia, serif", fontSize: "1rem", color: C.gold,
    marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem",
  },
  label: {
    fontFamily: "Calibri, sans-serif", fontSize: "0.8rem", color: C.softGray,
    marginBottom: "0.25rem", display: "block",
  },
  input: {
    background: C.navyMid, border: `1px solid ${C.navyLight}`, borderRadius: "6px",
    padding: "0.4rem 0.6rem", color: C.warmWhite, fontFamily: "Calibri, sans-serif",
    fontSize: "0.875rem", width: "100%", outline: "none",
  },
  select: {
    background: C.navyMid, border: `1px solid ${C.navyLight}`, borderRadius: "6px",
    padding: "0.4rem 0.6rem", color: C.warmWhite, fontFamily: "Calibri, sans-serif",
    fontSize: "0.875rem", width: "100%", outline: "none",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" },
  kpiCard: {
    background: C.navyMid, borderRadius: "8px", padding: "0.875rem",
    border: `1px solid ${C.navyLight}`, textAlign: "center",
  },
  kpiValue: {
    fontFamily: "Georgia, serif", fontSize: "1.3rem", color: C.gold,
    marginBottom: "0.2rem",
  },
  kpiLabel: {
    fontFamily: "Calibri, sans-serif", fontSize: "0.72rem", color: C.softGray,
  },
  seasonBtn: (active) => ({
    fontFamily: "Calibri, sans-serif", fontSize: "0.8rem",
    background: active ? C.gold : C.navyMid,
    color: active ? C.navyDeep : C.softGray,
    border: `1px solid ${active ? C.gold : C.navyLight}`,
    borderRadius: "6px", padding: "0.35rem 0.85rem",
    cursor: "pointer", fontWeight: active ? "600" : "normal",
    transition: "all 0.15s",
  }),
  arrayRow: {
    display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1.5fr 36px",
    gap: "0.5rem", alignItems: "end", marginBottom: "0.5rem",
  },
  addBtn: {
    background: "transparent", border: `1px dashed ${C.gold}`,
    borderRadius: "6px", padding: "0.4rem 0.75rem",
    color: C.gold, fontFamily: "Calibri, sans-serif", fontSize: "0.8rem",
    cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem",
    marginTop: "0.5rem",
  },
  removeBtn: {
    background: "transparent", border: `1px solid ${C.red}30`,
    borderRadius: "50%", width: 32, height: 32,
    color: C.red, cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center",
  },
  loadingBox: {
    display: "flex", alignItems: "center", gap: "0.75rem",
    padding: "0.75rem", background: C.navyMid, borderRadius: "8px",
    color: C.softGray, fontFamily: "Calibri, sans-serif", fontSize: "0.85rem",
  },
  errorBox: {
    padding: "0.75rem", background: `${C.red}18`, borderRadius: "8px",
    border: `1px solid ${C.red}40`, color: C.red,
    fontFamily: "Calibri, sans-serif", fontSize: "0.82rem",
  },
  chartTitle: {
    fontFamily: "Calibri, sans-serif", fontSize: "0.82rem", color: C.softGray,
    marginBottom: "0.5rem",
  },
  divider: {
    borderColor: C.navyLight, margin: "1rem 0",
  },
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function MarketAnalysis({ project, onClose, inline, onResults }) {
  const e = project?.energy || {};
  const pc = project?.phaseConfig || {};
  const pvConf = pc.pv || {};
  const spConf = pc.speicher || {};

  // Derived defaults
  const defaultBessKWh = (spConf.kapazitaet || 1) * 1000; // MWh → kWh

  /* ── Array config state ── */
  const [arrays, setArrays] = useState(() => {
    const base = [];
    if (pvConf.pvDach > 0) base.push({ id: 1, label: "Dach", azimuth: 0, tilt: 30, capacity: pvConf.pvDach });
    if (pvConf.pvFassade > 0) base.push({ id: 2, label: "Fassade", azimuth: 90, tilt: 90, capacity: pvConf.pvFassade });
    if (pvConf.pvCarport > 0) base.push({ id: 3, label: "Carport", azimuth: 0, tilt: 10, capacity: pvConf.pvCarport });
    if (pvConf.pvFreiflaeche > 0) base.push({ id: 4, label: "Freifläche", azimuth: 0, tilt: 25, capacity: pvConf.pvFreiflaeche });
    if (base.length === 0) base.push({ id: 1, label: "Dach", azimuth: 0, tilt: 30, capacity: 1 });
    return base;
  });
  const nextId = useRef(10);

  /* ── Market params (only fields unique to MarketAnalysis) ── */
  const [params, setParams] = useState({
    co2Price: 65,
    bessKWh: defaultBessKWh,
    bessKW: defaultBessKWh / 2,
    efficiency: 0.90,
  });

  /* ── Derived from project (single source of truth) ── */
  const lat = project?.energy?.latitude || 48.1;
  const lon = project?.energy?.longitude || 11.6;
  const annualLoadMWh = project?.energy?.stromverbrauch || 10000;
  const fixedPriceCt = project?.energy?.strompreis || 22;

  /* ── API fetch states ── */
  const [solarData, setSolarData] = useState(null);
  const [solarLoading, setSolarLoading] = useState(false);
  const [solarError, setSolarError] = useState(null);
  const [solarSource, setSolarSource] = useState("—");

  const [priceData, setPriceData] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState(null);
  const [priceSource, setPriceSource] = useState("—");

  /* ── Season selector ── */
  const [season, setSeason] = useState("gesamt");

  /* ── Load solar data ── */
  const fetchSolar = useCallback(async () => {
    setSolarLoading(true);
    setSolarError(null);
    const year = new Date().getFullYear() - 1;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const url = new URL("https://archive-api.open-meteo.com/v1/archive");
      url.searchParams.set("latitude", lat);
      url.searchParams.set("longitude", lon);
      url.searchParams.set("start_date", `${year}-01-01`);
      url.searchParams.set("end_date", `${year}-12-31`);
      url.searchParams.set("hourly", "direct_radiation,diffuse_radiation,direct_normal_irradiance,temperature_2m");
      url.searchParams.set("timezone", "Europe/Berlin");
      const res = await fetch(url.toString(), { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const parsed = parseOpenMeteoSolar(data, arrays, lat, lon, 1);
      if (parsed) {
        setSolarData(parsed);
        setSolarSource(`Open-Meteo ${year}`);
      } else {
        throw new Error("Unzureichende Daten");
      }
    } catch (err) {
      let msg = err.name === "AbortError"
        ? "Zeitüberschreitung (15 s) — Parametrisches Modell wird verwendet."
        : `API-Fehler: ${err.message} — Parametrisches Modell wird verwendet.`;
      setSolarError(msg);
      setSolarSource("Parametrisch");
      setSolarData(null); // will use parametric via useMemo
    } finally {
      clearTimeout(timer);
      setSolarLoading(false);
    }
  }, [lat, lon, arrays]);

  /* ── Load price data ── */
  const fetchPrices = useCallback(async () => {
    setPriceLoading(true);
    setPriceError(null);
    const year = new Date().getFullYear() - 1;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const url = `https://api.energy-charts.info/price?bzn=DE-LU&start=${year}-01-01&end=${year}-12-31`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const parsed = parseEnergyCharts(data);
      if (parsed) {
        setPriceData(parsed);
        setPriceSource(`EPEX ${year}`);
      } else {
        throw new Error("Unzureichende Daten");
      }
    } catch (err) {
      let msg = err.name === "AbortError"
        ? "Zeitüberschreitung (10 s) — Parametrischer Preisindex wird verwendet."
        : `API-Fehler: ${err.message} — Parametrischer Preisindex wird verwendet.`;
      setPriceError(msg);
      setPriceSource("Parametrisch");
      setPriceData(null);
    } finally {
      clearTimeout(timer);
      setPriceLoading(false);
    }
  }, []);

  /* ── Auto-fetch on mount ── */
  useEffect(() => {
    fetchSolar();
    fetchPrices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Computed hourly PV ── */
  const pvHourly = useMemo(() => {
    if (solarData) return solarData;
    return simulateSolarParametric(arrays, lat, lon, 1);
  }, [solarData, arrays, lat, lon]);

  /* ── Computed hourly prices ── */
  const priceHourly = useMemo(() => {
    if (priceData) return priceData;
    return simulateEpexParametric();
  }, [priceData]);

  /* ── Load profile ── */
  const loadHourly = useMemo(() => {
    return buildLoadProfile(annualLoadMWh);
  }, [annualLoadMWh]);

  /* ── Total PV capacity ── */
  const totalKWp = useMemo(() => arrays.reduce((s, a) => s + (Number(a.capacity) || 0), 0), [arrays]);

  /* ── Annual PV yield ── */
  const pvYieldMWh = useMemo(() => {
    let total = 0;
    for (let h = 0; h < HOURS_PER_YEAR; h++) total += pvHourly[h] || 0;
    return total / 1000;
  }, [pvHourly]);

  /* ── BESS optimization ── */
  const bessResult = useMemo(() => {
    const kWh = Number(params.bessKWh) || 0;
    const kW = Number(params.bessKW) || kWh / 2;
    if (kWh < 1) return null;
    return optimizeBESS(pvHourly, loadHourly, priceHourly, kWh, kW, Number(params.efficiency) || 0.9);
  }, [pvHourly, loadHourly, priceHourly, params.bessKWh, params.bessKW, params.efficiency]);

  /* ── Market results ── */
  const marketResults = useMemo(() => {
    return calcMarket(pvHourly, loadHourly, priceHourly, bessResult, {
      fixedPriceCt: fixedPriceCt,
      co2Price: Number(params.co2Price) || 65,
    });
  }, [pvHourly, loadHourly, priceHourly, bessResult, fixedPriceCt, params.co2Price]);

  /* ── Push results to parent (unified calc) ── */
  const onResultsRef = useRef(onResults);
  onResultsRef.current = onResults;
  useEffect(() => {
    if (!onResultsRef.current) return;
    onResultsRef.current({
      pvYieldMWh,
      selfConsumptionRate: marketResults.selfConsumptionRate,
      autarkyRate: marketResults.autarkyRate,
      selfConsumption: marketResults.selfConsumption,
      surplus: marketResults.surplus,
      deficit: marketResults.deficit,
      dvRevenue: marketResults.dvRevenue,
      eegRevenue: marketResults.eegRevenue,
      dvBessRevenue: marketResults.dvBessRevenue,
      procurementSavings: marketResults.procurementSavings,
      co2Avoided: marketResults.co2Avoided,
      bessRevenue: bessResult?.totalRevenue || 0,
      bessCycles: bessResult?.totalCycles || 0,
    });
  }, [marketResults, pvYieldMWh, bessResult]);

  /* ── Chart data ── */
  const daily = useMemo(() => aggregateDailyProfile(pvHourly, loadHourly, priceHourly, season), [pvHourly, loadHourly, priceHourly, season]);
  const monthly = useMemo(() => aggregateMonthly(pvHourly, loadHourly, priceHourly), [pvHourly, loadHourly, priceHourly]);
  const socData = useMemo(() => bessResult ? aggregateBessSoc(bessResult.soc, season) : [], [bessResult, season]);

  /* ── Array edit helpers ── */
  const updateArray = (id, key, value) => {
    setArrays(prev => prev.map(a => a.id === id ? { ...a, [key]: value } : a));
    // Trigger re-fetch with new arrays on next user action (manual refetch)
  };

  const addArray = () => {
    const id = nextId.current++;
    setArrays(prev => [...prev, { id, label: `Array ${id}`, azimuth: 0, tilt: 30, capacity: 1 }]);
  };

  const removeArray = (id) => {
    setArrays(prev => prev.length > 1 ? prev.filter(a => a.id !== id) : prev);
  };

  /* ── Param helper ── */
  const setParam = (key, val) => setParams(prev => ({ ...prev, [key]: val }));

  /* ─────────────────────────────────────────────
     Render
  ───────────────────────────────────────────── */
  const isLight = !!inline;
  const chartTheme = isLight ? CHART_LIGHT : CHART_DARK;

  /* ── Themed styles (TS) — light for inline, dark (S) for modal ── */
  const TS = isLight ? {
    body: { padding: 0 },
    section: undefined, // uses className="card" instead
    sectionStyle: { marginBottom: "1rem" },
    sectionTitle: { fontSize: "1rem", color: "var(--yellow-dim)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" },
    label: { display: "block", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--gray-text)", marginBottom: "0.4rem" },
    input: { width: "100%", padding: "0.6rem 0.8rem", background: "var(--white)", border: "1px solid var(--border-dark)", borderRadius: "4px", color: "var(--black)", fontSize: "0.95rem" },
    select: { width: "100%", padding: "0.6rem 0.8rem", background: "var(--white)", border: "1px solid var(--border-dark)", borderRadius: "4px", color: "var(--black)", fontSize: "0.95rem" },
    kpiCard: undefined, // uses className="card"
    kpiCardStyle: { textAlign: "center", padding: "1rem" },
    kpiValue: { fontSize: "1.3rem", fontWeight: 700, color: "var(--yellow-dim)", marginBottom: "0.2rem" },
    kpiLabel: { fontSize: "0.72rem", color: "var(--gray-text)", textTransform: "uppercase", letterSpacing: "0.5px" },
    loadingBox: { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "var(--white)", borderRadius: "8px", border: "1px solid var(--border)", color: "var(--gray-text)", fontSize: "0.85rem" },
    errorBox: { padding: "0.75rem", background: "rgba(231,76,60,0.06)", borderRadius: "8px", border: "1px solid rgba(231,76,60,0.2)", color: "var(--red)", fontSize: "0.82rem" },
    chartTitle: { fontSize: "0.82rem", color: "var(--gray-text)", marginBottom: "0.5rem" },
    divider: { borderColor: "var(--border)", margin: "1rem 0" },
    accentColor: "var(--yellow)",
    iconColor: "var(--yellow-dim)",
    totalColor: "var(--black)",
    totalAccent: "var(--yellow-dim)",
    tableLabel: "var(--gray-text)",
    tableValue: "var(--black)",
    tableAccent: "var(--yellow-dim)",
    subHeadColor: "var(--black)",
    sourcesBg: "var(--white)",
    sourceLabel: "var(--black)",
    sourceText: "var(--gray-text)",
    spinnerColor: "var(--yellow)",
    greenAccent: B.greenLight,
    goldAccent: B.yellowDim,
    softGray: "var(--gray-text)",
    seasonBtn: (active) => ({
      fontSize: "0.8rem",
      background: active ? "var(--yellow)" : "var(--white)",
      color: "var(--black)",
      border: active ? "1px solid var(--yellow)" : "1px solid var(--border-dark)",
      borderRadius: "6px", padding: "0.35rem 0.85rem",
      cursor: "pointer", fontWeight: active ? "600" : "normal",
      transition: "all 0.15s",
    }),
    arrayRow: {
      display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1.5fr 36px",
      gap: "0.5rem", alignItems: "end", marginBottom: "0.5rem",
    },
  } : {
    body: S.body,
    section: S.section,
    sectionStyle: null,
    sectionTitle: S.sectionTitle,
    label: S.label,
    input: S.input,
    select: S.select,
    kpiCard: S.kpiCard,
    kpiCardStyle: null,
    kpiValue: S.kpiValue,
    kpiLabel: S.kpiLabel,
    loadingBox: S.loadingBox,
    errorBox: S.errorBox,
    chartTitle: S.chartTitle,
    divider: S.divider,
    accentColor: C.gold,
    iconColor: C.gold,
    totalColor: C.warmWhite,
    totalAccent: C.gold,
    tableLabel: C.softGray,
    tableValue: C.warmWhite,
    tableAccent: C.gold,
    subHeadColor: C.warmWhite,
    sourcesBg: C.navyMid,
    sourceLabel: C.warmWhite,
    sourceText: C.softGray,
    spinnerColor: C.gold,
    greenAccent: C.greenLight,
    goldAccent: C.gold,
    softGray: C.softGray,
    seasonBtn: S.seasonBtn,
    arrayRow: S.arrayRow,
  };

  /* Section wrapper helper */
  const Sec = ({ children, style: extraStyle }) => isLight
    ? <div className="card" style={{ marginBottom: "1rem", ...extraStyle }}>{children}</div>
    : <div style={{ ...S.section, ...extraStyle }}>{children}</div>;

  /* KPI card wrapper */
  const KpiCard = ({ children }) => isLight
    ? <div className="card" style={{ textAlign: "center", padding: "1rem" }}>{children}</div>
    : <div style={S.kpiCard}>{children}</div>;

  const headerEl = isLight ? (
    <>
      <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>
        <Icon name="chart" size={22} color="var(--yellow-dim)" /> Marktanalyse
      </h2>
      <p style={{ color: "var(--gray-text)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Energiemarkt · Direktvermarktung · BESS-Optimierung
      </p>
    </>
  ) : (
    <div style={S.header}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Icon name="chart" size={22} color={C.navyDeep} />
        <div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.2rem", color: C.navyDeep, margin: 0 }}>
            Marktanalyse
          </h2>
          <p style={{ fontFamily: "Calibri, sans-serif", fontSize: "0.78rem", color: C.navyDeep, margin: 0, opacity: 0.7 }}>
            Energiemarkt · Direktvermarktung · BESS-Optimierung
          </p>
        </div>
      </div>
      <button style={S.closeBtn} onClick={onClose} aria-label="Schließen">
        <Icon name="arrowLeft" size={18} color={C.navyDeep} />
      </button>
    </div>
  );

  const bodyContent = (
    <div style={TS.body}>

          {/* ── Datenquellen-Status ── */}
          <div className={isLight ? "grid-2" : undefined} style={isLight ? { marginBottom: "1rem" } : { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            {/* Solar */}
            <div>
              {solarLoading && (
                <div style={TS.loadingBox}>
                  <div style={{ width: 14, height: 14, border: `2px solid ${TS.spinnerColor}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Lade Solardaten (Open-Meteo)…
                </div>
              )}
              {!solarLoading && solarError && <div style={TS.errorBox}><Icon name="bolt" size={12} /> {solarError}</div>}
              {!solarLoading && !solarError && solarData && (
                <div style={{ ...TS.loadingBox, borderLeft: `3px solid ${TS.greenAccent}` }}>
                  <Icon name="sun" size={14} color={TS.greenAccent} />
                  Solardaten: {solarSource}
                </div>
              )}
              {!solarLoading && !solarData && !solarError && (
                <div style={{ ...TS.loadingBox, borderLeft: `3px solid ${isLight ? "var(--gray-mid)" : C.softGray}` }}>
                  <Icon name="sun" size={14} color={isLight ? B.grayText : C.softGray} />
                  Parametrisches Modell aktiv
                </div>
              )}
            </div>
            {/* Price */}
            <div>
              {priceLoading && (
                <div style={TS.loadingBox}>
                  <div style={{ width: 14, height: 14, border: `2px solid ${TS.spinnerColor}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Lade Spotpreise (energy-charts)…
                </div>
              )}
              {!priceLoading && priceError && <div style={TS.errorBox}><Icon name="bolt" size={12} /> {priceError}</div>}
              {!priceLoading && !priceError && priceData && (
                <div style={{ ...TS.loadingBox, borderLeft: `3px solid ${TS.goldAccent}` }}>
                  <Icon name="money" size={14} color={TS.goldAccent} />
                  Preisdaten: {priceSource}
                </div>
              )}
              {!priceLoading && !priceData && !priceError && (
                <div style={{ ...TS.loadingBox, borderLeft: `3px solid ${isLight ? "var(--gray-mid)" : C.softGray}` }}>
                  <Icon name="money" size={14} color={isLight ? B.grayText : C.softGray} />
                  Parametrischer Preisindex aktiv
                </div>
              )}
            </div>
          </div>

          {/* ── PV-Array-Konfiguration ── */}
          <Sec>
            <div style={TS.sectionTitle}>
              <Icon name="sun" size={16} color={TS.iconColor} />
              PV-Array-Konfiguration
              <span style={{ marginLeft: "auto", fontSize: "0.82rem", color: TS.totalColor }}>
                Gesamt: <strong style={{ color: TS.totalAccent }}>{fmtNum(totalKWp, 1)} kWp</strong>
              </span>
            </div>
            {/* Header row */}
            <div style={{ ...TS.arrayRow, marginBottom: "0.25rem" }}>
              <span style={TS.label}>Bezeichnung</span>
              <span style={TS.label}>Azimut</span>
              <span style={TS.label}>Neigung (°)</span>
              <span style={TS.label}>Kapazität (kWp)</span>
              <span />
            </div>
            {arrays.map(arr => (
              <div key={arr.id} style={TS.arrayRow}>
                <input
                  style={TS.input}
                  value={arr.label}
                  onChange={ev => updateArray(arr.id, "label", ev.target.value)}
                  placeholder="Bezeichnung"
                />
                <select style={TS.select} value={arr.azimuth}
                  onChange={ev => updateArray(arr.id, "azimuth", Number(ev.target.value))}>
                  {AZIMUTH_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  <input
                    type="range" min={0} max={90} step={1}
                    value={arr.tilt}
                    onChange={ev => updateArray(arr.id, "tilt", Number(ev.target.value))}
                    style={{ width: "100%", accentColor: TS.accentColor }}
                  />
                  <span style={{ ...TS.label, marginBottom: 0, textAlign: "center" }}>{arr.tilt}°</span>
                </div>
                <input
                  type="number" style={TS.input} min={0} step={0.1}
                  value={arr.capacity}
                  onChange={ev => updateArray(arr.id, "capacity", Number(ev.target.value))}
                />
                {isLight ? (
                  <button className="btn btn-danger btn-sm" onClick={() => removeArray(arr.id)} aria-label="Array entfernen" title="Entfernen"
                    style={{ borderRadius: "50%", width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="trash" size={13} />
                  </button>
                ) : (
                  <button style={S.removeBtn} onClick={() => removeArray(arr.id)} aria-label="Array entfernen" title="Entfernen">
                    <Icon name="trash" size={13} color={C.red} />
                  </button>
                )}
              </div>
            ))}
            {isLight ? (
              <button className="btn btn-secondary btn-sm" onClick={addArray} style={{ marginTop: "0.5rem" }}>
                <Icon name="plus" size={13} /> Array hinzufügen
              </button>
            ) : (
              <button style={S.addBtn} onClick={addArray}>
                <Icon name="plus" size={13} color={C.gold} />
                Array hinzufügen
              </button>
            )}
            <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {isLight ? (
                <button className="btn btn-secondary btn-sm" onClick={() => { fetchSolar(); }}>
                  <Icon name="sun" size={13} /> Solardaten neu laden
                </button>
              ) : (
                <button
                  style={{ ...S.addBtn, borderStyle: "solid", background: C.navyMid }}
                  onClick={() => { fetchSolar(); }}
                >
                  <Icon name="sun" size={13} color={C.gold} />
                  Solardaten neu laden
                </button>
              )}
            </div>
          </Sec>

          {/* ── Parameter ── */}
          <Sec>
            <div style={TS.sectionTitle}>
              <Icon name="settings" size={16} color={TS.iconColor} />
              Parameter
            </div>
            {/* Read-only project data summary */}
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "1rem", padding: "0.75rem", background: isLight ? "var(--gray-light)" : C.navyMid, borderRadius: "6px", fontSize: "0.82rem" }}>
              <span style={{ color: isLight ? "var(--gray-text)" : C.softGray }}>
                <strong style={{ color: isLight ? "var(--black)" : C.warmWhite }}>Standort:</strong> {lat.toFixed(1)}°N, {lon.toFixed(1)}°E
              </span>
              <span style={{ color: isLight ? "var(--gray-text)" : C.softGray }}>
                <strong style={{ color: isLight ? "var(--black)" : C.warmWhite }}>Verbrauch:</strong> {Number(annualLoadMWh).toLocaleString("de-DE")} MWh/a
              </span>
              <span style={{ color: isLight ? "var(--gray-text)" : C.softGray }}>
                <strong style={{ color: isLight ? "var(--black)" : C.warmWhite }}>Strompreis:</strong> {fixedPriceCt} ct/kWh
              </span>
            </div>

            {/* CO₂ price — unique to market analysis */}
            <div className={isLight ? "grid-3" : undefined} style={isLight ? undefined : { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
              <div>
                <label style={TS.label}>CO₂-Zertifikatspreis (€/t)</label>
                <input type="number" style={TS.input} min={0} step={5}
                  value={params.co2Price}
                  onChange={ev => setParam("co2Price", Number(ev.target.value))} />
              </div>
            </div>

            <hr style={TS.divider} />

            {/* BESS subsection */}
            <div style={{ ...TS.sectionTitle, fontSize: "0.88rem", marginBottom: "0.6rem" }}>
              <Icon name="battery" size={14} color={TS.iconColor} />
              BESS-Parameter
            </div>
            <div className={isLight ? "grid-3" : undefined} style={isLight ? undefined : { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
              <div>
                <label style={TS.label}>Kapazität (kWh)</label>
                <input type="number" style={TS.input} min={0} step={100}
                  value={params.bessKWh}
                  onChange={ev => {
                    const v = Number(ev.target.value);
                    setParams(prev => ({ ...prev, bessKWh: v, bessKW: v / 2 }));
                  }} />
              </div>
              <div>
                <label style={TS.label}>Leistung (kW)</label>
                <input type="number" style={TS.input} min={0} step={50}
                  value={params.bessKW}
                  onChange={ev => setParam("bessKW", Number(ev.target.value))} />
              </div>
              <div>
                <label style={TS.label}>Round-Trip-Effizienz</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  <input type="range" min={0.85} max={0.95} step={0.01}
                    value={params.efficiency}
                    onChange={ev => setParam("efficiency", Number(ev.target.value))}
                    style={{ accentColor: TS.accentColor }} />
                  <span style={{ ...TS.label, marginBottom: 0, textAlign: "center" }}>
                    {(params.efficiency * 100).toFixed(0)} %
                  </span>
                </div>
              </div>
            </div>
          </Sec>

          {/* ── KPI Dashboard ── */}
          <Sec>
            <div style={TS.sectionTitle}>
              <Icon name="target" size={16} color={TS.iconColor} />
              KPI-Übersicht
            </div>
            <div className={isLight ? "grid-4" : undefined} style={isLight ? { gap: "0.6rem" } : { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6rem" }}>
              {[
                {
                  label: "PV-Ertrag",
                  value: `${fmtNum(pvYieldMWh, 0)} MWh/a`,
                },
                {
                  label: "Eigenverbrauchsquote",
                  value: `${fmtNum(marketResults.selfConsumptionRate * 100, 1)} %`,
                },
                {
                  label: "Autarkiequote",
                  value: `${fmtNum(marketResults.autarkyRate * 100, 1)} %`,
                },
                {
                  label: "DV ohne BESS",
                  value: fmtEuro(marketResults.dvRevenue),
                  sub: "p.a.",
                },
                {
                  label: "DV mit BESS",
                  value: fmtEuro(marketResults.dvBessRevenue),
                  sub: "p.a.",
                },
                {
                  label: "Beschaffungsersparnis",
                  value: fmtEuro(Math.abs(marketResults.procurementSavings)),
                  sub: "p.a.",
                },
                {
                  label: "CO₂-Vermeidung",
                  value: `${fmtNum(marketResults.co2Avoided, 0)} t/a`,
                },
                {
                  label: "BESS Zyklen",
                  value: bessResult ? `${fmtNum(bessResult.totalCycles, 0)} /a` : "— /a",
                },
              ].map((kpi, i) => (
                <KpiCard key={i}>
                  <div style={TS.kpiValue}>{kpi.value}</div>
                  <div style={TS.kpiLabel}>{kpi.label}</div>
                  {kpi.sub && <div style={{ ...TS.kpiLabel, fontSize: "0.65rem", color: TS.totalAccent }}>{kpi.sub}</div>}
                </KpiCard>
              ))}
            </div>
          </Sec>

          {/* ── Season selector ── */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.82rem", color: TS.softGray, marginRight: "0.25rem" }}>Saison:</span>
            {[
              { key: "sommer", label: "Sommer (Apr–Sep)" },
              { key: "winter", label: "Winter (Okt–Mär)" },
              { key: "gesamt", label: "Gesamt (Jahr)" },
            ].map(s => isLight ? (
              <button key={s.key} className="btn btn-sm" style={TS.seasonBtn(season === s.key)} onClick={() => setSeason(s.key)}>
                {s.label}
              </button>
            ) : (
              <button key={s.key} style={S.seasonBtn(season === s.key)} onClick={() => setSeason(s.key)}>
                {s.label}
              </button>
            ))}
          </div>

          {/* ── Charts ── */}
          <Sec>
            <div style={TS.sectionTitle}>
              <Icon name="chart" size={16} color={TS.iconColor} />
              Tagesprofil — Durchschnitt
            </div>
            <p style={TS.chartTitle}>Stündliche PV-Erzeugung vs. Last + Spotpreis (kWh / €/MWh)</p>
            <ChartDailyProfile data={daily} season={season} theme={chartTheme} />
          </Sec>

          <Sec>
            <div style={TS.sectionTitle}>
              <Icon name="chart" size={16} color={TS.iconColor} />
              Monatsprofil — Jahresübersicht
            </div>
            <p style={TS.chartTitle}>PV / Last / Eigenverbrauch in MWh + Ø Spotpreis €/MWh</p>
            <ChartMonthly monthly={monthly} theme={chartTheme} />
          </Sec>

          <Sec>
            <div style={TS.sectionTitle}>
              <Icon name="money" size={16} color={TS.iconColor} />
              Erlös- und Beschaffungsvergleich
            </div>
            <p style={TS.chartTitle}>EEG vs. Direktvermarktung vs. DV+BESS · Festpreis vs. Spot vs. Spot+BESS (€/a)</p>
            <ChartComparisonBars results={marketResults} theme={chartTheme} />
          </Sec>

          {bessResult && (
            <Sec>
              <div style={TS.sectionTitle}>
                <Icon name="battery" size={16} color={TS.iconColor} />
                BESS Ladezustand — Jahresverlauf
              </div>
              <p style={TS.chartTitle}>
                Tages-Ø SoC (kWh) · Zyklen: {fmtNum(bessResult.totalCycles, 0)} /a ·
                Geladen: {fmtNum(bessResult.totalCharged / 1000, 0)} MWh ·
                Entladen: {fmtNum(bessResult.totalDischarged / 1000, 0)} MWh
              </p>
              <ChartBessSoc socData={socData} bessKWh={params.bessKWh} theme={chartTheme} />
            </Sec>
          )}

          {/* ── Detailauswertung ── */}
          <Sec>
            <div style={TS.sectionTitle}>
              <Icon name="grid" size={16} color={TS.iconColor} />
              Detailauswertung
            </div>
            <div className={isLight ? "grid-2" : undefined} style={isLight ? { gap: "1rem" } : { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {/* Einspeisung */}
              <div>
                <p style={{ ...TS.label, fontSize: "0.85rem", color: TS.subHeadColor, marginBottom: "0.5rem" }}>Einspeisestrategie</p>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {[
                      { label: "PV-Erzeugung", value: `${fmtNum(pvYieldMWh, 0)} MWh/a` },
                      { label: "Eigenverbrauch", value: `${fmtNum(marketResults.selfConsumption / 1000, 0)} MWh/a` },
                      { label: "Einspeisung (Überschuss)", value: `${fmtNum(marketResults.surplus / 1000, 0)} MWh/a` },
                      { label: "EEG-Einspeisung", value: fmtEuro(marketResults.eegRevenue), accent: true },
                      { label: "Direktvermarktung (ohne BESS)", value: fmtEuro(marketResults.dvRevenue), accent: true },
                      { label: "Direktvermarktung (mit BESS)", value: fmtEuro(marketResults.dvBessRevenue), accent: true },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: "0.8rem", color: TS.tableLabel, padding: "0.25rem 0" }}>{row.label}</td>
                        <td style={{ fontSize: "0.8rem", color: row.accent ? TS.tableAccent : TS.tableValue, textAlign: "right", padding: "0.25rem 0" }}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Beschaffung */}
              <div>
                <p style={{ ...TS.label, fontSize: "0.85rem", color: TS.subHeadColor, marginBottom: "0.5rem" }}>Strombeschaffung</p>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {[
                      { label: "Jahresverbrauch", value: `${fmtNum(annualLoadMWh, 0)} MWh/a` },
                      { label: "Restbezug (nach PV)", value: `${fmtNum(marketResults.deficit / 1000, 0)} MWh/a` },
                      { label: "Beschaffung Festpreis (alt)", value: fmtEuro(marketResults.oldProcurement) },
                      { label: "Beschaffung Spot (neu)", value: fmtEuro(marketResults.newProcurement) },
                      { label: "Beschaffungsersparnis", value: fmtEuro(Math.abs(marketResults.procurementSavings)), accent: true },
                      { label: `CO₂-Vermeidung × ${params.co2Price} €/t`, value: fmtEuro(marketResults.co2Avoided * params.co2Price), accent: true },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: "0.8rem", color: TS.tableLabel, padding: "0.25rem 0" }}>{row.label}</td>
                        <td style={{ fontSize: "0.8rem", color: row.accent ? TS.tableAccent : TS.tableValue, textAlign: "right", padding: "0.25rem 0" }}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Sec>

          {/* ── Datenquellen ── */}
          <Sec style={isLight ? { background: "var(--white)", fontSize: "0.75rem", color: "var(--gray-text)" } : { background: C.navyMid, fontSize: "0.75rem", fontFamily: "Calibri, sans-serif", color: C.softGray }}>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <span><strong style={{ color: TS.sourceLabel }}>Solardaten:</strong> {solarSource}</span>
              <span><strong style={{ color: TS.sourceLabel }}>Spotpreise:</strong> {priceSource}</span>
              <span><strong style={{ color: TS.sourceLabel }}>Netzentgelte:</strong> 6,5 ct/kWh (pauschal)</span>
              <span><strong style={{ color: TS.sourceLabel }}>Umlagen:</strong> 2,5 ct/kWh (pauschal)</span>
              <span><strong style={{ color: TS.sourceLabel }}>CO₂-Faktor Netz:</strong> 400 g/kWh</span>
              <span><strong style={{ color: TS.sourceLabel }}>EEG-Tarif:</strong> 7,5 ct/kWh</span>
              <span><strong style={{ color: TS.sourceLabel }}>DV-Vermarktungsgebühr:</strong> 0,3 ct/kWh</span>
            </div>
          </Sec>

    </div>
  );

  const spinnerCss = <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>;

  if (inline) {
    return (
      <div className="fade-in">
        {headerEl}
        {bodyContent}
        {spinnerCss}
      </div>
    );
  }

  return (
    <div style={S.overlay} onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div style={S.modal} role="dialog" aria-modal="true" aria-label="Marktanalyse">
        {headerEl}
        {bodyContent}
        {spinnerCss}
      </div>
    </div>
  );
}
