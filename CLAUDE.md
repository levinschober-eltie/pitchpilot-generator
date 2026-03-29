# PitchPilot Generator

Interaktiver Konfigurator zum Erstellen von Energie-Transformations-Pitches fuer Industrieunternehmen.
Generiert vollstaendige, interaktive Praesentationen mit Live-Kalkulation, CI-Anpassung und Share-Links.

## Tech-Stack

- **Frontend:** React 19, Vite 6, React Router 7 (BrowserRouter)
- **Styling:** Vanilla CSS (index.css), inline styles, keine CSS-Bibliothek
- **API:** Claude API (Anthropic, client-side direct browser access)
- **Backend:** Vercel Serverless Functions (api/)
- **Storage:** localStorage (Projekte), sessionStorage (API-Key), Upstash Redis (Share-Links)
- **Kompression:** lz-string (Share-Payload)
- **Deployment:** Vercel (Primary), GitHub Pages (Secondary via deploy.yml)

## Ordnerstruktur

```
pitchpilot-generator/
  api/                        # Vercel Serverless Functions
    _lib/ratelimit.js         # Upstash Rate-Limiting (share, slug, stats)
    share.js                  # POST /api/share — Named Share Link erstellen
    p/[slug].js               # GET /api/p/:slug — Share laden + View tracken
    stats/[projectId].js      # GET /api/stats/:id — Link-Analytics
  src/
    main.jsx                  # Entry, BrowserRouter, HashRouter-Migration
    App.jsx                   # Routes, lazy loading, ErrorBoundary
    store.js                  # localStorage-basierter Project Store, Share-Encoding
    calcEngine.js             # Kalkulations-Engine (PV, Speicher, Waerme, Mobilitaet, BESS, Finanzierung)
    claudeApi.js              # Claude API Wrapper (fetch + streaming)
    promptTemplates.js        # System-/User-Prompts, Fallback-Template-Generierung
    colors.js                 # Farb-Paletten (B = Brand, C = Praesentation)
    themes.js                 # Theme-Presets (eckart, modern, klassisch, minimal, bold), Custom CI
    ThemeContext.jsx           # React Context fuer Praesentations-Themes
    fontLoader.js             # Google Fonts dynamisch laden
    ciAnalyzer.js             # Website-CI-Extraktion (CORS-Proxy-Kaskade)
    sliderConfig.js           # Shared Slider-Konfiguration (PresentationRenderer + SharedPresentation)
    utils.js                  # getVal, setVal, hexToRgb
    useFocusTrap.js           # Focus-Trap Hook fuer Modals
    demoProjects.js           # Eckart-Werke Demo-Projekt
    index.css                 # Globale Styles (Buttons, Cards, Forms, Responsive)
    components/
      Dashboard.jsx           # Projekt-Liste, Share, Analytics
      Wizard.jsx              # 5-Step Wizard (Company, Energy, Phases, Market, Generate)
      CompanyStep.jsx         # Firmendaten + CI-Analyse + Theme-Auswahl
      EnergyStep.jsx          # Energieprofil (Slider, CSV-Upload, Rechnungsanalyse)
      PhaseStep.jsx           # Phasen-Toggles + Konfiguration + Finanzierung
      MarketAnalysis.jsx      # Open-Meteo Wetter + energy-charts Marktdaten
      GenerateStep.jsx        # KPI-Preview + Claude AI / Template Generierung
      PresentationRenderer.jsx # Owner-Praesentation (Fullscreen, Versionen, Config-Panel)
      SharedPresentation.jsx  # Kunden-Praesentation (Share-Link, Config-Slider)
      NamedShare.jsx          # /p/:slug Loader -> redirect zu SharedPresentation
      PdfExport.jsx           # PDF-Export via browser print
      Settings.jsx            # API-Key Verwaltung
      ErrorBoundary.jsx       # React Error Boundary
      Icons.jsx               # SVG Icon System (Icon + SvgIcon)
      PhaseVisuals.jsx        # Re-export von phaseVisuals/
      phaseVisuals/           # Animierte SVG-Illustrationen pro Phase
        index.jsx             # Haupt-Export (memo'd)
        primitives.jsx        # SharedDefs, Gradient-Definitionen
        layouts.jsx           # Layout-Helfer
        phases.jsx            # Visuals pro Phase (I-VI + Gesamt)
        widgets.jsx           # SvgAutarkieRing etc.
  vercel.json                 # Rewrites, Security Headers, CSP, Cache
  vite.config.js              # Build: hidden sourcemaps, es2020, manual chunks
  index.html                  # Entry HTML (lang="de")
```

## Build-Befehle

```bash
npm run dev       # Vite Dev Server (localhost:5173)
npm run build     # Production Build
npm run preview   # Preview des Builds
npm run deploy    # Build + Vercel Deploy
```

## Konventionen

- **Sprache:** UI-Strings auf Deutsch, echte Umlaute (ae, oe, ue, ss)
- **Routing:** BrowserRouter (KEIN HashRouter) — alte #/-URLs werden in main.jsx migriert
- **State:** localStorage fuer Projekte (Prefix: pitchpilot_project_), sessionStorage fuer API-Key
- **API-Key:** Wird NIE in localStorage gespeichert, nur sessionStorage
- **Icons:** Immer ueber <Icon name="..."/> aus Icons.jsx, nie inline SVGs
- **Themes:** Praesentations-Themes via ThemeContext, Wizard/Dashboard via CSS-Variablen (colors.js B-Palette)
- **Kalkulation:** Alle Berechnungen in calcEngine.js, NIE in Komponenten
- **Lazy Loading:** Grosse Komponenten (Wizard-Steps, PdfExport, MarketAnalysis, PhaseVisuals) lazy importieren
- **Error Handling:** Immer try/catch, console.warn mit [PitchPilot] Prefix
- **Share-Links:** Named (/p/:slug via Upstash Redis) mit Fallback auf client-side lz-string
- **Security:** CSP in vercel.json, Rate-Limiting via Upstash, CORS-Whitelist, CSRF-Schutz, Input-Sanitization

## Deployment

- **Primary:** Vercel (pitchpilot-generator.vercel.app)
- **Secondary:** GitHub Pages (via .github/workflows/deploy.yml, env GITHUB_PAGES=true)
- **Env-Variablen (Vercel):** UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, PITCHPILOT_API_TOKEN (optional fuer Stats-Auth)

## Wichtig

- Nach Schema-Aenderungen in store.js: migrateProject() aktualisieren
- calcEngine.js ist ein eigener Vite-Chunk (manualChunks in vite.config.js)
- Share-Payload-Format: v1 mit Short-Keys (SHORT_KEYS/LONG_KEYS in store.js)
- PhaseVisuals sind reine SVG-Animationen, kein Canvas
