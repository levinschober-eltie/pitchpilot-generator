/** Shared color system — Elite PV brand + Pitch presentation */

/* ── Elite PV Brand (configurator/wizard) ── */
export const B = {
  black: "#222222",
  yellow: "#FFCE00",
  yellowLight: "#FFD633",
  yellowDim: "#E6B800",
  white: "#FFFFFF",
  offWhite: "#F8F8F6",
  grayLight: "#F0F0EE",
  grayMid: "#D0D0CC",
  grayText: "#666666",
  grayDark: "#444444",
  border: "rgba(0,0,0,0.08)",
  borderDark: "rgba(0,0,0,0.15)",
  cyan: "#29ABE2",
  green: "#2D8C4E",
  greenLight: "#4CAF7D",
  red: "#E74C3C",
};

/* ── Pitch Presentation (dark premium theme) ── */
export const C = {
  navy: "#1B2A4A",
  navyDeep: "#0F1A2E",
  navyLight: "#253757",
  navyMid: "#1E3050",

  green: "#2D6A4F",
  greenLight: "#4CAF7D",

  gold: "#D4A843",
  goldLight: "#E8C97A",
  goldDim: "#B8923A",

  warmWhite: "#F5F5F0",
  softGray: "#B0B0A6",
  darkText: "#2B2B2B",

  red: "#E74C3C",
};

/** Default brand palette — overridable per project */
export const defaultBrand = {
  primary: B.yellow,
  primaryLight: B.yellowLight,
  secondary: B.black,
  accent: B.cyan,
  bg: B.white,
  bgCard: B.offWhite,
  text: B.black,
  textMuted: B.grayText,
};
