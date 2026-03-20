import { useNavigate } from "react-router-dom";
import { listProjects, deleteProject, duplicateProject, seedDemoProjects, encodeSharePayload } from "../store";
import { useState, useEffect } from "react";
import Icon from "./Icons";

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(() => listProjects());

  const refresh = () => setProjects(listProjects());

  useEffect(() => {
    seedDemoProjects();
    // Re-read after async seed completes
    const t = setTimeout(refresh, 100);
    return () => clearTimeout(t);
  }, []);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm("Projekt wirklich löschen?")) {
      deleteProject(id);
      refresh();
    }
  };

  const handleDuplicate = (e, id) => {
    e.stopPropagation();
    duplicateProject(id);
    refresh();
  };

  const [copiedId, setCopiedId] = useState(null);
  const handleShare = async (e, project) => {
    e.stopPropagation();
    const url = await encodeSharePayload(project);
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedId(project.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

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
          <div
            key={p.id}
            className="card card-hover project-card"
            onClick={() => navigate(p.generated ? `/present/${p.id}` : `/edit/${p.id}`)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>
                  {p.company?.name || p.name || "Unbenannt"}
                </h3>
                <div className="project-meta">
                  {p.company?.city && <span>{p.company.city} · </span>}
                  {p.phases?.filter(ph => ph.enabled).length || 0} Phasen
                  {p.generated && <span style={{ color: "var(--green-light)", marginLeft: "0.5rem" }}>● Generiert</span>}
                  {p.versions?.length > 0 && <span style={{ color: "var(--cyan)", marginLeft: "0.5rem" }}>{p.versions.length} V.</span>}
                  {p.id?.startsWith("demo_") && <span style={{ color: "var(--yellow)", marginLeft: "0.5rem", fontSize: "0.65rem", fontWeight: 600 }}>DEMO</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/edit/${p.id}`); }} title="Einstellungen">
                  <Icon name="settings" size={12} />
                </button>
                <button className={`btn ${copiedId === p.id ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={(e) => handleShare(e, p)} title={copiedId === p.id ? "Link kopiert!" : "Teilen"}>
                  <Icon name={copiedId === p.id ? "check" : "eye"} size={12} />
                </button>
                <button className="btn btn-secondary btn-sm" onClick={(e) => handleDuplicate(e, p.id)} title="Duplizieren">
                  <Icon name="copy" size={12} />
                </button>
                <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(e, p.id)} title="Löschen">
                  <Icon name="trash" size={12} />
                </button>
              </div>
            </div>
            {p.updatedAt && (
              <div className="project-meta" style={{ marginTop: "0.75rem", fontSize: "0.7rem" }}>
                Zuletzt: {new Date(p.updatedAt).toLocaleDateString("de-DE")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
