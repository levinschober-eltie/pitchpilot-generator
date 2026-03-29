/**
 * localStorage-based project store.
 * Each project is stored as pitchpilot_project_{id}.
 */

function safeDeepClone(obj) {
  if (!obj || typeof obj !== "object") return obj;
  try {
    return structuredClone(obj);
  } catch {
    return Array.isArray(obj) ? [...obj] : { ...obj };
  }
}

function getApiToken() {
  return localStorage.getItem("pitchpilot_api_token") || "";
}

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
        projects.push(migrateProject(JSON.parse(localStorage.getItem(key))));
      } catch {
        /* skip corrupt */
      }
    }
  }
  return projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getProject(id) {
  try {
    const p = JSON.parse(localStorage.getItem(PREFIX + id));
    return p ? migrateProject(p) : null;
  } catch {
    return null;
  }
}

/** Migrate old projects to current schema */
function migrateProject(p) {
  if (!p.theme) p.theme = { preset: "eckart", customColors: null, font: null, websiteUrl: null };
  return p;
}

export function saveProject(project) {
  if (!project.id) project.id = generateId();
  project.updatedAt = Date.now();
  if (!project.createdAt) project.createdAt = Date.now();
  try {
    localStorage.setItem(PREFIX + project.id, JSON.stringify(project));
  } catch (err) {
    console.warn("[PitchPilot] localStorage.setItem fehlgeschlagen:", err?.name, err?.message);
  }
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

    // Consultant (optional)
    consultant: null,

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

    // Style / Theme
    theme: {
      preset: "eckart",
      customColors: null,
      font: null,
      websiteUrl: null,
    },

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
        try {
          localStorage.setItem(PREFIX + demo.id, JSON.stringify(demo));
        } catch (err) {
          console.warn("[PitchPilot] localStorage.setItem fehlgeschlagen (seed):", err?.name, err?.message);
        }
      }
    }
  });
}

/* ── Version Management ── */

export function createVersion(projectId, name, createdBy = "owner") {
  const project = getProject(projectId);
  if (!project) return null;
  if (!project.versions) project.versions = [];

  const version = {
    id: "v_" + generateId(),
    name: name || `Version ${project.versions.length + 1}`,
    createdAt: Date.now(),
    createdBy,
    snapshot: {
      company: { ...project.company },
      energy: { ...project.energy },
      phases: project.phases.map(p => ({ ...p })),
      phaseConfig: safeDeepClone(project.phaseConfig),
      finance: { ...project.finance },
      consultant: project.consultant ? { ...project.consultant } : null,
      generated: project.generated ? safeDeepClone(project.generated) : null,
      market: project.market ? safeDeepClone(project.market) : {},
      theme: project.theme ? { ...project.theme } : { preset: "eckart" },
    },
  };

  const updatedVersions = [...project.versions, version];
  const testProject = { ...project, versions: updatedVersions };
  try {
    localStorage.setItem(PREFIX + testProject.id, JSON.stringify(testProject));
  } catch (err) {
    console.warn("[PitchPilot] Version konnte nicht gespeichert werden:", err?.message);
    return null;
  }
  project.versions = updatedVersions;
  project.updatedAt = Date.now();
  return version;
}

export function renameVersion(projectId, versionId, newName) {
  const project = getProject(projectId);
  if (!project?.versions) return;
  project.versions = project.versions.map(v =>
    v.id === versionId ? { ...v, name: newName } : v
  );
  saveProject(project);
}

export function deleteVersion(projectId, versionId) {
  const project = getProject(projectId);
  if (!project?.versions) return;
  project.versions = project.versions.filter(v => v.id !== versionId);
  saveProject(project);
}

export function restoreVersion(projectId, versionId) {
  const project = getProject(projectId);
  if (!project?.versions) return;
  const v = project.versions.find(v => v.id === versionId);
  if (!v) return;
  Object.assign(project, {
    company: v.snapshot.company,
    energy: v.snapshot.energy,
    phases: v.snapshot.phases,
    phaseConfig: v.snapshot.phaseConfig,
    finance: v.snapshot.finance,
    consultant: v.snapshot.consultant,
    generated: v.snapshot.generated,
    market: v.snapshot.market || {},
    theme: v.snapshot.theme || { preset: "eckart" },
  });
  saveProject(project);
  return project;
}

/* ── Share Link Encoding (lz-string compressed URL) ── */

