/**
 * GET /api/p/:slug — Load share data and record a view event.
 * Returns the compressed payload for the client to decompress.
 * Tracks: timestamp, user-agent, IP hash (privacy-safe), viewport.
 */
import { kv } from "@vercel/kv";
import { createHash } from "crypto";

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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: "Missing slug" });

    const raw = await kv.get(`share:${slug}`);
    if (!raw) return res.status(404).json({ error: "Link not found or expired" });

    const data = typeof raw === "string" ? JSON.parse(raw) : raw;

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
    kv.set(`share:${slug}`, JSON.stringify(data), { ex: 90 * 24 * 60 * 60 }).catch(() => {});

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
