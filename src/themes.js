/**
 * Theme presets for PitchPilot presentations.
 * Each preset has the same shape as the `C` palette in colors.js.
 */

/* ── Preset: Eckart (default — navy/gold premium) ── */
const eckart = {
  key: "eckart",
  name: "Premium",
  description: "Dunkel, Navy & Gold — professioneller Industriestil",
  font: "Calibri, sans-serif",
  fontSerif: "Georgia, serif",

  navy: "#1B2A4A", navyDeep: "#0F1A2E", navyLight: "#253757", navyMid: "#1E3050",
  green: "#2D6A4F", greenLight: "#4CAF7D",
  gold: "#D4A843", goldLight: "#E8C97A", goldDim: "#B8923A",
  warmWhite: "#F5F5F0", white: "#FFFFFF", lightGray: "#EAEAE5",
  midGray: "#B0B0A6", softGray: "#B0B0A6", darkText: "#2B2B2B",
  forest: "#1A4D2E", forestMid: "#245E3A", forestLight: "#2E7A4E", forestDark: "#0F3520",
  warmOrange: "#E8785A", warmOrangeLight: "#F4A589",
  blue: "rgba(100,170,255,0.4)", skyTop: "#0D1B30", skyMid: "#152540",
  coolBlue: "#4A8EC2", coolBlueDim: "#2A5E8A",
  red: "#E74C3C",
};

/* ── Preset: Modern (dark charcoal, electric blue) ── */
const modern = {
  key: "modern",
  name: "Modern",
  description: "Anthrazit & Electric Blue — zeitgem\u00E4\u00DF und technisch",
  font: "'Segoe UI', system-ui, sans-serif",
  fontSerif: "'Segoe UI', system-ui, sans-serif",

  navy: "#1A1A2E", navyDeep: "#0F0F1A", navyLight: "#2A2A42", navyMid: "#222238",
  green: "#00B894", greenLight: "#55EFC4",
  gold: "#0984E3", goldLight: "#74B9FF", goldDim: "#0767B0",
  warmWhite: "#F0F0F5", white: "#FFFFFF", lightGray: "#E0E0E8",
  midGray: "#A0A0B0", softGray: "#A0A0B0", darkText: "#1A1A2E",
  forest: "#00896B", forestMid: "#00A77F", forestLight: "#00C896", forestDark: "#006B52",
  warmOrange: "#FDCB6E", warmOrangeLight: "#FFEAA7",
  blue: "rgba(9,132,227,0.4)", skyTop: "#0A0A18", skyMid: "#141428",
  coolBlue: "#0984E3", coolBlueDim: "#0767B0",
  red: "#FF6B6B",
};

/* ── Preset: Klassisch (warm cream/burgundy, traditional) ── */
const klassisch = {
  key: "klassisch",
  name: "Klassisch",
  description: "Bordeaux & Creme — traditionell und seri\u00F6s",
  font: "Cambria, Georgia, serif",
  fontSerif: "Georgia, 'Times New Roman', serif",

  navy: "#2C1810", navyDeep: "#1A0E08", navyLight: "#3D2518", navyMid: "#341C12",
  green: "#2E7D32", greenLight: "#66BB6A",
  gold: "#8B1A1A", goldLight: "#C04040", goldDim: "#6B1414",
  warmWhite: "#FFF8F0", white: "#FFFFFF", lightGray: "#F0E8E0",
  midGray: "#B0A898", softGray: "#B0A898", darkText: "#2C1810",
  forest: "#1B5E20", forestMid: "#2E7D32", forestLight: "#43A047", forestDark: "#0D3B12",
  warmOrange: "#D4A843", warmOrangeLight: "#E8C97A",
  blue: "rgba(139,26,26,0.3)", skyTop: "#120A06", skyMid: "#1E1210",
  coolBlue: "#5C6BC0", coolBlueDim: "#3F51B5",
  red: "#C62828",
};

