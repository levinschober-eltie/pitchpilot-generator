import { useTheme } from "../ThemeContext";
import Icon from "./Icons";

export default function ConsultantWatermark({ consultant }) {
  if (!consultant?.name) return null;
  const T = useTheme();

  const btnBase = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.5rem 1rem",
    borderRadius: "2rem",
    fontFamily: T.font,
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.5px",
    textDecoration: "none",
    cursor: "pointer",
    border: "none",
    transition: "all 0.25s ease",
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
  };

  const interestSubject = encodeURIComponent("Interesse an Energiekonzept");
  const interestBody = encodeURIComponent(
    `Sehr geehrte/r ${consultant.name},\n\nich interessiere mich für das vorgestellte Energiekonzept und würde gerne mehr erfahren.\n\nMit freundlichen Grüßen`
  );

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 8000,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        background: `linear-gradient(135deg, ${T.navyDeep}e6, ${T.navy}e6)`,
        borderTop: `1px solid ${T.gold}25`,
        padding: "0.75rem 1.5rem",
        boxShadow: `0 -4px 30px rgba(0,0,0,0.3)`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        {/* Left: consultant info */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.gold}30, ${T.gold}10)`,
              border: `1.5px solid ${T.gold}50`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="user" size={16} color={T.gold} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: T.font,
                fontSize: "0.82rem",
                color: T.warmWhite,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Fragen? Kontaktieren Sie{" "}
              <strong style={{ color: T.gold }}>{consultant.name}</strong>
              {consultant.company && (
                <span style={{ color: T.softGray }}> — {consultant.company}</span>
              )}
            </div>
            {consultant.label && (
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: "0.65rem",
                  color: T.midGray,
                  letterSpacing: "0.5px",
                }}
              >
                {consultant.label}
              </div>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, flexWrap: "wrap" }}>
          {consultant.email && (
            <a
              href={`mailto:${encodeURIComponent(consultant.email)}`}
              style={{
                ...btnBase,
                background: "rgba(255,255,255,0.06)",
                border: `1px solid rgba(255,255,255,0.12)`,
                color: T.warmWhite,
              }}
            >
              <Icon name="mail" size={14} color={T.warmWhite} />
              <span className="watermark-btn-label">E-Mail</span>
            </a>
          )}
          {consultant.phone && (
            <a
              href={`tel:${consultant.phone.replace(/\s/g, "")}`}
              style={{
                ...btnBase,
                background: "rgba(255,255,255,0.06)",
                border: `1px solid rgba(255,255,255,0.12)`,
                color: T.warmWhite,
              }}
            >
              <Icon name="phone" size={14} color={T.warmWhite} />
              <span className="watermark-btn-label">Anrufen</span>
            </a>
          )}
          {consultant.email && (
            <a
              href={`mailto:${encodeURIComponent(consultant.email)}?subject=${interestSubject}&body=${interestBody}`}
              style={{
                ...btnBase,
                background: `linear-gradient(135deg, ${T.gold}, ${T.goldLight})`,
                color: T.navyDeep,
                boxShadow: `0 2px 12px ${T.gold}40`,
              }}
            >
              <Icon name="mail" size={14} color={T.navyDeep} />
              Interesse melden
            </a>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .watermark-btn-label { display: none; }
        }
      `}</style>
    </div>
  );
}
