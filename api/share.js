/**
 * POST /api/share — Create a named share link.
 * Stores compressed payload in Vercel KV, returns a human-readable slug.
 *
 * Body: { payload: string (lz-string compressed), companyName: string, projectId: string }
 * Returns: { slug: string, url: string }
 */
import { kv } from "@vercel/kv";

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

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { payload, companyName, projectId } = req.body;
    if (!payload) return res.status(400).json({ error: "Missing payload" });

    // Generate slug: company-name-abc123
    const base = slugify(companyName || "pitch");
    const slug = `${base}-${shortId()}`;

    // Store in KV with 90-day TTL
    const shareData = {
      payload,
      projectId: projectId || null,
      companyName: companyName || "",
      createdAt: Date.now(),
      views: [],
    };

    await kv.set(`share:${slug}`, JSON.stringify(shareData), { ex: 90 * 24 * 60 * 60 });

    // Also index by projectId for stats lookup
    if (projectId) {
      const existingSlugs = await kv.get(`project_shares:${projectId}`);
      const slugList = existingSlugs ? JSON.parse(existingSlugs) : [];
      slugList.push({ slug, companyName, createdAt: Date.now() });
      await kv.set(`project_shares:${projectId}`, JSON.stringify(slugList));
    }

    const url = `/p/${slug}`;
    return res.status(200).json({ slug, url });
  } catch (err) {
    console.error("Share creation failed:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
