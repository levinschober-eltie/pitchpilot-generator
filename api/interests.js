/**
 * POST /api/interests — Submit interest from a shared pitch viewer.
 * Stores lead data in Redis for the consultant to retrieve.
 *
 * Body: { slug, projectId, name, email, phone?, message? }
 * Rate limit: 5 per minute per IP
 */
import { Redis } from "@upstash/redis";
import { interestLimiter, getClientIp } from "./_lib/ratelimit.js";

const redis = Redis.fromEnv();

// --- CORS Whitelist ---
const ALLOWED_ORIGINS = [
  "https://pitchpilot-generator.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

/** Sanitize a string: trim and limit length */
function sanitize(str, maxLen = 500) {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, maxLen);
}

/** Basic email validation */
function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin;
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // CSRF: nur JSON
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }

  // Rate limiting
  const ip = getClientIp(req);
  const { success, limit, remaining, reset } = await interestLimiter.limit(ip);
  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(reset));
  if (!success) {
    return res.status(429).json({ error: "Zu viele Anfragen. Bitte kurz warten." });
  }

  // Payload size limit
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 10000) return res.status(413).json({ error: "Payload too large" });

  try {
    const { slug, projectId, name, email, phone, message } = req.body;

    // Validation
    if (!name || sanitize(name).length < 2) {
      return res.status(400).json({ error: "Name ist erforderlich (min. 2 Zeichen)." });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Gültige E-Mail-Adresse erforderlich." });
    }

    const interest = {
      name: sanitize(name, 100),
      email: sanitize(email, 100),
      phone: sanitize(phone || "", 30),
      message: sanitize(message || "", 1000),
      slug: sanitize(slug || "", 100),
      projectId: sanitize(projectId || "", 64),
      timestamp: Date.now(),
      ip: ip.slice(0, 20), // truncated for privacy
    };

    // Store in Redis — keyed by projectId for consultant lookup
    const key = projectId ? `interests:${sanitize(projectId, 64)}` : `interests:${sanitize(slug, 100)}`;

    let existing = [];
    try {
      const raw = await redis.get(key);
      if (typeof raw === "string") {
        existing = JSON.parse(raw);
      } else if (Array.isArray(raw)) {
        existing = raw;
      }
    } catch { /* start fresh */ }

    if (!Array.isArray(existing)) existing = [];
    existing.push(interest);

    // Keep max 200 interests per project
    if (existing.length > 200) existing.splice(0, existing.length - 200);

    await redis.set(key, JSON.stringify(existing), { ex: 180 * 24 * 60 * 60 }); // 180 Tage TTL

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Interest submission failed:", err);
    return res.status(500).json({ error: "Interner Fehler" });
  }
}
