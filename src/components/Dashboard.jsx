import { useNavigate } from "react-router-dom";
import { listProjects, deleteProject, duplicateProject, seedDemoProjects, createNamedShareLink, fetchShareStats } from "../store";
import { useState, useEffect, useCallback, useRef, memo } from "react";
import Icon from "./Icons";

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(() => listProjects());
  const [statsOpen, setStatsOpen] = useState(null); // projectId or null
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const refresh = useCallback(() => setProjects(listProjects()), []);

  useEffect(() => {
    seedDemoProjects();
    const t = setTimeout(refresh, 100);
    return () => clearTimeout(t);
  }, [refresh]);

  const handleDelete = useCallback((e, id) => {
    e.stopPropagation();
    if (confirm("Projekt wirklich löschen?")) {
      // Optimistic update: remove from state immediately
      setProjects(prev => prev.filter(p => p.id !== id));
      deleteProject(id);
    }
  }, []);

  const handleDuplicate = useCallback((e, id) => {
    e.stopPropagation();
    const copy = duplicateProject(id);
    if (copy) {
      // Optimistic update: add copy to state immediately
      setProjects(prev => [...prev, copy]);
    } else {
      // Fallback: full refresh if duplicate returned null
      refresh();
    }
  }, [refresh]);

  const [copiedId, setCopiedId] = useState(null);
  const [shareLoading, setShareLoading] = useState(null);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); };
  }, []);

  const handleShare = useCallback(async (e, project) => {
    e.stopPropagation();
    setShareLoading(project.id);
    try {
      const result = await createNamedShareLink(project);
      if (result) {
        await navigator.clipboard.writeText(result.url);
        setCopiedId(project.id);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopiedId(null), 3000);
      }
    } catch { /* silent */ }
    setShareLoading(null);
  }, []);

  const handleWhatsApp = useCallback(async (e, project) => {
    e.stopPropagation();
    setShareLoading(project.id);
    try {
      const result = await createNamedShareLink(project);
      if (result) {
        const name = project.company?.name || "Energietransformation";
        const msg = `Hallo,\n\nhier ist das interaktive Energiekonzept für ${name}:\n${result.url}\n\nMit freundlichen Grüßen`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
      }
    } catch { /* silent */ }
    setShareLoading(null);
  }, []);

  const statsRequestRef = useRef(0);
  const handleOpenStats = useCallback(async (e, projectId) => {
    e.stopPropagation();
    setStatsOpen(prev => {
      if (prev === projectId) return null;
      return projectId;
    });
    // If toggling off, don't fetch
    if (statsOpen === projectId) return;
    const requestId = ++statsRequestRef.current;
    setStatsLoading(true);
    try {
      const data = await fetchShareStats(projectId);
      if (statsRequestRef.current !== requestId) return; // stale
      setStats(data);
    } catch {
      if (statsRequestRef.current !== requestId) return;
      setStats({ shares: [] });
    }
    setStatsLoading(false);
  }, [statsOpen]);

  if (projects.length === 0) {
    return (
      <div className="empty-state fade-in">
        <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }}>
          <Icon name="sparkle" size={64} color="var(--yellow)" />
        </div>
        <h2>Noch keine Projekte</h2>
        <p style={{ marginBottom: "1.5rem" }}>Erstelle deinen ersten interaktiven Energie-Pitch.</p>
        <button className="btn btn-primary btn-lg" onClick={() => navigate("/new")}>
          <Icon name="plus" size={16} /> Neuen Pitch erstellen
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.3rem" }}>Deine Projekte</h2>
        <button className="btn btn-primary" onClick={() => navigate("/new")}>
          <Icon name="plus" size={14} /> Neuer Pitch
        </button>
      </div>
      <div className="grid-3">
        {projects.map((p) => (
          <div key={p.id}>
            <ProjectCard
              project={p}
              copiedId={copiedId}
              shareLoading={shareLoading}
              statsOpen={statsOpen}
              onNavigate={navigate}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onShare={handleShare}
              onWhatsApp={handleWhatsApp}
              onOpenStats={handleOpenStats}
            />

            {/* Analytics Panel */}
            {statsOpen === p.id && (
              <ShareAnalytics stats={stats} loading={statsLoading} projectName={p.company?.name || p.name} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const ProjectCard = memo(function ProjectCard({ project: p, copiedId, shareLoading, statsOpen, onNavigate, onDelete, onDuplicate, onShare, onWhatsApp, onOpenStats }) {
  return (
    <div
      className="card card-hover project-card"
      role="link"
      tabIndex={0}
      onClick={() => onNavigate(p.generated ? `/present/${p.id}` : `/edit/${p.id}`)}
      onKeyDown={(e) => { if (e.key === "Enter") onNavigate(p.generated ? `/present/${p.id}` : `/edit/${p.id}`); }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>
            {p.company?.name || p.name || "Unbenannt"}
          </h3>
          <div className="project-meta">
            {p.company?.city && <span>{p.company.city} · </span>}
            {p.phases?.filter(ph => ph.enabled).length || 0} Phasen
            {p.generated && (
              p.generatedAt && p.updatedAt > p.generatedAt + 5000
                ? <span style={{ color: "var(--yellow)", marginLeft: "0.5rem", animation: "pulse 2s ease-in-out infinite" }}>Veraltet</span>
                : <span style={{ color: "var(--green-light)", marginLeft: "0.5rem" }}>Generiert</span>
            )}
            {p.versions?.length > 0 && <span style={{ color: "var(--cyan)", marginLeft: "0.5rem" }}>{p.versions.length} V.</span>}
            {p.id?.startsWith("demo_") && <span style={{ color: "var(--yellow)", marginLeft: "0.5rem", fontSize: "0.65rem", fontWeight: 600 }}>DEMO</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onNavigate(`/edit/${p.id}`); }} title="Bearbeiten" aria-label="Bearbeiten">
            <Icon name="settings" size={12} />
          </button>
          <button
            className={`btn ${copiedId === p.id ? "btn-primary" : "btn-secondary"} btn-sm`}
            onClick={(e) => onShare(e, p)}
            title={copiedId === p.id ? "Link kopiert!" : "Link erstellen & teilen"}
            aria-label="Teilen"
            disabled={shareLoading === p.id}
          >
            {shareLoading === p.id ? (
              <span className="spinner" style={{ width: 12, height: 12, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "var(--yellow)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            ) : (
              <Icon name={copiedId === p.id ? "check" : "eye"} size={12} />
            )}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={(e) => onWhatsApp(e, p)}
            title="Per WhatsApp senden"
            aria-label="WhatsApp"
            disabled={shareLoading === p.id}
            style={{ background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)" }}
          >
            <Icon name="phone" size={12} color="#25D366" />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={(e) => onOpenStats(e, p.id)} title="Statistiken" aria-label="Statistiken"
            style={statsOpen === p.id ? { background: "var(--yellow)", color: "var(--black)" } : undefined}>
            <Icon name="chart" size={12} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={(e) => onDuplicate(e, p.id)} title="Duplizieren" aria-label="Duplizieren">
            <Icon name="copy" size={12} />
          </button>
          <button className="btn btn-danger btn-sm" onClick={(e) => onDelete(e, p.id)} title="Löschen" aria-label="Löschen">
            <Icon name="trash" size={12} />
          </button>
        </div>
      </div>
      {/* "Kopiert!" Inline-Feedback */}
      {copiedId === p.id && (
        <div style={{
          marginTop: "0.5rem", padding: "0.3rem 0.6rem", borderRadius: 6,
          background: "rgba(45,140,78,0.08)", border: "1px solid rgba(45,140,78,0.2)",
          fontSize: "0.72rem", fontWeight: 600, color: "var(--green)",
          display: "flex", alignItems: "center", gap: "0.3rem",
          animation: "fadeIn 0.2s ease forwards",
        }}>
          <Icon name="check" size={12} color="var(--green)" /> Link in Zwischenablage kopiert
        </div>
      )}
      {p.updatedAt && copiedId !== p.id && (
        <div className="project-meta" style={{ marginTop: "0.75rem", fontSize: "0.7rem" }}>
          Zuletzt: {new Date(p.updatedAt).toLocaleDateString("de-DE")}
        </div>
      )}
    </div>
  );
});

function ShareAnalytics({ stats, loading, projectName }) {
  if (loading) {
    return (
      <div className="card" style={{ marginTop: "0.5rem", padding: "1rem", textAlign: "center" }}>
        <div className="spinner" style={{ width: 20, height: 20, border: "2px solid var(--gray-mid)", borderTopColor: "var(--yellow)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
        <div style={{ fontSize: "0.75rem", color: "var(--gray-text)", marginTop: "0.5rem" }}>Lade Statistiken...</div>
      </div>
    );
  }

  if (!stats?.shares?.length) {
    return (
      <div className="card" style={{ marginTop: "0.5rem", padding: "1rem", textAlign: "center" }}>
        <div style={{ fontSize: "0.85rem", color: "var(--gray-text)" }}>
          Noch keine geteilten Links. Klicke auf <Icon name="eye" size={12} /> um einen Link zu erstellen.
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: "0.5rem", padding: "1rem" }}>
      {/* Interest leads */}
      {stats.interests?.length > 0 && (
        <div style={{ marginBottom: "1rem", padding: "0.6rem", background: "rgba(255,206,0,0.06)", borderRadius: 8, border: "1px solid rgba(255,206,0,0.15)" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--yellow)", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <Icon name="mail" size={13} color="var(--yellow)" /> {stats.interests.length} Lead{stats.interests.length !== 1 ? "s" : ""}
          </div>
          {stats.interests.slice(-5).reverse().map((lead, i) => (
            <div key={i} style={{ padding: "0.35rem 0", borderBottom: i < Math.min(4, stats.interests.length - 1) ? "1px solid rgba(255,255,255,0.05)" : "none", fontSize: "0.72rem" }}>
              <div style={{ fontWeight: 600 }}>{lead.name} · <a href={`mailto:${lead.email}`} style={{ color: "var(--yellow)" }}>{lead.email}</a></div>
              {lead.phone && <div style={{ color: "var(--gray-text)" }}>{lead.phone}</div>}
              {lead.message && <div style={{ color: "var(--gray-text)", fontStyle: "italic", marginTop: "0.1rem" }}>„{lead.message}"</div>}
              <div style={{ color: "var(--gray-text)", fontSize: "0.6rem", marginTop: "0.1rem" }}>
                {new Date(lead.timestamp).toLocaleString("de-DE")}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <Icon name="chart" size={14} color="var(--yellow)" /> Link-Statistiken
      </div>
      {stats.shares.map((s) => (
        <div key={s.slug} style={{ padding: "0.6rem", marginBottom: "0.5rem", background: "var(--off-white)", borderRadius: 8, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>/p/{s.slug}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--gray-text)" }}>
                Erstellt: {new Date(s.createdAt).toLocaleDateString("de-DE")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--yellow)" }}>{s.totalViews}</div>
              <div style={{ fontSize: "0.6rem", color: "var(--gray-text)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Aufrufe</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <StatPill label="Geräte" value={s.uniqueDevices} />
            <StatPill label="Letzte 30 Tage" value={s.recentViews} />
            {s.lastView && (
              <StatPill label="Letzter Aufruf" value={new Date(s.lastView).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} />
            )}
          </div>

          {/* Device breakdown */}
          {s.deviceBreakdown && Object.keys(s.deviceBreakdown).length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
              {Object.entries(s.deviceBreakdown).map(([device, count]) => (
                <span key={device} style={{
                  fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: 12,
                  background: device === "desktop" ? "rgba(41,171,226,0.1)" : device === "mobile" ? "rgba(255,206,0,0.1)" : "rgba(45,140,78,0.1)",
                  color: device === "desktop" ? "var(--cyan)" : device === "mobile" ? "var(--yellow)" : "var(--green)",
                  border: `1px solid ${device === "desktop" ? "rgba(41,171,226,0.2)" : device === "mobile" ? "rgba(255,206,0,0.2)" : "rgba(45,140,78,0.2)"}`,
                }}>
                  {device === "desktop" ? "Desktop" : device === "mobile" ? "Mobil" : "Tablet"}: {count}
                </span>
              ))}
            </div>
          )}

          {/* Phase engagement breakdown */}
          {s.phaseEngagement?.phaseViews && Object.keys(s.phaseEngagement.phaseViews).length > 0 && (
            <div style={{ marginTop: "0.5rem" }}>
              <div style={{ fontSize: "0.6rem", color: "var(--gray-text)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Phasen-Engagement
              </div>
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                {Object.entries(s.phaseEngagement.phaseViews).sort((a, b) => a[0] - b[0]).map(([phase, count]) => {
                  const phaseNames = ["I", "II", "III", "IV", "V", "VI", "★"];
                  const avgSec = s.phaseEngagement.avgDuration?.[phase] || 0;
                  return (
                    <div key={phase} title={`Phase ${phaseNames[phase] || phase}: ${count} Aufrufe, Ø ${avgSec}s`} style={{
                      padding: "0.2rem 0.45rem", borderRadius: 6, fontSize: "0.62rem", fontWeight: 600,
                      background: count > 3 ? "rgba(255,206,0,0.12)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${count > 3 ? "rgba(255,206,0,0.25)" : "var(--border)"}`,
                      color: count > 3 ? "var(--yellow)" : "var(--gray-text)",
                    }}>
                      {phaseNames[phase] || phase}: {count}× {avgSec > 0 ? `(Ø${avgSec}s)` : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mini daily chart (last 14 days) */}
          {s.dailyViews && Object.keys(s.dailyViews).length > 0 && (
            <DailyChart dailyViews={s.dailyViews} />
          )}
        </div>
      ))}
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
      <span style={{ fontSize: "0.65rem", color: "var(--gray-text)" }}>{label}:</span>
      <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function DailyChart({ dailyViews }) {
  // Build 14-day array
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, count: dailyViews[key] || 0, label: d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) });
  }
  const maxCount = Math.max(...days.map(d => d.count), 1);

  return (
    <div style={{ marginTop: "0.5rem" }}>
      <div style={{ fontSize: "0.6rem", color: "var(--gray-text)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Aufrufe (14 Tage)
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 32 }}>
        {days.map((d) => (
          <div key={d.key} title={`${d.label}: ${d.count} Aufrufe`} style={{
            flex: 1, minWidth: 4,
            height: d.count > 0 ? Math.max(4, (d.count / maxCount) * 32) : 2,
            background: d.count > 0 ? "var(--yellow)" : "var(--gray-mid)",
            borderRadius: 2,
            opacity: d.count > 0 ? 1 : 0.3,
            transition: "height 0.3s",
          }} />
        ))}
      </div>
    </div>
  );
}