/* ── Preset: Minimal (near-white, single accent) ── */
const minimal = {
  key: "minimal",
  name: "Minimalistisch",
  description: "Hell & Clean — wenig Farbe, viel Klarheit",
  font: "'Inter', 'Helvetica Neue', sans-serif",
  fontSerif: "'Inter', 'Helvetica Neue', sans-serif",

  navy: "#F5F5F5", navyDeep: "#E8E8E8", navyLight: "#FAFAFA", navyMid: "#F0F0F0",
  green: "#10B981", greenLight: "#34D399",
  gold: "#1F2937", goldLight: "#374151", goldDim: "#111827",
  warmWhite: "#111827", white: "#FFFFFF", lightGray: "#F3F4F6",
  midGray: "#9CA3AF", softGray: "#9CA3AF", darkText: "#111827",
  forest: "#059669", forestMid: "#10B981", forestLight: "#34D399", forestDark: "#047857",
  warmOrange: "#F59E0B", warmOrangeLight: "#FCD34D",
  blue: "rgba(31,41,55,0.15)", skyTop: "#DBDFE5", skyMid: "#E5E7EB",
  coolBlue: "#3B82F6", coolBlueDim: "#2563EB",
  red: "#EF4444",
};

/* ── Preset: Bold (saturated gradients, high contrast) ── */
const bold = {
  key: "bold",
  name: "Kraftvoll",
  description: "Schwarz & Neon-Gr\u00FCn — auff\u00E4llig und energiegeladen",
  font: "'Arial Black', 'Impact', sans-serif",
  fontSerif: "'Arial Black', 'Impact', sans-serif",

  navy: "#0A0A0A", navyDeep: "#000000", navyLight: "#1A1A1A", navyMid: "#121212",
  green: "#00E676", greenLight: "#69F0AE",
  gold: "#FFD600", goldLight: "#FFFF00", goldDim: "#CCAA00",
  warmWhite: "#F0F0F0", white: "#FFFFFF", lightGray: "#E0E0E0",
  midGray: "#888888", softGray: "#888888", darkText: "#0A0A0A",
  forest: "#00C853", forestMid: "#00E676", forestLight: "#69F0AE", forestDark: "#009624",
  warmOrange: "#FF6D00", warmOrangeLight: "#FF9E40",
  blue: "rgba(255,214,0,0.35)", skyTop: "#000000", skyMid: "#0A0A0A",
  coolBlue: "#448AFF", coolBlueDim: "#2962FF",
  red: "#FF1744",
};

/** All available presets */
export const THEME_PRESETS = { eckart, modern, klassisch, minimal, bold };

/** Ordered list for UI rendering */
export const THEME_LIST = [eckart, modern, klassisch, minimal, bold];

/**
 * Resolve a full theme from project.theme config.
 * Falls back to eckart if preset not found.
 */
export function resolveTheme(themeConfig) {
  if (!themeConfig) return eckart;
  const base = THEME_PRESETS[themeConfig.preset] || eckart;

  // If custom CI colors exist, overlay them
  if (themeConfig.customColors) {
    return buildCustomTheme(base, themeConfig.customColors, themeConfig.font);
  }
  return base;
}

/**
 * Build a custom theme by overlaying extracted CI colors onto a base preset.
 */
export function buildCustomTheme(base, ci, customFont) {
  if (!ci) return base;

  const primary = ci.primary || base.gold;
  const secondary = ci.secondary || base.navy;
  const accent = ci.accent || base.greenLight;
  const bg = ci.bg || base.navyDeep;
  const text = ci.text || base.warmWhite;

  return {
    ...base,
    key: "custom",
    name: "Eigene CI",
    description: "Basierend auf Unternehmens-CI",
    font: customFont || ci.font || base.font,
    fontSerif: ci.fontSerif || base.fontSerif,

    // Map CI to palette positions
    navy: secondary,
    navyDeep: darken(secondary, 0.3),
    navyLight: lighten(secondary, 0.15),
    navyMid: lighten(secondary, 0.08),

    gold: primary,
    goldLight: lighten(primary, 0.2),
    goldDim: darken(primary, 0.15),

    green: accent,
    greenLight: lighten(accent, 0.2),

    warmWhite: text,
    midGray: adjustAlpha(text, 0.6),
    softGray: adjustAlpha(text, 0.6),
  };
}

/* ── Color utility helpers ── */
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return [128, 128, 128];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");
}

function darken(hex, amount) {
  if (!hex || hex.startsWith("rgba")) return hex;
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function lighten(hex, amount) {
  if (!hex || hex.startsWith("rgba")) return hex;
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function adjustAlpha(hex, alpha) {
  if (!hex || hex.startsWith("rgba")) return hex;
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
