/**
 * localStorage-based project store.
 * Each project is stored as pitchpilot_project_{id}.
 */

const PREFIX = "pitchpilot_project_";

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function listProjects() {
  const projects = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) {
      try {
        projects.push(JSON.parse(localStorage.getItem(key)));
      } catch {
        /* skip corrupt */
      }
    }
  }
  return projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getProject(id) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + id));
  } catch {
    return null;
  }
}

export function saveProject(project) {
  if (!project.id) project.id = generateId();
  project.updatedAt = Date.now();
  if (!project.createdAt) project.createdAt = Date.now();
  localStorage.setItem(PREFIX + project.id, JSON.stringify(project));
  return project;
}

export function deleteProject(id) {
  localStorage.removeItem(PREFIX + id);
}

export function duplicateProject(id) {
  const orig = getProject(id);
  if (!orig) return null;
  const copy = {
    ...orig,
    id: generateId(),
    name: orig.name + " (Kopie)",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveProject(copy);
  return copy;
}

/** Create a blank project template */
export function createBlankProject() {
  return {
    id: generateId(),
    name: "",
    step: 0,

    // Step 1: Company
    company: {
      name: "",
      address: "",
      city: "",
      industry: "produktion",
      employeeCount: 500,
      description: "",
      logoUrl: "",
    },

    // Step 2: Energy Profile
    energy: {
      stromverbrauch: 10000,
      gasverbrauch: 5000,
      strompreis: 22,
      gaspreis: 7,
      peakLoad: 5000,
      existingPV: 0,
      latitude: 49.5,
      longitude: 11.5,
    },

    // Step 3: Phase Selection & Config
    phases: [
      { key: "analyse", enabled: true, label: "Analyse & Bewertung" },
      { key: "pv", enabled: true, label: "PV-Ausbau" },
      { key: "speicher", enabled: true, label: "Speicher & Steuerung" },
      { key: "waerme", enabled: true, label: "Wärmekonzept" },
      { key: "ladeinfra", enabled: true, label: "Ladeinfrastruktur" },
      { key: "bess", enabled: false, label: "Graustrom-BESS" },
    ],
    phaseConfig: {
      pv: { pvDach: 2.0, pvFassade: 0, pvCarport: 0.5, pvFreiflaeche: 0 },
      speicher: { kapazitaet: 4 },
      waerme: { wpLeistung: 2.0, pufferspeicher: 100 },
      ladeinfra: { anzahlPKW: 20, anzahlLKW: 0, kmPKW: 15000, kmLKW: 60000, dieselpreis: 1.55 },
      bess: { kapazitaet: 50 },
    },

    // Step 4: Generation
    finance: {
      ekAnteil: 30,
      kreditZins: 4.5,
      kreditLaufzeit: 15,
      tilgungsfrei: 2,
    },

    // Market analysis results (filled when Marktanalyse step is visited)
    market: {},

    // Generated content (filled by Claude API or manually)
    generated: null,

    createdAt: null,
    updatedAt: null,
  };
}

/** Seed demo projects if not already present */
export function seedDemoProjects() {
  // Lazy import to avoid circular deps
  import("./demoProjects.js").then(({ DEMO_PROJECTS }) => {
    for (const demo of DEMO_PROJECTS) {
      if (!getProject(demo.id)) {
        localStorage.setItem(PREFIX + demo.id, JSON.stringify(demo));
      }
    }
  });
}

/** API key management — sessionStorage only */
export function getApiKey() {
  return sessionStorage.getItem("pitchpilot_anthropic_key") || "";
}

export function setApiKey(key) {
  if (key) {
    sessionStorage.setItem("pitchpilot_anthropic_key", key);
  } else {
    sessionStorage.removeItem("pitchpilot_anthropic_key");
  }
}