const SHORT_KEYS = {
  stromverbrauch: "s", gasverbrauch: "g", strompreis: "sp", gaspreis: "gp",
  peakLoad: "pl", existingPV: "epv", latitude: "lat", longitude: "lon",
  pvDach: "d", pvFassade: "f", pvCarport: "c", pvFreiflaeche: "fr",
  kapazitaet: "k", wpLeistung: "wp", pufferspeicher: "ps",
  anzahlPKW: "pk", anzahlLKW: "lk", kmPKW: "kp", kmLKW: "kl", dieselpreis: "dp",
  ekAnteil: "ek", kreditZins: "z", kreditLaufzeit: "l", tilgungsfrei: "tf",
};

const LONG_KEYS = Object.fromEntries(Object.entries(SHORT_KEYS).map(([k, v]) => [v, k]));

function shortenObj(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(shortenObj);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[SHORT_KEYS[k] || k] = typeof v === "object" ? shortenObj(v) : v;
  }
  return out;
}

function expandObj(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(expandObj);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[LONG_KEYS[k] || k] = typeof v === "object" ? expandObj(v) : v;
  }
  return out;
}

export async function encodeSharePayload(project, versionId) {
  const { compressToEncodedURIComponent } = await import("lz-string");
  const src = versionId
    ? project.versions?.find(v => v.id === versionId)?.snapshot
    : project;
  if (!src) return null;

  const payload = {
    v: 1,
    pid: project.id,
    n: src.company?.name || "",
    c: src.company?.city || "",
    ind: src.company?.industry || "",
    e: shortenObj(src.energy),
    p: (src.phases || []).map(p => p.enabled ? 1 : 0),
    pc: shortenObj(src.phaseConfig),
    f: shortenObj(src.finance),
    cn: src.consultant,
    vid: versionId || null,
    th: src.theme?.preset || "eckart",
    thc: src.theme?.customColors || null,
  };

  const compressed = compressToEncodedURIComponent(JSON.stringify(payload));
  const base = window.location.href.split("#")[0];
  return `${base}#/shared?d=${compressed}`;
}

export async function decodeSharePayload(encoded) {
  const { decompressFromEncodedURIComponent } = await import("lz-string");
  const json = decompressFromEncodedURIComponent(encoded);
  if (!json || json.trim().length === 0) return null;

  try {
    const payload = JSON.parse(json);
    if (payload.v !== 1) return null;

    const phases = [
      { key: "analyse", enabled: !!payload.p?.[0], label: "Analyse & Bewertung" },
      { key: "pv", enabled: !!payload.p?.[1], label: "PV-Ausbau" },
      { key: "speicher", enabled: !!payload.p?.[2], label: "Speicher & Steuerung" },
      { key: "waerme", enabled: !!payload.p?.[3], label: "Wärmekonzept" },
      { key: "ladeinfra", enabled: !!payload.p?.[4], label: "Ladeinfrastruktur" },
      { key: "bess", enabled: !!payload.p?.[5], label: "Graustrom-BESS" },
    ];

    return {
      id: "shared_" + generateId(),
      sourceProjectId: payload.pid,
      sourceVersionId: payload.vid,
      company: { name: payload.n, city: payload.c, industry: payload.ind, address: "", employeeCount: 500, description: "", logoUrl: "" },
      energy: expandObj(payload.e),
      phases,
      phaseConfig: expandObj(payload.pc),
      finance: expandObj(payload.f),
      consultant: payload.cn,
      generated: null,
      market: {},
      theme: payload.th ? { preset: payload.th, customColors: payload.thc || null } : { preset: "eckart" },
    };
  } catch (err) {
    console.warn("[PitchPilot] Failed to parse share payload:", err?.message);
    return null;
  }
}

/** Save a customer calculation as a version on the source project (if it exists locally) */
export function saveCustomerVersion(sourceProjectId, modifiedProject, calcNum) {
  const project = getProject(sourceProjectId);
  if (!project) return null;
  if (!project.versions) project.versions = [];

  const name = `${modifiedProject.company?.name || "Projekt"} Kundenkalkulation ${calcNum}`;
  const version = {
    id: "v_" + generateId(),
    name,
    createdAt: Date.now(),
    createdBy: "customer",
    snapshot: {
      company: { ...modifiedProject.company },
      energy: { ...modifiedProject.energy },
      phases: modifiedProject.phases.map(p => ({ ...p })),
      phaseConfig: safeDeepClone(modifiedProject.phaseConfig),
      finance: { ...modifiedProject.finance },
      consultant: modifiedProject.consultant,
      generated: modifiedProject.generated ? safeDeepClone(modifiedProject.generated) : null,
      market: modifiedProject.market ? safeDeepClone(modifiedProject.market) : {},
      theme: modifiedProject.theme ? { ...modifiedProject.theme } : { preset: "eckart" },
    },
  };

  project.versions.push(version);
  saveProject(project);
  return version;
}

