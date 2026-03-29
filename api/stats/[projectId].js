/**
 * GET /api/stats/:projectId — Return view analytics for all share links of a project.
 * Returns: { shares: [{ slug, companyName, createdAt, totalViews, uniqueDevices, lastView, recentViews }] }
 *
 * Rate limit: 30 requests per minute per IP (Upstash sliding window)
 * Auth: Bearer token validation via PITCHPILOT_API_TOKEN env variable (optional fallback for dev)
 */
import { Redis } from "@upstash/redis";
import { statsLimiter, getClientIp } from "../_lib/ratelimit.js";

const redis = Redis.fromEnv();

// --- CORS Whitelist ---
const ALLOWED_ORIGINS = [
  "https://pitchpilot-generator.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

/** Validate projectId format (alphanumeric, dashes, underscores, max 64 chars) */
function isValidProjectId(id) {
  return typeof id === "string" && id.length > 0 && id.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(id);
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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Bearer token auth — wenn PITCHPILOT_API_TOKEN gesetzt, muss der Token stimmen
  const authToken = req.headers.authorization?.replace("Bearer ", "");
  const expectedToken = process.env.PITCHPILOT_API_TOKEN;
  if (expectedToken && authToken !== expectedToken) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  // Rate limiting (Upstash sliding window)
  const ip = getClientIp(req);
  const { success, limit, remaining, reset } = await statsLimiter.limit(ip);
  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(reset));

  if (!success) {
    return res.status(429).json({ error: "Rate limit exceeded. Max 30 requests per minute." });
  }

  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: "Missing projectId" });

    // Validate projectId format
    if (!isValidProjectId(projectId)) {
      return res.status(400).json({ error: "Invalid projectId format" });
    }

    // Get all share slugs for this project
    const raw = await redis.get(`project_shares:${projectId}`);
    const slugList = safeJsonParse(raw, []);

    if (!Array.isArray(slugList) || slugList.length === 0) {
      return res.status(200).json({ shares: [] });
    }

    // Fetch stats for each share
    const shares = await Promise.all(
      slugList.map(async ({ slug, companyName, createdAt }) => {
        try {
          const shareRaw = await redis.get(`share:${slug}`);
          if (!shareRaw) return null;

          const data = safeJsonParse(shareRaw, null);
          if (!data) return null;

          const views = Array.isArray(data.views) ? data.views : [];

          // Compute analytics
          const uniqueDevices = new Set(views.map((v) => v.deviceHash)).size;
          const deviceBreakdown = {};
          views.forEach((v) => {
            deviceBreakdown[v.device] = (deviceBreakdown[v.device] || 0) + 1;
          });

          // Recent views (last 30 days)
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const recentViews = views.filter((v) => v.ts > thirtyDaysAgo);

          // Views per day (last 14 days)
          const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
          const dailyViews = {};
          views
            .filter((v) => v.ts > fourteenDaysAgo)
            .forEach((v) => {
              const day = new Date(v.ts).toISOString().slice(0, 10);
              dailyViews[day] = (dailyViews[day] || 0) + 1;
            });

          return {
            slug,
            companyName: companyName || data.companyName,
            createdAt: createdAt || data.createdAt,
            totalViews: views.length,
            uniqueDevices,
            deviceBreakdown,
            lastView: views.length > 0 ? views[views.length - 1].ts : null,
            recentViews: recentViews.length,
            dailyViews,
          };
        } catch {
          return null;
        }
      })
    );

    return res.status(200).json({
      shares: shares.filter(Boolean),
    });
  } catch (err) {
    console.error("Stats fetch failed:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
