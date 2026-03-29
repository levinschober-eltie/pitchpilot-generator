/**
 * POST /api/share — Create a named share link.
 * Stores compressed payload in Upstash Redis, returns a human-readable slug.
 *
 * Body: { payload: string (lz-string compressed), companyName: string, projectId: string }
 * Returns: { slug: string, url: string }
 *
 * Rate limit: 10 creates per minute per IP (Upstash sliding window)
 */
import { Redis } from "@upstash/redis";
import { shareLimiter, getClientIp } from "./_lib/ratelimit.js";

const redis = Redis.fromEnv();

// --- CORS Whitelist ---
const ALLOWED_ORIGINS = [
  "https://pitchpilot-generator.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

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

/** Validate projectId format — required for share creation, must be non-empty */
function isValidProjectId(id) {
  if (!id || (typeof id === "string" && id.trim().length === 0)) return false;
  return typeof id === "string" && id.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(id);
}

/** Safely parse JSON with fallback */
function safeJsonParse(str, fallback = null) {
  if (typeof str !== "string") return str ?? fallback;
  try {
    return JSON.parse(str);
  } catch (err) {
    console.error("JSON parse error:", err.message);
    return fallback;
  }
}

export default async function handler(req, res) {
  // CORS — Origin-Check
  const origin = req.headers.origin;
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Rate limiting (Upstash sliding window)
  const ip = getClientIp(req);
  const { success, limit, remaining, reset } = await shareLimiter.limit(ip);
  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(reset));

  if (!success) {
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

    // Validate projectId — required for share creation
    if (!isValidProjectId(projectId)) {
      return res.status(400).json({ error: "Invalid or missing projectId" });
    }
    const cleanProjectId = sanitize(projectId, 64);

    // Generate slug: company-name-abc123
    const base = slugify(cleanCompanyName || "pitch");
    const slug = `${base}-${shortId()}`;

    // Store in Redis with 90-day TTL
    const shareData = {
      payload,
      projectId: cleanProjectId,
      companyName: cleanCompanyName,
      createdAt: Date.now(),
      views: [],
    };

    await redis.set(`share:${slug}`, JSON.stringify(shareData), { ex: 90 * 24 * 60 * 60 });

    // Also index by projectId for stats lookup
    const existingRaw = await redis.get(`project_shares:${cleanProjectId}`);
    const slugList = safeJsonParse(existingRaw, []);
    if (!Array.isArray(slugList)) {
      console.error("project_shares data corrupted for:", cleanProjectId);
      return res.status(500).json({ error: "Internal error: corrupted project index" });
    }
    slugList.push({ slug, companyName: cleanCompanyName, createdAt: Date.now() });
    await redis.set(`project_shares:${cleanProjectId}`, JSON.stringify(slugList));

    const url = `/p/${slug}`;
    return res.status(200).json({ slug, url });
  } catch (err) {
    console.error("Share creation failed:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
