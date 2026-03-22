/**
 * GET /api/stats/:projectId — Return view analytics for all share links of a project.
 * Returns: { shares: [{ slug, companyName, createdAt, totalViews, uniqueDevices, lastView, recentViews }] }
 *
 * Rate limit: 30 requests per minute per IP (in-memory, resets on cold start)
 */
import { kv } from "@vercel/kv";

// --- Rate limiting (Map-based, per serverless instance) ---
const rateLimitMap = new Map();
const RATE_LIMIT = 30;
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

/** Validate projectId format (alphanumeric, dashes, underscores, max 64 chars) */
function isValidProjectId(id) {
  return typeof id === "string" && id.length > 0 && id.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(id);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Rate limiting
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const rateResult = checkRateLimit(ip);
  res.setHeader("X-RateLimit-Limit", String(rateResult.limit));
  res.setHeader("X-RateLimit-Remaining", String(rateResult.remaining));

  if (!rateResult.allowed) {
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
    const raw = await kv.get(`project_shares:${projectId}`);
    const slugList = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];

    if (slugList.length === 0) {
      return res.status(200).json({ shares: [] });
    }

    // Fetch stats for each share
    const shares = await Promise.all(
      slugList.map(async ({ slug, companyName, createdAt }) => {
        try {
          const shareRaw = await kv.get(`share:${slug}`);
          if (!shareRaw) return null;

          const data = typeof shareRaw === "string" ? JSON.parse(shareRaw) : shareRaw;
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