/* ── Named Share Links (server-side via Vercel KV) ── */

const API_BASE = import.meta.env.DEV ? "" : "";

/**
 * Create a named share link via the API.
 * Falls back to the old client-side lz-string link if the API is unavailable.
 */
export async function createNamedShareLink(project, versionId) {
  const { compressToEncodedURIComponent } = await import("lz-string");
  const src = versionId
    ? project.versions?.find(v => v.id === versionId)?.snapshot
    : project;
  if (!src) return null;

  const payload = {
    v: 1,
    pid: project.id,
    n: src.company?.name || "",
    c: src.company?.city || "",
    ind: src.company?.industry || "",
    e: shortenObj(src.energy),
    p: (src.phases || []).map(p => p.enabled ? 1 : 0),
    pc: shortenObj(src.phaseConfig),
    f: shortenObj(src.finance),
    cn: src.consultant,
    vid: versionId || null,
    th: src.theme?.preset || "eckart",
    thc: src.theme?.customColors || null,
  };

  const compressed = compressToEncodedURIComponent(JSON.stringify(payload));

  try {
    const resp = await fetch(`${API_BASE}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: compressed,
        companyName: src.company?.name || "pitch",
        projectId: project.id,
      }),
    });

    if (resp.ok) {
      const { slug, url } = await resp.json();
      const base = window.location.origin;
      return { type: "named", slug, url: `${base}/p/${slug}`, compressed };
    }
  } catch {
    // API unavailable — fall through to client-side link
  }

  // Fallback: client-side lz-string link
  const base = window.location.href.split("#")[0];
  return { type: "hash", slug: null, url: `${base}#/shared?d=${compressed}`, compressed };
}

/**
 * Load a shared pitch by slug from the API.
 * Returns the decoded project data or null.
 */
export async function loadNamedShare(slug) {
  try {
    const resp = await fetch(`${API_BASE}/api/p/${encodeURIComponent(slug)}`);
    if (!resp.ok) return null;
    const { payload } = await resp.json();
    if (!payload) return null;

    const { decompressFromEncodedURIComponent } = await import("lz-string");
    const json = decompressFromEncodedURIComponent(payload);
    if (!json || json.trim().length === 0) return null;

    let data;
    try {
      data = JSON.parse(json);
    } catch (err) {
      console.warn("[PitchPilot] Failed to parse named share payload:", err?.message);
      return null;
    }
    return decodePayloadObj(data);
  } catch {
    return null;
  }
}

/**
 * Fetch analytics for a project's share links.
 */
export async function fetchShareStats(projectId) {
  try {
    const resp = await fetch(`${API_BASE}/api/stats/${encodeURIComponent(projectId)}`, {
      headers: {
        "Authorization": `Bearer ${getApiToken()}`,
      },
    });
    if (!resp.ok) return { shares: [] };
    return resp.json();
  } catch {
    return { shares: [] };
  }
}

/** Decode the inner payload object (shared between hash and named links) */
function decodePayloadObj(payload) {
  if (payload.v !== 1) return null;
  const phases = [
    { key: "analyse", enabled: !!payload.p?.[0], label: "Analyse & Bewertung" },
    { key: "pv", enabled: !!payload.p?.[1], label: "PV-Ausbau" },
    { key: "speicher", enabled: !!payload.p?.[2], label: "Speicher & Steuerung" },
    { key: "waerme", enabled: !!payload.p?.[3], label: "Wärmekonzept" },
    { key: "ladeinfra", enabled: !!payload.p?.[4], label: "Ladeinfrastruktur" },
    { key: "bess", enabled: !!payload.p?.[5], label: "Graustrom-BESS" },
  ];
  return {
    id: "shared_" + generateId(),
    sourceProjectId: payload.pid,
    sourceVersionId: payload.vid,
    company: { name: payload.n, city: payload.c, industry: payload.ind, address: "", employeeCount: 500, description: "", logoUrl: "" },
    energy: expandObj(payload.e),
    phases,
    phaseConfig: expandObj(payload.pc),
    finance: expandObj(payload.f),
    consultant: payload.cn,
    generated: null,
    market: {},
    theme: payload.th ? { preset: payload.th, customColors: payload.thc || null } : { preset: "eckart" },
  };
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
