/**
 * Website CI (Corporate Identity) Analyzer.
 * Fetches a company website via CORS proxy and extracts dominant colors + fonts.
 */

const CORS_PROXY = "https://corsproxy.io/?";

/**
 * Analyze a website URL and extract CI colors and fonts.
 * @param {string} url — Company website URL
 * @returns {{ primary, secondary, accent, bg, text, font, fontSerif }} or null on failure
 */
export async function analyzeWebsiteCI(url) {
  if (!url) return null;

  // Normalize URL
  let normalized = url.trim();
  if (!normalized.startsWith("http")) normalized = "https://" + normalized;

  try {
    const response = await fetch(CORS_PROXY + encodeURIComponent(normalized), {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    return extractCI(html, normalized);
  } catch (err) {
    console.warn("CI-Analyse fehlgeschlagen:", err.message);
    return null;
  }
}

/**
 * Extract CI from raw HTML string.
 */
function extractCI(html, url) {
  const colors = new Map(); // hex → count
  const fonts = [];

  // 1. Meta tags
  const themeColor = matchMeta(html, "theme-color");
  const tileColor = matchMeta(html, "msapplication-TileColor");
  if (themeColor) addColor(colors, themeColor, 5);
  if (tileColor) addColor(colors, tileColor, 3);

  // 2. CSS custom properties in :root
  const rootMatch = html.match(/:root\s*\{([^}]+)\}/i);
  if (rootMatch) {
    const rootBlock = rootMatch[1];
    // Look for color-like custom properties
    const propRe = /--[\w-]*(color|primary|secondary|accent|brand|bg|main)[\w-]*\s*:\s*(#[0-9a-fA-F]{3,8})/gi;
    let m;
    while ((m = propRe.exec(rootBlock)) !== null) {
      addColor(colors, m[2], 4);
    }
    // Any hex in :root
    const hexRe = /#([0-9a-fA-F]{6})\b/g;
    while ((m = hexRe.exec(rootBlock)) !== null) {
      addColor(colors, "#" + m[1], 2);
    }
  }

  // 3. Inline style colors on key elements (header, nav, body, .hero)
  const styleRe = /style\s*=\s*["']([^"']+)["']/gi;
  let sm;
  while ((sm = styleRe.exec(html)) !== null) {
    const hexRe2 = /#([0-9a-fA-F]{6})\b/g;
    let hm;
    while ((hm = hexRe2.exec(sm[1])) !== null) {
      addColor(colors, "#" + hm[1], 1);
    }
  }

  // 4. <style> blocks — extract common colors
  const styleBlockRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let sb;
  while ((sb = styleBlockRe.exec(html)) !== null) {
    const block = sb[1];
    const hexRe3 = /#([0-9a-fA-F]{6})\b/g;
    let hm3;
    while ((hm3 = hexRe3.exec(block)) !== null) {
      addColor(colors, "#" + hm3[1], 1);
    }
    // Font families
    const fontRe = /font-family\s*:\s*([^;}{]+)/gi;
    let fm;
    while ((fm = fontRe.exec(block)) !== null) {
      const cleaned = fm[1].trim().replace(/["']/g, "").split(",")[0].trim();
      if (cleaned && !cleaned.startsWith("-") && cleaned.length > 1) {
        fonts.push(cleaned);
      }
    }
  }

  // 5. Google Fonts link
  const gfMatch = html.match(/fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/i);
  if (gfMatch) {
    const families = decodeURIComponent(gfMatch[1]).split("|").map(f => f.split(":")[0].replace(/\+/g, " "));
    fonts.unshift(...families);
  }

  // 6. Open Graph image color (skip — too complex for client-side)

  // ── Build result from ranked colors ──
  const ranked = [...colors.entries()]
    .filter(([hex]) => !isNearWhite(hex) && !isNearBlack(hex))
    .sort((a, b) => b[1] - a[1]);

  if (ranked.length === 0) return null;

  const primary = ranked[0]?.[0] || "#1B2A4A";
  const secondary = ranked[1]?.[0] || darkenHex(primary, 0.5);
  const accent = ranked[2]?.[0] || lightenHex(primary, 0.3);

  // Determine if the site is light or dark
  const bgCandidates = [...colors.entries()].filter(([hex]) => isNearWhite(hex) || isNearBlack(hex)).sort((a, b) => b[1] - a[1]);
  const bg = bgCandidates[0]?.[0] || "#0F1A2E";
  const isLightBg = isNearWhite(bg);
  const text = isLightBg ? "#1A1A2E" : "#F5F5F0";

  // Build font string
  const font = fonts.length > 0 ? `'${fonts[0]}', sans-serif` : null;

  return { primary, secondary, accent, bg, text, font, fontSerif: null };
}

/* ── Helpers ── */

function matchMeta(html, name) {
  const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
  const m = html.match(re);
  if (m) return m[1].trim();
  // Try reversed attribute order
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i");
  const m2 = html.match(re2);
  return m2 ? m2[1].trim() : null;
}

function addColor(map, hex, weight) {
  const normalized = normalizeHex(hex);
  if (!normalized) return;
  map.set(normalized, (map.get(normalized) || 0) + weight);
}

function normalizeHex(hex) {
  if (!hex || !hex.startsWith("#")) return null;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length === 8) h = h.slice(0, 6); // strip alpha
  if (h.length !== 6) return null;
  return "#" + h.toUpperCase();
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function isNearWhite(hex) {
  const [r, g, b] = hexToRgb(normalizeHex(hex) || "#808080");
  return r > 230 && g > 230 && b > 230;
}

function isNearBlack(hex) {
  const [r, g, b] = hexToRgb(normalizeHex(hex) || "#808080");
  return r < 30 && g < 30 && b < 30;
}

function darkenHex(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const f = 1 - amount;
  return "#" + [r * f, g * f, b * f].map(c => Math.max(0, Math.round(c)).toString(16).padStart(2, "0")).join("");
}

function lightenHex(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return "#" + [r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount]
    .map(c => Math.min(255, Math.round(c)).toString(16).padStart(2, "0")).join("");
}
