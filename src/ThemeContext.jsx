import { createContext, useContext } from "react";
import { resolveTheme } from "./themes";
import { C } from "./colors";

/** Fallback: original C palette augmented with font keys */
const FALLBACK = { ...C, font: "Calibri, sans-serif", fontSerif: "Georgia, serif" };

const ThemeCtx = createContext(FALLBACK);

/**
 * Wraps children with the resolved theme based on project.theme config.
 * Usage: <ThemeProvider themeConfig={project.theme}>...</ThemeProvider>
 */
export function ThemeProvider({ themeConfig, children }) {
  const theme = themeConfig ? resolveTheme(themeConfig) : FALLBACK;
  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>;
}

/**
 * Access the current presentation theme.
 * Returns an object with the same keys as C plus font/fontSerif.
 */
export function useTheme() {
  return useContext(ThemeCtx);
}
