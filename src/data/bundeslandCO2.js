/**
 * Regionale CO₂-Grid-Emissionsfaktoren nach Bundesland (t CO₂/MWh).
 * Quelle: UBA 2024, regionale Strommix-Unterschiede durch EE-Anteile.
 * PLZ-Bereiche sind vereinfacht — es gibt Überlappungen, daher
 * wird der erste Match genommen (sortiert nach Spezifität).
 *
 * Bundesländer mit hohem Wind/Solar-Anteil haben niedrigere Faktoren.
 */

const BUNDESLAND_DATA = [
  // WICHTIG: Spezifischere Ranges (Stadtstaaten) ZUERST — first-match wins!
  // PLZ-Start, PLZ-Ende, Bundesland, CO₂-Faktor (t/MWh)

  // ── Stadtstaaten (spezifisch, vor breiten Bereichen) ──
  // Berlin
  [10000, 14199, "Berlin", 0.340],
  // Hamburg (20xxx-22xxx Teilbereiche)
  [20000, 20999, "Hamburg", 0.340],
  [21029, 21149, "Hamburg", 0.340],
  [21200, 21999, "Hamburg", 0.340],
  [22000, 22769, "Hamburg", 0.340],
  // Bremen (28xxx)
  [28000, 28999, "Bremen", 0.310],
  // Saarland (661xx–668xx Kern-PLZ)
  [66000, 66999, "Saarland", 0.370],

  // ── Flächenländer ──
  // Brandenburg
  [3000, 3999, "Brandenburg", 0.390],
  [14400, 16999, "Brandenburg", 0.390],
  [15000, 15999, "Brandenburg", 0.390],
  // Mecklenburg-Vorpommern — Wind
  [17000, 19999, "Mecklenburg-Vorpommern", 0.210],
  [23900, 23999, "Mecklenburg-Vorpommern", 0.210],
  // Schleswig-Holstein — hoher Windanteil (nach Hamburg)
  [21000, 21028, "Schleswig-Holstein", 0.195],
  [21150, 21199, "Schleswig-Holstein", 0.195],
  [22770, 25999, "Schleswig-Holstein", 0.195],
  // Niedersachsen — viel Wind (nach Bremen)
  [26000, 27999, "Niedersachsen", 0.260],
  [29000, 29999, "Niedersachsen", 0.260],
  [30000, 31999, "Niedersachsen", 0.260],
  [37000, 37999, "Niedersachsen", 0.260],
  [48000, 49999, "Niedersachsen", 0.260],
  // Nordrhein-Westfalen
  [32000, 33999, "Nordrhein-Westfalen", 0.400],
  [40000, 42999, "Nordrhein-Westfalen", 0.400],
  [44000, 47999, "Nordrhein-Westfalen", 0.400],
  [50000, 53999, "Nordrhein-Westfalen", 0.400],
  [57000, 59999, "Nordrhein-Westfalen", 0.400],
  // Hessen
  [34000, 36999, "Hessen", 0.350],
  [60000, 65999, "Hessen", 0.350],
  [68500, 68999, "Hessen", 0.350],
  // Sachsen-Anhalt
  [6000, 6999, "Sachsen-Anhalt", 0.350],
  [38800, 39999, "Sachsen-Anhalt", 0.350],
  // Rheinland-Pfalz (nach Saarland)
  [54000, 56999, "Rheinland-Pfalz", 0.330],
  [67000, 67999, "Rheinland-Pfalz", 0.330],
  [76700, 76899, "Rheinland-Pfalz", 0.330],
  // Thüringen
  [5000, 5999, "Thüringen", 0.350],
  [7300, 7899, "Thüringen", 0.350],
  [98000, 99999, "Thüringen", 0.350],
  // Baden-Württemberg
  [68000, 68499, "Baden-Württemberg", 0.340],
  [69000, 69999, "Baden-Württemberg", 0.340],
  [70000, 76699, "Baden-Württemberg", 0.340],
  [77000, 79999, "Baden-Württemberg", 0.340],
  [88000, 89999, "Baden-Württemberg", 0.340],
  // Bayern
  [80000, 87999, "Bayern", 0.350],
  [90000, 97999, "Bayern", 0.350],
  // Sachsen — Braunkohle dominiert
  [1000, 2999, "Sachsen", 0.430],
  [4000, 4999, "Sachsen", 0.430],
  [7900, 9999, "Sachsen", 0.430],
];

/**
 * Lookup CO₂-Grid-Emissionsfaktor anhand PLZ.
 * @param {string|number} plz - Postleitzahl (z.B. "91235" oder 91235)
 * @param {number} fallback - Fallback-Wert wenn PLZ nicht zugeordnet werden kann
 * @returns {{ co2Grid: number, bundesland: string|null }}
 */
export function getCO2ByPLZ(plz, fallback = 0.382) {
  if (!plz) return { co2Grid: fallback, bundesland: null };
  const num = parseInt(String(plz).trim(), 10);
  if (isNaN(num) || num < 1000 || num > 99999) return { co2Grid: fallback, bundesland: null };

  for (const [min, max, land, factor] of BUNDESLAND_DATA) {
    if (num >= min && num <= max) {
      return { co2Grid: factor, bundesland: land };
    }
  }
  return { co2Grid: fallback, bundesland: null };
}

/**
 * Alle Bundesländer mit ihren CO₂-Faktoren (für Tooltip/Info).
 */
export const BUNDESLAND_FACTORS = {
  "Schleswig-Holstein": 0.195,
  "Mecklenburg-Vorpommern": 0.210,
  "Niedersachsen": 0.260,
  "Bremen": 0.310,
  "Rheinland-Pfalz": 0.330,
  "Hamburg": 0.340,
  "Berlin": 0.340,
  "Baden-Württemberg": 0.340,
  "Hessen": 0.350,
  "Sachsen-Anhalt": 0.350,
  "Thüringen": 0.350,
  "Bayern": 0.350,
  "Saarland": 0.370,
  "Brandenburg": 0.390,
  "Nordrhein-Westfalen": 0.400,
  "Sachsen": 0.430,
};
