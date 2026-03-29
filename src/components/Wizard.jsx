import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProject, saveProject, createBlankProject } from "../store";
import CompanyStep from "./CompanyStep";
import EnergyStep from "./EnergyStep";
import PhaseStep from "./PhaseStep";
import GenerateStep from "./GenerateStep";
import Icon from "./Icons";

const MarketAnalysis = lazy(() => import("./MarketAnalysis"));
const PdfExport = lazy(() => import("./PdfExport"));

const STEPS = [
  { key: "company", label: "Unternehmen", icon: "building" },
  { key: "energy", label: "Energieprofil", icon: "bolt" },
  { key: "phases", label: "Phasen", icon: "target" },
  { key: "market", label: "Marktanalyse", icon: "chart" },
  { key: "generate", label: "Generieren", icon: "sparkle" },
];

export default function Wizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(() => {
    if (id) {
      const existing = getProject(id);
      if (existing) return existing;
    }
    return createBlankProject();
  });
  const [step, setStep] = useState(project.step || 0);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [hasPendingSave, setHasPendingSave] = useState(false);

  // Debounced save — avoids excessive localStorage writes during slider drags
  useEffect(() => {
    setHasPendingSave(true);
    const timer = setTimeout(() => {
      const saved = saveProject({ ...project, step });
      if (!id && saved.id) {
        window.history.replaceState(null, "", `#/edit/${saved.id}`);
      }
      setHasPendingSave(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [project, step]);

  // Warn before unload only when a save is still pending
  useEffect(() => {
    if (!hasPendingSave) return;
    const warn = (e) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasPendingSave]);

  const update = (section, data) => {
    setProject((prev) => ({ ...prev, [section]: { ...prev[section], ...data } }));
  };

  const updateFull = (key, value) => {
    setProject((prev) => ({ ...prev, [key]: value }));
  };

  const canNext = () => {
    if (step === 0) return project.company?.name?.trim().length > 0;
    if (step === 1) return (project.energy?.stromverbrauch || 0) + (project.energy?.gasverbrauch || 0) > 0;
    if (step === 2) return project.phases?.some((p) => p.enabled && p.key !== "bess");
    return true;
  };

  const goNext = () => {
    if (step < STEPS.length - 1 && canNext()) {
      const newStep = step + 1;
      setStep(newStep);
      saveProject({ ...project, step: newStep });
    }
  };
  const goBack = () => {
    if (step > 0) {
      const newStep = step - 1;
      setStep(newStep);
      saveProject({ ...project, step: newStep });
    }
  };

  return (
    <div className="fade-in">
      {/* Step indicators */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <div className="wizard-steps" role="tablist" aria-label="Pitch-Erstellungsschritte" style={{ marginBottom: 0 }}>
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              role="tab"
              aria-selected={i === step}
              disabled={i > step}
              className={`wizard-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
              onClick={() => {
                if (i <= step && i !== step) {
                  setStep(i);
                  saveProject({ ...project, step: i });
                }
              }}
            >
              <span className="step-num">
                {i < step ? <Icon name="check" size={12} /> : i + 1}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
        {/* PDF button */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPdfOpen(true)}
            title="PDF Export"
          >
            <Icon name="download" size={12} /> PDF
          </button>
        </div>
      </div>

      {/* Step content */}
      {step === 0 && (
        <CompanyStep
          data={project.company}
          onChange={(d) => update("company", d)}
          consultant={project.consultant}
          onConsultantChange={(c) => updateFull("consultant", c)}
          theme={project.theme}
          onThemeChange={(t) => updateFull("theme", t)}
        />
      )}
      {step === 1 && <EnergyStep data={project.energy} onChange={(d) => update("energy", d)} />}
      {step === 2 && (
        <PhaseStep
          project={project}
          phases={project.phases}
          phaseConfig={project.phaseConfig}
          finance={project.finance}
          onPhasesChange={(p) => updateFull("phases", p)}
          onConfigChange={(c) => updateFull("phaseConfig", c)}
          onFinanceChange={(f) => update("finance", f)}
        />
      )}
      {step === 3 && (
        <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Lade Marktanalyse...</div>}>
          <MarketAnalysis
            project={project}
            inline
            onResults={(results) => updateFull("market", results)}
          />
        </Suspense>
      )}
      {step === 4 && (
        <GenerateStep
          project={project}
          onGenerated={(content) => {
            updateFull("generated", content);
            saveProject({ ...project, generated: content, generatedAt: Date.now() });
          }}
          onNavigate={() => navigate(`/present/${project.id}`)}
        />
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
        <button className="btn btn-secondary" onClick={goBack} disabled={step === 0}>
          <Icon name="arrowLeft" size={14} /> Zurück
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn btn-primary" onClick={goNext} disabled={!canNext()}>
            Weiter <Icon name="arrowRight" size={14} />
          </button>
        ) : (
          project.generated && (
            <button className="btn btn-success btn-lg" onClick={() => navigate(`/present/${project.id}`)}>
              <Icon name="eye" size={16} /> Präsentation öffnen
            </button>
          )
        )}
      </div>

      {/* PDF Modal */}
      <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Wird geladen…</div>}>
        {pdfOpen && <PdfExport project={project} onClose={() => setPdfOpen(false)} />}
      </Suspense>
    </div>
  );
}
