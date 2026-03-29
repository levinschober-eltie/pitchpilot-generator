/**
 * GET /api/p/:slug — Load share data and record a view event.
 * Returns the compressed payload for the client to decompress.
 * Tracks: timestamp, user-agent, IP hash (privacy-safe), viewport.
 *
 * No rate limit — view tracking should work freely.
 */
import { Redis } from "@upstash/redis";
import { createHash } from "crypto";

const redis = Redis.fromEnv();

// --- CORS Whitelist ---
const ALLOWED_ORIGINS = [
  "https://pitchpilot-generator.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

function hashIp(ip) {
  if (!ip) return "unknown";
  // One-way hash for privacy — can't reconstruct the IP
  return createHash("sha256").update(ip + "pitchpilot-salt-2026").digest("hex").slice(0, 12);
}

function parseDevice(ua) {
  if (!ua) return "unknown";
  if (/iPad|tablet/i.test(ua)) return "tablet";
  if (/iPhone|Android.*Mobile|webOS/i.test(ua)) return "mobile";
  return "desktop";
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
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { slug } = req.query;
    if (!slug || typeof slug !== "string" || slug.length > 100 || !/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: "Invalid slug" });
    }

    const raw = await redis.get(`share:${slug}`);
    if (!raw) return res.status(404).json({ error: "Link not found or expired" });

    const data = safeJsonParse(raw, null);
    if (!data) {
      console.error("Corrupted share data for slug:", slug);
      return res.status(500).json({ error: "Internal error: corrupted share data" });
    }

    // Record view event (non-blocking — don't let tracking failure block the response)
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress;
    const viewEvent = {
      ts: Date.now(),
      device: parseDevice(req.headers["user-agent"]),
      deviceHash: hashIp(ip),
      ua: (req.headers["user-agent"] || "").slice(0, 200),
      referer: (req.headers["referer"] || "").slice(0, 200),
    };

    // Append view (keep last 500 views max)
    const views = Array.isArray(data.views) ? data.views : [];
    views.push(viewEvent);
    if (views.length > 500) views.splice(0, views.length - 500);
    data.views = views;

    // Save async — don't await to keep response fast
    redis.set(`share:${slug}`, JSON.stringify(data), { ex: 90 * 24 * 60 * 60 }).catch(() => {});

    return res.status(200).json({
      payload: data.payload,
      companyName: data.companyName,
      createdAt: data.createdAt,
    });
  } catch (err) {
    console.error("Share load failed:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
