/**
 * Zentrale API-Basis für Share/Interest/Engagement.
 *
 * VITE_ERPPILOT_API gesetzt (z.B. https://lagerpilot-backend-production.up.railway.app)
 * → alle Aufrufe gehen an die Self-Host-Routen des ErpPilot-Backends
 *   (/api/public/pitch/*, Postgres statt Upstash — Migration 085).
 * Leer → Fallback auf die alten relativen Vercel-Routen (Legacy), damit die
 * Umstellung deploy-reihenfolge-unabhängig ist.
 */
export const API_BASE = (import.meta.env.VITE_ERPPILOT_API || "").replace(/\/$/, "");

export const pitchApi = {
  /** POST — manuellen Named-Share anlegen: {payload, companyName, projectId} → {slug, url} */
  share: () => (API_BASE ? `${API_BASE}/api/public/pitch/share` : "/api/share"),
  /** GET — Share laden (+View-Tracking serverseitig): → {payload, companyName, createdAt} */
  load: (slug) =>
    API_BASE
      ? `${API_BASE}/api/public/pitch/${encodeURIComponent(slug)}`
      : `/api/p/${encodeURIComponent(slug)}`,
  /** POST — Phase-Engagement (fire-and-forget) */
  event: (slug) =>
    API_BASE
      ? `${API_BASE}/api/public/pitch/${encodeURIComponent(slug)}/event`
      : `/api/p/${encodeURIComponent(slug)}`,
  /** POST — Interesse-Formular → Lead in der ErpPilot-Inbox */
  interest: () => (API_BASE ? `${API_BASE}/api/public/pitch/interest` : "/api/interests"),
};
