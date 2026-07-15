/**
 * Closed-Loop → ErpPilot: meldet Pitch-Öffnungen ('view') und Interessenten
 * ('interest') an das ErpPilot-Backend (POST /api/webhooks/pitchpilot).
 *
 * No-op, solange ERPPILOT_WEBHOOK_URL oder PITCHPILOT_WEBHOOK_SECRET fehlen —
 * so ist der Code gefahrlos zu deployen, bevor die Secrets gesetzt sind.
 * Fehler werden geschluckt (Tracking darf die Nutzer-Antwort nie brechen).
 *
 * Env (Vercel):
 *   ERPPILOT_WEBHOOK_URL     z.B. https://lagerpilot-backend-production.up.railway.app/api/webhooks/pitchpilot
 *   PITCHPILOT_WEBHOOK_SECRET  gleicher Wert wie in Railway
 */
export async function notifyErp(event, data = {}) {
  const url = process.env.ERPPILOT_WEBHOOK_URL;
  const secret = process.env.PITCHPILOT_WEBHOOK_SECRET;
  if (!url || !secret) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-secret": secret,
      },
      body: JSON.stringify({ event, ...data }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.warn("[PitchPilot] ErpPilot-Notify fehlgeschlagen:", err?.message || err);
  }
}
