/**
 * Demo projects for PitchPilot Generator.
 * Pre-configured projects that showcase the platform's capabilities.
 * Based on the Eckart Werke reference implementation (siteConfig.js).
 */

/** Eckart Werke — Full reference implementation */
export const ECKART_PROJECT = {
  id: "demo_eckart",
  name: "Eckart Werke — Energietransformation",
  step: 4,

  company: {
    name: "Eckart Werke",
    address: "Güntersthal 4",
    city: "91235 Hartenstein",
    industry: "produktion",
    employeeCount: 800,
    description: "ECKART GmbH (ALTANA AG) — Metalleffektpigmente & Aluminiumverarbeitung. Standort Hartenstein, Oberfranken. 50 Hektar Gelände, 110-kV-Netzanschluss, bestehende 2 MWp Freiflächen-PV.",
    logoUrl: "",
  },

  consultant: {
    company: "Elite PV GmbH",
    name: "Levin Schober",
    email: "levinschober@elite-pv.de",
    label: "Energiewirtschaftliche Konzeptbegleitung",
  },

  energy: {
    stromverbrauch: 20000,
    gasverbrauch: 10000,
    strompreis: 22,
    gaspreis: 7,
    peakLoad: 5000,
    existingPV: 2.0,
    latitude: 49.63,
    longitude: 11.52,
  },

  phases: [
    { key: "analyse", enabled: true, label: "Analyse & Bewertung" },
    { key: "pv", enabled: true, label: "Gebäudehülle & PV" },
    { key: "speicher", enabled: true, label: "Speicher & Steuerung" },
    { key: "waerme", enabled: true, label: "Wärmekonzept" },
    { key: "ladeinfra", enabled: true, label: "Ladeinfrastruktur" },
    { key: "bess", enabled: true, label: "Graustrom-BESS" },
  ],

  phaseConfig: {
    pv: { pvDach: 3.5, pvFassade: 0.7, pvCarport: 2.0, pvFreiflaeche: 0 },
    speicher: { kapazitaet: 8 },
    waerme: { wpLeistung: 7.5, pufferspeicher: 350 },
    ladeinfra: { anzahlPKW: 60, anzahlLKW: 6, kmPKW: 15000, kmLKW: 60000, dieselpreis: 1.55 },
    bess: { kapazitaet: 200 },
  },

  finance: {
    ekAnteil: 30,
    kreditZins: 4.5,
    kreditLaufzeit: 15,
    tilgungsfrei: 2,
  },

  market: {},

  generated: {
    intro: {
      headline: "Eckart Werke — Energietransformation",
      subtitle: "Phasenkonzept zur ganzheitlichen Energietransformation",
      tagline: "Integriertes Energiesystem · Hartenstein, Oberfranken",
    },
    phases: [
      /* ── Phase I: Analyse ── */
      {
        num: "I", title: "Analyse & Bewertung", subtitle: "Das Fundament", months: "Monat 1–3",
        color: "gold", icon: "search",
        headline: "Ohne belastbare Daten keine belastbaren Entscheidungen",
        description: "Energieintensive Aluminiumverarbeitung, 800+ Mitarbeiter und bereits Freiflächen-PV in Betrieb. Die Analyse bewertet das Gesamtpotenzial: Gebäude, Prozesswärme, Lastprofile und den Hochspannungs-Netzanschluss.",
        results: [
          "Bestandsaufnahme: Freiflächen-PV dokumentiert und bewertet",
          "Drohnen- & Laservermessung aller Hallen und Flächen",
          "Dachgutachten mit Sanierungsplan (Cluster A–E)",
          "12-Monats-Lastprofil als Dimensionierungsgrundlage",
          "Thermische Bestandsaufnahme: Prozesswärme + Gebäudewärme",
          "Abwärmekartierung: Mühlen, Öfen, Trockner, Kompressoren",
          "Wirtschaftlichkeitsmodell auf Basis realer Daten",
        ],
        kpis: [
          { label: "Standortfläche", value: "50 Hektar" },
          { label: "Bestand PV", value: "~2 MWp" },
          { label: "Zusatz-Potenzial", value: "4,5–9,0 MWp" },
          { label: "110-kV", value: "Dokumentiert" },
        ],
        investment: [
          { label: "Standortanalyse & Gutachten", range: "50–80 T€" },
        ],
        funding: [
          { label: "BAFA Energieberatung", value: "bis 80 % Zuschuss" },
          { label: "KfW 295 (Energieeffizienz)", value: "Tilgungszuschuss" },
        ],
        investTotal: "50–80 T€",
        roi: "Entscheidungsgrundlage für alle Folgeinvestitionen",
        roiValue: "~2.000 MWh/a bereits erzeugt",
        independenceScore: 15,
        independenceLabel: "Bestand + Datenbasis",
        highlights: [
          { icon: "satellite", title: "Drohnen- & Laservermessung", text: "Gesamtes Gelände vollständig digital erfasst — Gebäude, Freiflächen, Verschattung" },
          { icon: "chart", title: "12-Monats-Lastprofil", text: "Reale Verbrauchsdaten in 15-Min-Auflösung als Grundlage für jede Dimensionierung" },
          { icon: "microscope", title: "Thermografie & Abwärme", text: "IR-Aufnahmen aller Hallen — Wärmeverluste und nutzbare Abwärmequellen identifiziert" },
          { icon: "bolt", title: "Hochspannungs-Netzanalyse", text: "Einspeise- und Bezugskapazität bewertet — Grundlage für das BESS-Ertragsmodell" },
        ],
      },
      /* ── Phase II: PV ── */
      {
        num: "II", title: "Gebäudehülle & PV", subtitle: "Das physische Fundament", months: "Monat 4–12",
        color: "green", icon: "sun",
        headline: "Belastbare Gebäude, produktive Flächen",
        description: "Dutzende Hallen bieten enormes Potenzial. Dachsanierung und PV werden als integriertes 30-Jahres-Investment umgesetzt. Drei neue Erzeugungsarten ergänzen den bestehenden Freiflächen-Park, die Mitarbeiter-Stellplätze werden zu Carport-Kraftwerken.",
        results: [
          "Dachsanierung priorisierter Cluster (A–E)",
          "Dach-PV auf allen geeigneten Hallenflächen",
          "Fassaden-PV an Süd- und Westfassaden installiert",
          "Carport-PV auf allen Mitarbeiter-Stellplätzen",
          "E-Ladeinfrastruktur an Carport-Stellplätzen",
          "Eigenverbrauchsquote bereits über 60 %",
        ],
        kpis: [
          { label: "Neu: Dach-PV", value: "2,5–5,0 MWp" },
          { label: "Neu: Fassade", value: "0,5–1,0 MWp" },
          { label: "Neu: Carport", value: "1,5–3,0 MWp" },
          { label: "Gesamt PV", value: "6,5–11,0 MWp" },
        ],
        investment: [
          { label: "Dach-PV (450–850 €/kWp)", range: "1,1–4,3 Mio €" },
          { label: "Fassaden-PV (450–850 €/kWp)", range: "225–850 T€" },
          { label: "Carport-PV (1.200 €/kWp)", range: "1,8–3,6 Mio €" },
        ],
        funding: [
          { label: "KfW 270 (Erneuerbare)", value: "Zinsverbilligung" },
          { label: "Sonder-AfA PV-Anlagen", value: "Steuerliche Abschreibung" },
          { label: "EEG-Einspeisevergütung", value: "Überschusseinspeisung" },
        ],
        investTotal: "3,1–8,8 Mio €",
        roi: "Strombezugskosten-Reduktion + Ladeinfrastruktur",
        roiValue: ">60 % Eigenverbrauch",
        independenceScore: 45,
        independenceLabel: "Erweitertes Erzeugungsportfolio",
        highlights: [
          { icon: "factory", title: "Dach-PV auf allen Hallen", text: "Alle priorisierten Cluster saniert und mit PV bestückt — das größte Potenzial am Standort" },
          { icon: "factory", title: "Fassaden-PV Süd/West", text: "Vertikale Module erzeugen auch bei flachem Sonnenstand — ideal für den Winter" },
          { icon: "plug", title: "Carport-Kraftwerke", text: "Alle Stellplätze mit Solar-Carports — Stromerzeugung und Laden kombiniert" },
          { icon: "chart", title: "Jahreszeitlich optimal", text: "Dach + Fassade + Carport ergänzen den Freiflächen-Bestand für ganzjährig hohe Erträge" },
        ],
      },
      /* ── Phase III: Speicher ── */
      {
        num: "III", title: "Speicher & Steuerung", subtitle: "Vom Erzeuger zum steuerbaren System", months: "Monat 10–18",
        color: "green", icon: "bolt",
        headline: "Der Unterschied zwischen Erzeugung und Kontrolle",
        description: "Mit wachsender Erzeugungsleistung wird Steuerbarkeit zum entscheidenden Faktor. Der Speicher wird 1:1 zur PV-Leistung ausgelegt. Zusammen mit einem standortweiten EMS entsteht ein vollständig steuerbares Energiesystem.",
        results: [
          "Standort-BESS in Betrieb — 1:1 zur PV-Leistung dimensioniert",
          "Peak Shaving aktiv — direkte Leistungspreis-Reduktion",
          "Spotmarkt-Strategie implementiert (Winter-Optimierung)",
          "EMS steuert alle Energieflüsse standortweit in Echtzeit",
          "Prognosebasierte Lade-/Entladesteuerung (PV + Last + Wetter)",
        ],
        kpis: [
          { label: "BESS-Kapazität", value: "6,5–11 MWh" },
          { label: "Entladeleistung", value: "3,25–5,5 MW" },
          { label: "Peak Shaving", value: "10–15 %" },
          { label: "Eigenverbrauch", value: ">80 %" },
        ],
        investment: [
          { label: "BESS 6,5–11 MWh (150–225 €/kWh)", range: "1,0–2,5 Mio €" },
          { label: "EMS & standortweite Integration", range: "120–250 T€" },
        ],
        funding: [
          { label: "KfW 270 (Speicher)", value: "Zinsvergünstigung" },
          { label: "Landesförderung Bayern", value: "Speicher-Zuschuss" },
        ],
        investTotal: "1,1–2,7 Mio €",
        roi: "Peak Shaving + Spotmarkt-Optimierung",
        roiValue: "10–15 % Leistungspreis-Senkung",
        independenceScore: 65,
        independenceLabel: "Steuerbarkeit erreicht",
        highlights: [
          { icon: "battery", title: "1:1 PV-Speicher", text: "Exakt auf die Erzeugungsleistung dimensioniert — maximale Ausnutzung jeder kWh" },
          { icon: "chart", title: "Peak Shaving", text: "Automatische Kappung aller Lastspitzen — messbare Leistungspreis-Reduktion ab Tag 1" },
          { icon: "bolt", title: "Spotmarkt-Handel", text: "EPEX-optimierte Lade-/Entladezyklen — zusätzliche Erlöse aus Preisvolatilität" },
          { icon: "search", title: "EMS Echtzeit", text: "Standortweites Energiemanagement mit Prognose-Algorithmus — alle Flüsse in einer Hand" },
        ],
      },
      /* ── Phase IV: Wärme ── */
      {
        num: "IV", title: "Wärmekonzept", subtitle: "Die vergessene Dimension", months: "Monat 12–24",
        color: "gold", icon: "fire",
        headline: "Wer Wärme beherrscht, beherrscht die Betriebskosten",
        description: "Die Aluminiumpigment-Produktion benötigt Prozesswärme an Dutzenden Stellen: Kugelmühlen, Atomisierung, Trocknungsanlagen — verteilt über Dutzende Hallen. Eine WP-Kaskade nutzt die erhebliche Abwärme als Quelle und senkt den Gasbezug um 65–80 %.",
        results: [
          "Großwärmepumpen-Kaskade in Betrieb",
          "Abwärmerückgewinnung an allen identifizierten Quellen",
          "Pufferspeicher für Lastausgleich installiert",
          "Wärmenetz verbindet alle Verbraucher",
          "Gasreduktion 65–80 % erreicht",
        ],
        kpis: [
          { label: "WP-Kaskade", value: "5–10 MW" },
          { label: "COP", value: "4–5 (Abwärme)" },
          { label: "Gasreduktion", value: "65–80 %" },
          { label: "CO₂-Reduktion", value: "~2.400 t/a" },
        ],
        investment: [
          { label: "WP-Kaskade (400 T€/MW)", range: "2,0–4,0 Mio €" },
          { label: "Pufferspeicher + Verteilung", range: "1,5–2,5 Mio €" },
          { label: "Wärmenetz + Dämmung", range: "800 T€–1,5 Mio €" },
        ],
        funding: [
          { label: "BEG (Bundesförderung Effiziente Gebäude)", value: "bis 40 % Zuschuss" },
          { label: "KfW 261 (Klimafreundl. Nichtwohngebäude)", value: "Tilgungszuschuss" },
        ],
        investTotal: "4,3–8,0 Mio €",
        roi: "Gaskosten-Reduktion + CO₂-Vermeidung",
        roiValue: "65–80 % weniger Gas",
        independenceScore: 80,
        independenceLabel: "Thermische Unabhängigkeit",
        highlights: [
          { icon: "fire", title: "WP-Kaskade", text: "Mehrstufige Großwärmepumpen nutzen Abwärme als Quelle — COP 4–5 ganzjährig" },
          { icon: "thermometer", title: "Abwärme-Rückgewinnung", text: "Mühlen, Öfen, Trockner — jede Abwärmequelle wird zur Energiequelle" },
          { icon: "battery", title: "Pufferspeicher", text: "Thermischer Speicher entkoppelt Erzeugung und Verbrauch — Lastspitzen ausgeglichen" },
          { icon: "bolt", title: "Standortweites Wärmenetz", text: "Alle Verbraucher über ein Netz verbunden — keine Wärmeinsel mehr" },
        ],
      },
      /* ── Phase V: Ladeinfra ── */
      {
        num: "V", title: "Ladeinfrastruktur", subtitle: "Die Elektrifizierung der Mobilität", months: "Monat 18–30",
        color: "green", icon: "plug",
        headline: "Jeder Stellplatz wird zur Tankstelle",
        description: "800 Mitarbeiter, Fuhrpark, LKW-Logistik — die Elektrifizierung der betrieblichen Mobilität schließt den Kreis. 60+ AC-Wallboxen für PKW, 4–6 DC-Schnelllader für den Fuhrpark und 4–6 HPC-Lader für die LKW-Flotte.",
        results: [
          "AC-Wallboxen an allen Mitarbeiter-Stellplätzen",
          "DC-Schnelllader für den Fuhrpark installiert",
          "HPC-Ladepark für LKW-Flotte in Betrieb",
          "Lastmanagement integriert (PV-geführtes Laden)",
          "GEIG-konforme Ausstattung",
          "V2G-Ready für zukünftige bidirektionale Nutzung",
        ],
        kpis: [
          { label: "AC-Wallboxen", value: "60+ × 22 kW" },
          { label: "DC Fuhrpark", value: "4–6 × 150 kW" },
          { label: "HPC LKW", value: "4–6 × 400 kW" },
          { label: "Lastmanagement", value: "PV-geführt" },
        ],
        investment: [
          { label: "AC-Wallboxen (2.500 €/Stk)", range: "150–200 T€" },
          { label: "DC-Schnelllader", range: "300–450 T€" },
          { label: "HPC LKW-Depot", range: "800 T€–1,2 Mio €" },
          { label: "Lastmanagement + Netzanschluss", range: "350–500 T€" },
        ],
        funding: [
          { label: "THG-Quotenhandel + Landesförderung", value: "Erstattung pro Ladepunkt" },
          { label: "GEIG-Pflicht ab 2026", value: "Regulatorische Compliance" },
        ],
        investTotal: "1,6–2,4 Mio €",
        roi: "Diesel-Einsparung + Compliance",
        roiValue: "Komplette Fuhrpark-Elektrifizierung",
        independenceScore: 88,
        independenceLabel: "Mobilität elektrifiziert",
        highlights: [
          { icon: "plug", title: "AC-Ladepark", text: "22-kW-Wallboxen an allen Stellplätzen — Mitarbeiter laden während der Arbeitszeit" },
          { icon: "bolt", title: "DC-Fleet-Charger", text: "150-kW-Schnelllader für den Fuhrpark — Poolfahrzeuge in 30 Min auf 80 %" },
          { icon: "factory", title: "HPC-Depot", text: "Bis zu 400 kW pro LKW — Nachtladung für den gesamten Logistik-Betrieb" },
          { icon: "chart", title: "PV-geführtes Laden", text: "EMS priorisiert Eigenverbrauch — Laden wenn die Sonne scheint" },
        ],
      },
      /* ── Phase VI: BESS ── */
      {
        num: "VI", title: "Graustrom-BESS", subtitle: "Vom Verbraucher zum Energiehändler", months: "Monat 24–36",
        color: "green", icon: "bolt",
        headline: "Der Standort wird zum eigenständigen Ertragsmodell",
        description: "Ein 100 MW / 200 MWh Großspeicher nutzt den bestehenden 110-kV-Netzanschluss. Vier Erlösströme: Arbitrage (EPEX-Spread), FCR/aFRR (Regelenergie), Redispatch (Netzstabilität) und ab 2026 Trägheitsmarkt (Inertia Services) — zusammen 15–25 % Rendite p.a.",
        results: [
          "Graustrom-BESS (100 MW / 200 MWh) in Betrieb",
          "Vier Erlösströme aktiv: Arbitrage + FCR + Redispatch + Inertia",
          "24/7 SCADA-Monitoring und Fernsteuerung",
          "Brandschutzkonzept und Genehmigung abgeschlossen",
          "Netzanschluss erweitert und bidirektional",
        ],
        kpis: [
          { label: "Leistung", value: "100 MW" },
          { label: "Kapazität", value: "200 MWh" },
          { label: "Spread", value: "5–15 ct/kWh" },
          { label: "Rendite", value: "15–25 % p.a." },
        ],
        investment: [
          { label: "BESS-Container 200 MWh (175 T€/MWh)", range: "35–42 Mio €" },
          { label: "Netzanschluss + Trafo", range: "3,5–6,0 Mio €" },
        ],
        funding: [
          { label: "Projektfinanzierung (Non-Recourse SPV)", value: "Cashflow-besichert" },
          { label: "EU Innovation Fund", value: "Co-Finanzierung" },
        ],
        investTotal: "38–48 Mio €",
        roi: "Arbitrage + Regelenergie + Redispatch",
        roiValue: "15–25 % p.a.",
        independenceScore: 95,
        independenceLabel: "Strategisch unangreifbar",
        highlights: [
          { icon: "battery", title: "100 MW Großspeicher", text: "Einer der größten BESS-Projekte in Deutschland — Skaleneffekte senken €/kWh" },
          { icon: "chart", title: "Vier Erlösströme", text: "Arbitrage, FCR, Redispatch und Inertia — diversifizierte Einnahmen reduzieren das Marktrisiko" },
          { icon: "bolt", title: "110-kV-Netzanschluss", text: "Bestehende Infrastruktur nutzen — kein teurer Netzausbau nötig" },
          { icon: "factory", title: "SCADA 24/7", text: "Vollautomatisches Monitoring mit Remote-Steuerung — minimale Betriebskosten" },
        ],
      },
    ],
    finalSummary: {
      headline: "Vom Energieverbraucher zur Energieplattform",
      heroCards: [
        {
          icon: "leaf", accent: "green",
          label: "CO₂-Einsparung pro Jahr",
          value: "~3.800 t",
          details: [
            { label: "Strom (PV statt Netz)", value: "–1.600 t" },
            { label: "Wärme (WP statt Gas)", value: "–1.700 t" },
            { label: "Mobilität (E statt Diesel)", value: "–470 t" },
          ],
        },
        {
          icon: "money", accent: "gold",
          label: "Jährlicher Gesamtertrag",
          value: "6,6–11,2 Mio €",
          details: [
            { label: "Standort-Einsparungen (I–V)", value: "1,4–2,5 Mio €/a" },
            { label: "Graustrom-BESS Erlöse (VI)", value: "5,2–8,7 Mio €/a" },
          ],
        },
      ],
      investTotal: "43–70 Mio €",
      autarkie: "50–65 %",
      amortisation: "6–9 Jahre",

      /* ── System KPIs ── */
      systemKpis: [
        { label: "GESAMTE PV-LEISTUNG", value: "6,5–11 MWp", sub: "Dach + Fassade + Carport + Bestand" },
        { label: "STANDORT-SPEICHER", value: "6,5–11 MWh", sub: "Peak Shaving + Eigenverbrauch" },
        { label: "WÄRMEPUMPEN-KASKADE", value: "5–10 MW", sub: "COP 4–5 · Abwärme-basiert" },
        { label: "LADEINFRASTRUKTUR", value: "70+ Ladepunkte", sub: "AC + DC + HPC" },
        { label: "GRAUSTROM-BESS", value: "100 MW / 200 MWh", sub: "Arbitrage + FCR + Redispatch" },
        { label: "CO₂-EINSPARUNG", value: "~3.800–5.000 t/a", sub: "Strom + Wärme + Mobilität" },
      ],

      /* ── Investment Roadmap ── */
      investmentSummary: [
        { phase: "I",   label: "Analyse & Bewertung",   range: "50–80 T€",        roi: "Entscheidungsgrundlage",      score: 15, maxMio: 0.08 },
        { phase: "II",  label: "Gebäudehülle & PV",     range: "3,1–8,8 Mio €",   roi: ">60 % Eigenverbrauch",        score: 45, maxMio: 8.8  },
        { phase: "III", label: "Speicher & Steuerung",   range: "1,1–2,7 Mio €",   roi: "10–15 % Peak Shaving",        score: 65, maxMio: 2.7  },
        { phase: "IV",  label: "Wärmekonzept",           range: "4,3–8,0 Mio €",   roi: "65–80 % weniger Gas",         score: 80, maxMio: 8.0  },
        { phase: "V",   label: "Ladeinfrastruktur",      range: "1,6–2,4 Mio €",   roi: "Fuhrpark-Elektrifizierung",   score: 88, maxMio: 2.4  },
        { phase: "VI",  label: "Graustrom-BESS",         range: "35–48 Mio €",     roi: "15–25 % Rendite p.a.",        score: 95, maxMio: 48   },
      ],

      /* ── Economic Summary ── */
      economicSummary: {
        savings: [
          { label: "PV-Eigenverbrauch (Stromkosten-Reduktion)", value: "800 T€–1,5 Mio €/a" },
          { label: "Einspeiseerlöse (EEG 7 ct/kWh)", value: "200–350 T€/a" },
          { label: "Peak Shaving & Spotmarkt-Optimierung", value: "100–250 T€/a" },
          { label: "Gaskosten-Reduktion (WP-Kaskade)", value: "300–500 T€/a" },
          { label: "Mobilitäts-Einsparung (PKW + LKW)", value: "80–150 T€/a" },
        ],
        totals: {
          annualSavings: "1,4–2,5 Mio €/a",
          investStandort: "8,5–22 Mio €",
          paybackStandort: "~6–9 Jahre",
          bessRevenue: "5,2–8,7 Mio €/a",
        },
        conclusion: "Das integrierte Energiesystem erreicht eine Standort-Amortisation von 6–9 Jahren bei jährlichen Einsparungen von 1,4–2,5 Mio €. Hinzu kommen 5,2–8,7 Mio €/a aus dem Graustrom-BESS — ein eigenständiges Ertragsmodell mit 15–25 % Rendite, finanzierbar als separates SPV. Zusammen entsteht eine Energieplattform, die Eckart langfristig strategisch unangreifbar macht.",
      },

      /* ── Strategic Levers ── */
      levers: [
        { icon: "sun",     title: "PV-Eigenverbrauch",       desc: "6,5–11 MWp Erzeugung senken den Strombezug um bis zu 50 % — direkte Kostenreduktion ab Tag 1" },
        { icon: "battery", title: "Speicher & Peak Shaving",  desc: "Standort-BESS kappt Lastspitzen und optimiert den Eigenverbrauch — 10–15 % Leistungspreis-Senkung" },
        { icon: "fire",    title: "Wärme-Elektrifizierung",   desc: "WP-Kaskade mit COP 4–5 ersetzt 65–80 % des Gasbezugs — größter CO₂-Hebel am Standort" },
        { icon: "plug",    title: "E-Mobilität",              desc: "70+ Ladepunkte elektrifizieren Fuhrpark und Mitarbeiter-PKW — Dieselkosten entfallen vollständig" },
        { icon: "bolt",    title: "BESS-Arbitrage",           desc: "100 MW / 200 MWh am 110-kV-Anschluss — vier Erlösströme inkl. Trägheitsmarkt 2026, 15–25 % Rendite p.a." },
        { icon: "chart",   title: "EMS-Integration",          desc: "Standortweites Energiemanagement steuert alle Flüsse in Echtzeit — maximale Systemeffizienz" },
      ],

      /* ── Regulatorik ── */
      regulatorik: [
        { icon: "leaf",     title: "CSRD / ESG-Reporting",     desc: "Omnibus I (März 2026): Schwellen auf 1.000 MA / 450 Mio € erhöht — ALTANA-Konzern weiterhin berichtspflichtig, Scope 1+2 Reduktion dokumentiert", status: "Adressiert" },
        { icon: "globe",    title: "EU-Taxonomie",             desc: "Alle Investitionen taxonomie-konform — Zugang zu Green Finance gesichert",             status: "Konform" },
        { icon: "document", title: "GEIG-Pflicht 2026",        desc: "Ladeinfrastruktur-Pflicht für Nicht-Wohngebäude vollständig erfüllt",                 status: "Erfüllt" },
        { icon: "bolt",     title: "§14a EnWG (Steuerbare Verbraucher)", desc: "Wärmepumpen und Ladeinfrastruktur netzdienlich steuerbar",                  status: "Ready" },
        { icon: "factory",  title: "ALTANA Konzernstandards",  desc: "Klimaneutralitätsziel des Konzerns am Standort Hartenstein adressiert",                status: "Aligned" },
        { icon: "bank",     title: "CO₂-Bepreisung (BEHG)",    desc: "Steigende CO₂-Kosten durch Elektrifizierung weitgehend eliminiert",                   status: "Abgesichert" },
      ],

      /* ── Risk Management ── */
      riskManagement: [
        { icon: "chartDown", title: "Strompreis-Volatilität",   desc: "Eigenverbrauchsquote >80 % reduziert Marktpreisabhängigkeit — Restrisiko durch Speicher gehedgt",  impact: "Niedrig" },
        { icon: "battery",   title: "BESS-Marktrisiko",         desc: "Vier diversifizierte Erlösströme (Arbitrage, FCR, Redispatch, Inertia) — kein Single-Point-of-Failure", impact: "Mittel" },
        { icon: "gear",      title: "Technologie-Risiko",       desc: "Ausschließlich marktreife Komponenten (LFP-Batterien, monokristalline PV, Industrie-WP)",          impact: "Niedrig" },
        { icon: "document",  title: "Regulatorisches Risiko",   desc: "EEG, BEHG, GEIG — alle aktuellen Anforderungen erfüllt, EU-Taxonomie-konform",                    impact: "Niedrig" },
        { icon: "bolt",      title: "Netzanschluss-Risiko",     desc: "Bestehender 110-kV-Anschluss — kein Netzausbau nötig, Vorabstimmung mit Netzbetreiber empfohlen",  impact: "Mittel" },
      ],

      /* ── Pillars ── */
      pillars: [
        { icon: "sun",     label: "Dezentrale Erzeugung",     phase: "II" },
        { icon: "battery", label: "Intelligente Speicherung",  phase: "III" },
        { icon: "fire",    label: "Wärme-Elektrifizierung",    phase: "IV" },
        { icon: "plug",    label: "Elektromobilität",           phase: "V" },
        { icon: "bolt",    label: "Energiehandel",              phase: "VI" },
        { icon: "chart",   label: "System-Steuerung",           phase: "I–VI" },
      ],
    },
  },

  createdAt: 1710806400000,
  updatedAt: Date.now(),
};

/** All demo projects */
export const DEMO_PROJECTS = [ECKART_PROJECT];
