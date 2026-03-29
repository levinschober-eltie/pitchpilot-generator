/**
 * Shared slider configuration for all presentation views.
 * Used by PresentationRenderer (owner) and SharedPresentation (customer).
 *
 * Each group defines a section title, icon, and an array of sliders.
 * Slider paths map to the project data structure (e.g. ["energy", "stromverbrauch"]).
 */
export const CONFIG_GROUPS = [
  { title: "ENERGIEPROFIL", icon: "bolt", sliders: [
    { path: ["energy", "stromverbrauch"], label: "Stromverbrauch", unit: "MWh/a", min: 500, max: 100000, step: 500 },
    { path: ["energy", "gasverbrauch"], label: "Gasverbrauch", unit: "MWh/a", min: 0, max: 50000, step: 500 },
    { path: ["energy", "strompreis"], label: "Strompreis", unit: "ct/kWh", min: 8, max: 40, step: 0.5, dec: 1 },
    { path: ["energy", "gaspreis"], label: "Gaspreis", unit: "ct/kWh", min: 2, max: 18, step: 0.5, dec: 1 },
  ]},
  { title: "PV-AUSBAU", icon: "sun", sliders: [
    { path: ["phaseConfig", "pv", "pvDach"], label: "PV Dach", unit: "MWp", min: 0, max: 20, step: 0.1, dec: 1 },
    { path: ["phaseConfig", "pv", "pvFassade"], label: "PV Fassade", unit: "MWp", min: 0, max: 5, step: 0.1, dec: 1 },
    { path: ["phaseConfig", "pv", "pvCarport"], label: "PV Carport", unit: "MWp", min: 0, max: 10, step: 0.1, dec: 1 },
    { path: ["phaseConfig", "pv", "pvFreiflaeche"], label: "PV Freifl\u00E4che", unit: "MWp", min: 0, max: 20, step: 0.1, dec: 1 },
  ]},
  { title: "SPEICHER", icon: "battery", sliders: [
    { path: ["phaseConfig", "speicher", "kapazitaet"], label: "Standort-BESS", unit: "MWh", min: 0, max: 50, step: 0.5, dec: 1 },
  ]},
  { title: "W\u00C4RME", icon: "fire", sliders: [
    { path: ["phaseConfig", "waerme", "wpLeistung"], label: "WP-Leistung", unit: "MW", min: 0, max: 20, step: 0.5, dec: 1 },
    { path: ["phaseConfig", "waerme", "pufferspeicher"], label: "Pufferspeicher", unit: "m\u00B3", min: 0, max: 1000, step: 50 },
  ]},
  { title: "MOBILIT\u00C4T", icon: "car", sliders: [
    { path: ["phaseConfig", "ladeinfra", "anzahlPKW"], label: "PKW Ladepunkte", unit: "Stk", min: 0, max: 200, step: 5 },
    { path: ["phaseConfig", "ladeinfra", "anzahlLKW"], label: "LKW Ladepunkte", unit: "Stk", min: 0, max: 30, step: 1 },
    { path: ["phaseConfig", "ladeinfra", "dieselpreis"], label: "Dieselpreis", unit: "\u20AC/l", min: 1.0, max: 2.5, step: 0.05, dec: 2 },
  ]},
  { title: "GRAUSTROM-BESS", icon: "grid", sliders: [
    { path: ["phaseConfig", "bess", "kapazitaet"], label: "BESS Kapazit\u00E4t", unit: "MWh", min: 0, max: 500, step: 10 },
  ]},
  { title: "FINANZIERUNG", icon: "bank", sliders: [
    { path: ["finance", "ekAnteil"], label: "Eigenkapitalanteil", unit: "%", min: 10, max: 100, step: 5 },
    { path: ["finance", "kreditZins"], label: "Kreditzins", unit: "% p.a.", min: 2, max: 8, step: 0.1, dec: 1 },
    { path: ["finance", "kreditLaufzeit"], label: "Kreditlaufzeit", unit: "Jahre", min: 5, max: 25, step: 1 },
  ]},
];
