/**
 * Dynamic Google Fonts loader for PitchPilot themes.
 * Checks if a font is a system font (skip), otherwise loads it from Google Fonts.
 */

const SYSTEM_FONTS = new Set([
  "calibri",
  "georgia",
  "arial",
  "arial black",
  "impact",
  "times new roman",
  "cambria",
  "segoe ui",
  "system-ui",
  "sans-serif",
  "serif",
  "helvetica",
  "helvetica neue",
]);

/** Track which fonts have already been loaded */
const loadedFonts = new Set();

/**
 * Extract the primary font name from a CSS font-family string.
 * e.g. "'Inter', 'Helvetica Neue', sans-serif" → "Inter"
 */
function extractPrimaryFont(fontFamily) {
  if (!fontFamily) return null;
  const first = fontFamily.split(",")[0].trim();
  // Strip surrounding quotes
  return first.replace(/^['"]|['"]$/g, "").trim();
}

/**
 * Check if a font name is a known system font.
 */
function isSystemFont(fontName) {
  return SYSTEM_FONTS.has(fontName.toLowerCase());
}

/**
 * Dynamically load a Google Font by inserting a <link> tag.
 * Deduplicates: won't load the same font twice.
 * Returns a promise that resolves when the font is ready.
 *
 * @param {string} fontFamily - CSS font-family string, e.g. "'Inter', sans-serif"
 * @returns {Promise<void>}
 */
export async function loadThemeFont(fontFamily) {
  if (!fontFamily) return;

  const fontName = extractPrimaryFont(fontFamily);
  if (!fontName) return;

  // Skip system fonts
  if (isSystemFont(fontName)) return;

  // Already loaded
  if (loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);

  // Build Google Fonts URL
  const encodedName = fontName.replace(/\s+/g, "+");
  const url = `https://fonts.googleapis.com/css2?family=${encodedName}:wght@400;600;700&display=swap`;

  // Check if link already exists in DOM (e.g. from SSR or manual insertion)
  const existing = document.querySelector(`link[href="${url}"]`);
  if (existing) return;

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.onload = resolve;
    link.onerror = () => {
      // Don't block on font load failure — graceful degradation
      console.warn(`[fontLoader] Could not load Google Font: ${fontName}`);
      resolve();
    };
    document.head.appendChild(link);
  });
}
