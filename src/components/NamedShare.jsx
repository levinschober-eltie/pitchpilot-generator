/**
 * NamedShare — Loads a shared pitch by slug from the API,
 * then redirects to the existing SharedPresentation with the data as a URL param.
 * Route: /p/:slug
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { C } from "../colors";
import Icon from "./Icons";

export default function NamedShare() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const resp = await fetch(`/api/p/${encodeURIComponent(slug)}`);
        if (!resp.ok) {
          if (!cancelled) setError("Link nicht gefunden oder abgelaufen.");
          return;
        }
        const { payload } = await resp.json();
        if (!payload) {
          if (!cancelled) setError("Ungültige Daten.");
          return;
        }

        // Redirect to SharedPresentation with the payload + slug as URL params
        if (!cancelled) {
          navigate(`/shared?d=${payload}&slug=${encodeURIComponent(slug)}`, { replace: true });
        }
      } catch {
        if (!cancelled) setError("Fehler beim Laden. Bitte prüfen Sie Ihre Verbindung.");
      }
    })();

    return () => { cancelled = true; };
  }, [slug, navigate]);

  if (error) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        height: "100vh", background: C.navyDeep, color: C.warmWhite, gap: "1rem",
      }}>
        <Icon name="shield" size={48} color={C.gold} />
        <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{error}</div>
        <div style={{ fontSize: "0.8rem", color: C.softGray }}>
          Bitte prüfen Sie den Link oder kontaktieren Sie Ihren Berater.
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100vh", background: C.navyDeep, gap: "1rem",
    }}>
      <div className="spinner" style={{
        width: 40, height: 40,
        border: "3px solid rgba(255,255,255,0.1)",
        borderTopColor: C.gold,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <div style={{ fontSize: "0.8rem", color: C.softGray, letterSpacing: "1px" }}>Pitch wird geladen...</div>
    </div>
  );
}
