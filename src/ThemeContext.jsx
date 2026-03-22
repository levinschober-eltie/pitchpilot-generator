import { createContext, useContext, useEffect, useMemo } from "react";
import { resolveTheme } from "./themes";
import { C } from "./colors";
import { loadThemeFont } from "./fontLoader";

/** Fallback: original C palette augmented with font keys */
const FALLBACK = { ...C, font: "Calibri, sans-serif", fontSerif: "Georgia, serif" };

const ThemeCtx = createContext(FALLBACK);

/**
 * Wraps children with the resolved theme based on project.theme config.
 * Usage: <ThemeProvider themeConfig={project.theme}>...</ThemeProvider>
 */
export function ThemeProvider({ themeConfig, children }) {
  const theme = useMemo(
    () => (themeConfig ? resolveTheme(themeConfig) : FALLBACK),
    [themeConfig],
  );

  // Dynamically load Google Fonts when theme changes
  useEffect(() => {
    if (theme.font) loadThemeFont(theme.font);
    if (theme.fontSerif) loadThemeFont(theme.fontSerif);
  }, [theme.font, theme.fontSerif]);

  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>;
}

/**
 * Access the current presentation theme.
 * Returns an object with the same keys as C plus font/fontSerif.
 */
export function useTheme() {
  return useContext(ThemeCtx);
}
