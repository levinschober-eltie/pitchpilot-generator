/** Shared color system — WCAG AA compliant on dark backgrounds */
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
  redDim: "#C0392B",
  blue: "#3498DB",
};

/** Default brand palette — can be overridden per project */
export const defaultBrand = {
  primary: C.gold,
  primaryLight: C.goldLight,
  secondary: C.green,
  secondaryLight: C.greenLight,
  accent: C.navy,
  bg: C.navyDeep,
  bgCard: C.navy,
  text: C.warmWhite,
  textMuted: C.softGray,
};
