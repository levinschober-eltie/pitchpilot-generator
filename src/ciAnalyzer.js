/**
 * Website CI (Corporate Identity) Analyzer.
 * Fetches a company website via CORS proxy cascade and extracts dominant colors + fonts.
 */

/** Ordered list of CORS proxy strategies. Each returns the fetch URL for a given target. */
const PROXY_CHAIN = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => url, // direct fetch — works when target allows CORS
];

const TIMEOUT_PER_PROXY = 8_000;
const TIMEOUT_TOTAL = 12_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB

/** Error types exported alongside null results */
export const CI_ERROR = Object.freeze({
  NETWORK: "NETWORK",         // Website nicht erreichbar
  BLOCKED: "BLOCKED",         // Website blockiert Zugriff (CORS/403)
  NO_COLORS: "NO_COLORS",     // Keine Farben gefunden
  INVALID: "INVALID",         // Antwort ist kein gültiges HTML
});

/** German user-facing messages per error type */
export const CI_ERROR_MSG = Object.freeze({
  [CI_ERROR.NETWORK]: "Website nicht erreichbar",
  [CI_ERROR.BLOCKED]: "Website blockiert Zugriff",
  [CI_ERROR.NO_COLORS]: "Keine Farben gefunden",
  [CI_ERROR.INVALID]: "Antwort ist kein gültiges HTML",
});

/**
 * Analyze a website URL and extract CI colors and fonts.
 * @param {string} url — Company website URL
 * @returns {{ data, error, errorType }}
 *   - data: { primary, secondary, accent, bg, text, font, fontSerif, ogImage, faviconUrl } or null
 *   - error: German error string or null
 *   - errorType: one of CI_ERROR or null
 */
export async function analyzeWebsiteCI(url) {
  if (!url) return { data: null, error: null, errorType: null };

  // Normalize URL
  let normalized = url.trim();
  if (!normalized.startsWith("http")) normalized = "https://" + normalized;

  const totalController = new AbortController();
  const totalTimeout = setTimeout(() => totalController.abort(), TIMEOUT_TOTAL);

  let lastError = null;

  try {
    for (const proxyFn of PROXY_CHAIN) {
      if (totalController.signal.aborted) break;

      try {
        const proxyUrl = proxyFn(normalized);
        const perProxyController = new AbortController();
        const perProxyTimeout = setTimeout(() => perProxyController.abort(), TIMEOUT_PER_PROXY);

        // Abort per-proxy controller if total controller fires
        const onTotalAbort = () => perProxyController.abort();
        totalController.signal.addEventListener("abort", onTotalAbort, { once: true });

        let response;
        try {
          response = await fetch(proxyUrl, { signal: perProxyController.signal });
        } finally {
          clearTimeout(perProxyTimeout);
          totalController.signal.removeEventListener("abort", onTotalAbort);
        }

        if (response.status === 403 || response.status === 401) {
          lastError = { error: CI_ERROR_MSG[CI_ERROR.BLOCKED], errorType: CI_ERROR.BLOCKED };
          continue;
        }
        if (!response.ok) {
          lastError = { error: CI_ERROR_MSG[CI_ERROR.NETWORK], errorType: CI_ERROR.NETWORK };
          continue;
        }

        // ── Size guard: abort if response is too large ──
        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
          // Still try — we'll slice the text below
        }

        let html = await readResponseLimited(response, MAX_RESPONSE_BYTES);

        // ── Validate: must look like HTML ──
        const contentType = response.headers.get("content-type") || "";
        const looksLikeHTML = /text\/html/i.test(contentType)
          || html.trimStart().startsWith("<!DOCTYPE")
          || html.trimStart().startsWith("<!doctype")
          || html.trimStart().slice(0, 200).toLowerCase().includes("<html");

        if (!looksLikeHTML) {
          lastError = { error: CI_ERROR_MSG[CI_ERROR.INVALID], errorType: CI_ERROR.INVALID };
          continue;
        }

        // ── Security: strip <script> tags before processing ──
        html = html.replace(/<script[\s\S]*?<\/script>/gi, "");

        const ci = extractCI(html, normalized);
        if (!ci) {
          return { data: null, error: CI_ERROR_MSG[CI_ERROR.NO_COLORS], errorType: CI_ERROR.NO_COLORS };
        }
        return { data: ci, error: null, errorType: null };
      } catch (err) {
        if (err.name === "AbortError") {
          lastError = { error: CI_ERROR_MSG[CI_ERROR.NETWORK], errorType: CI_ERROR.NETWORK };
        } else {
          lastError = { error: CI_ERROR_MSG[CI_ERROR.NETWORK], errorType: CI_ERROR.NETWORK };
        }
        // Try next proxy
        continue;
      }
    }

    // All proxies exhausted
    return { data: null, ...(lastError || { error: CI_ERROR_MSG[CI_ERROR.NETWORK], errorType: CI_ERROR.NETWORK }) };
  } finally {
    clearTimeout(totalTimeout);
  }
}

