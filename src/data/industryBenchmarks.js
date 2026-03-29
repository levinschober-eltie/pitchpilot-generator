// Branchen-Mapping: CompanyStep INDUSTRIES → Benchmark-Gruppen
export const BENCHMARK_GROUPS = {
  produktion: ["Produktion", "Chemie", "Automotive", "Lebensmittel", "Metall", "Papier", "Textil", "Glas", "Elektronik"],
  logistik: ["Logistik"],
  handel: ["Handel"],
  buero: ["Büro / Verwaltung"],
  sonstig: ["Bau", "Holz", "Sonstige"],
}

export const BENCHMARKS = {
  produktion: { amortisationJahre: 10, co2ReduktionPct: 60, autarkiePct: 45, pvErtragKWhProKWp: 900 },
  logistik:   { amortisationJahre: 9, co2ReduktionPct: 55, autarkiePct: 50, pvErtragKWhProKWp: 920 },
  handel:     { amortisationJahre: 8, co2ReduktionPct: 50, autarkiePct: 55, pvErtragKWhProKWp: 930 },
  buero:      { amortisationJahre: 7, co2ReduktionPct: 65, autarkiePct: 60, pvErtragKWhProKWp: 940 },
  sonstig:    { amortisationJahre: 9, co2ReduktionPct: 55, autarkiePct: 45, pvErtragKWhProKWp: 910 },
}

export function getGroupForIndustry(industry) {
  for (const [group, industries] of Object.entries(BENCHMARK_GROUPS)) {
    if (industries.includes(industry)) return group
  }
  return "sonstig"
}
