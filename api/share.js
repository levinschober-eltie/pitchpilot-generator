/**
 * POST /api/share — Create a named share link.
 * Stores compressed payload in Vercel KV, returns a human-readable slug.
 *
 * Body: { payload: string (lz-string compressed), companyName: string, projectId: string }
 * Returns: { slug: string, url: string }
 *
 * Rate limit: 10 creates per minute per IP (in-memory, resets on cold start)
 */
import { kv } from "@vercel/kv";

// --- Rate limiting (Map-based, per serverless instance) ---
const rateLimitMap = new Map(); // key: IP -> { count, resetAt }
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip || "unknown";
  let entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateLimitMap.set(key, entry);
  }

  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT - entry.count);

  return { allowed: entry.count <= RATE_LIMIT, remaining, limit: RATE_LIMIT };
}

// Cleanup stale entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 60 * 1000);

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[äöüß]/g, (m) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" })[m])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

/** Sanitize a string: trim and limit length */
function sanitize(str, maxLen = 500) {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, maxLen);
}

/** Validate projectId format (alphanumeric, dashes, underscores, max 64 chars) */
function isValidProjectId(id) {
  if (!id) return true; // optional field
  return typeof id === "string" && id.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(id);
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Rate limiting
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const rateResult = checkRateLimit(ip);
  res.setHeader("X-RateLimit-Limit", String(rateResult.limit));
  res.setHeader("X-RateLimit-Remaining", String(rateResult.remaining));

  if (!rateResult.allowed) {
    return res.status(429).json({ error: "Rate limit exceeded. Max 10 creates per minute." });
  }

  // Basic payload size limit (500KB max)
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 512000) return res.status(413).json({ error: "Payload too large" });

  try {
    const { payload, companyName, projectId } = req.body;
    if (!payload) return res.status(400).json({ error: "Missing payload" });
    if (typeof payload !== "string" || payload.length > 500000) return res.status(400).json({ error: "Invalid payload" });

    // Validate companyName length (max 200 chars)
    const cleanCompanyName = sanitize(companyName, 200);

    // Validate projectId format
    if (!isValidProjectId(projectId)) {
      return res.status(400).json({ error: "Invalid projectId format" });
    }
    const cleanProjectId = projectId ? sanitize(projectId, 64) : null;

    // Generate slug: company-name-abc123
    const base = slugify(cleanCompanyName || "pitch");
    const slug = `${base}-${shortId()}`;

    // Store in KV with 90-day TTL
    const shareData = {
      payload,
      projectId: cleanProjectId,
      companyName: cleanCompanyName,
      createdAt: Date.now(),
      views: [],
    };

    await kv.set(`share:${slug}`, JSON.stringify(shareData), { ex: 90 * 24 * 60 * 60 });

    // Also index by projectId for stats lookup
    if (cleanProjectId) {
      const existingSlugs = await kv.get(`project_shares:${cleanProjectId}`);
      const slugList = existingSlugs ? (typeof existingSlugs === "string" ? JSON.parse(existingSlugs) : existingSlugs) : [];
      slugList.push({ slug, companyName: cleanCompanyName, createdAt: Date.now() });
      await kv.set(`project_shares:${cleanProjectId}`, JSON.stringify(slugList));
    }

    const url = `/p/${slug}`;
    return res.status(200).json({ slug, url });
  } catch (err) {
    console.error("Share creation failed:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