/**
 * Read response body up to maxBytes, then abort.
 */
async function readResponseLimited(response, maxBytes) {
  const reader = response.body?.getReader();
  if (!reader) return await response.text();

  const chunks = [];
  let totalRead = 0;
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalRead += value.byteLength;
      if (totalRead >= maxBytes) break;
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  return chunks.map(c => decoder.decode(c, { stream: true })).join("") + decoder.decode();
}

/**
 * Extract CI from raw HTML string (already sanitized — no script tags).
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
    const propRe = /--[\w-]*(color|primary|secondary|accent|brand|bg|main)[\w-]*\s*:\s*(#[0-9a-fA-F]{3,8})/gi;
    let m;
    while ((m = propRe.exec(rootBlock)) !== null) {
      addColor(colors, m[2], 4);
    }
    const hexRe = /#([0-9a-fA-F]{6})\b/g;
    while ((m = hexRe.exec(rootBlock)) !== null) {
      addColor(colors, "#" + m[1], 2);
    }
  }

  // 3. Inline style colors on ALL elements (general)
  const styleRe = /style\s*=\s*["']([^"']+)["']/gi;
  let sm;
  while ((sm = styleRe.exec(html)) !== null) {
    const hexRe2 = /#([0-9a-fA-F]{6})\b/g;
    let hm;
    while ((hm = hexRe2.exec(sm[1])) !== null) {
      addColor(colors, "#" + hm[1], 1);
    }
  }

  // 3b. Inline CSS on key structural elements (header, nav, footer) — higher weight
  const structuralRe = /<(header|nav|footer)\b[^>]*style\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let structMatch;
  while ((structMatch = structuralRe.exec(html)) !== null) {
    const inlineCSS = structMatch[2];
    // Extract background-color and color values
    const bgColorRe = /(?:background-color|background|color)\s*:\s*(#[0-9a-fA-F]{3,8})/gi;
    let cm;
    while ((cm = bgColorRe.exec(inlineCSS)) !== null) {
      addColor(colors, cm[1], 3); // higher weight for structural elements
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

    // 4b. Colors from background-color/color properties in style blocks (structural selectors)
    const structSelectorRe = /(?:header|nav|footer|\.header|\.nav|\.footer|\.navbar)[^{]*\{([^}]+)\}/gi;
    let ssm;
    while ((ssm = structSelectorRe.exec(block)) !== null) {
      const props = ssm[1];
      const propColorRe = /(?:background-color|background|color)\s*:\s*(#[0-9a-fA-F]{3,8})/gi;
      let pcm;
      while ((pcm = propColorRe.exec(props)) !== null) {
        addColor(colors, pcm[1], 3);
      }
    }
  }

  // 5. Google Fonts link
  const gfMatch = html.match(/fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/i);
  if (gfMatch) {
    const families = decodeURIComponent(gfMatch[1]).split("|").map(f => f.split(":")[0].replace(/\+/g, " "));
    fonts.unshift(...families);
  }

  // 6. OG image meta tag
  const ogImage = matchMetaProperty(html, "og:image");

  // 7. Favicon URL for brand color detection
  const faviconMatch = html.match(/<link[^>]+rel\s*=\s*["'](?:icon|shortcut icon)["'][^>]+href\s*=\s*["']([^"']+)["']/i)
    || html.match(/<link[^>]+href\s*=\s*["']([^"']+)["'][^>]+rel\s*=\s*["'](?:icon|shortcut icon)["']/i);
  let faviconUrl = null;
  if (faviconMatch) {
    faviconUrl = faviconMatch[1];
    // Resolve relative URLs
    if (faviconUrl && !faviconUrl.startsWith("http")) {
      try {
        faviconUrl = new URL(faviconUrl, url).href;
      } catch { /* leave as-is */ }
    }
  }

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

  return { primary, secondary, accent, bg, text, font, fontSerif: null, ogImage, faviconUrl };
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

function matchMetaProperty(html, property) {
  const re = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i");
  const m = html.match(re);
  if (m) return m[1].trim();
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i");
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
