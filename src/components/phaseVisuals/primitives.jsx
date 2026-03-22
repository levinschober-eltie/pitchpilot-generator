/**
 * PhaseVisuals — Shared SVG primitives (trees, buildings, infrastructure)
 * Extracted from PhaseVisuals.jsx for maintainability.
 */
import { useTheme } from "../../ThemeContext";
import { SvgIcon } from "../Icons";

/* ── Default siteConfig data (generic, overridable per project) ── */
export const company = { signage: "UNTERNEHMEN" };
export const site = { existingPV: 2.0, existingPVLabel: "Freifläche (Bestand)" };
export const buildings = { heatSources: ["Prozess", "Trockner", "Kompress."] };
export const KPI = {
  analyse: {
    panelTitle: "STANDORT-PROFIL",
    items: [["50 ha", "Gelände"], ["500+", "Mitarbeiter"], ["110 kV", "Netzanschluss"], ["12 Mon.", "Lastprofil"], ["5 Cluster", "Dachgutachten"]],
    checklist: ["Dachstatik", "Leitungen", "Lastprofil", "Netzanschl.", "Thermogr."],
  },
  pv: {
    panelTitle: "NEUE PV-ANLAGEN",
    arrays: [
      { icon: "sun", label: "Dach-PV", power: "2,5–5,0 MWp", detail: "Cluster A–E" },
      { icon: "building", label: "Fassade", power: "0,5–1,0 MWp", detail: "Süd + West" },
      { icon: "parking", label: "Carports", power: "1,5–3,0 MWp", detail: "Parkplätze" },
    ],
    totalLabel: "ERZEUGUNG GESAMT", totalPower: "6,5–11 MWp", totalYield: "5.800–9.800 MWh/a",
  },
  speicher: {
    panelTitle: "INTELLIGENTES EMS", capacity: "6,5–11 MWh · 0,5C · 3,25–5,5 MW",
    strategies: [
      { num: "1", title: "Eigenverbrauch", sub: "PV → Produktion max." },
      { num: "2", title: "Peak Shaving", sub: "Lastspitzen kappen" },
      { num: "3", title: "Spotmarkt-Handel", sub: "Günstig laden, teuer verkaufen" },
    ],
    savingsLabel: "10–15 % Einsparung/a",
  },
  waerme: {
    panelTitle: "WÄRMESYSTEM",
    items: [["5–10 MW", "WP-Kaskade"], ["COP 4–5", "Abwärme-Quelle"], ["65–80 %", "Gasreduktion"], ["Standortweit", "Wärmenetz"]],
    co2Savings: "–2.400 t", bufferSize: "500 m³", bufferTemp: "65°C",
  },
  lade: { acCount: "60+", acLabel: "Wallboxen", dcRange: "150–400 kW", dcLabel: "CCS Depot-Laden" },
  bess: {
    power: "100 MW", capacity: "200 MWh", rendite: "15–25 % p.a.", revenueRange: "+€ 5,2M – 8,7M p.a.",
    streams: [{ title: "Arbitrage", sub: "2–5 ct → Peak-Spread" }, { title: "FCR / aFRR", sub: "< 1s Regelenergie" }, { title: "Redispatch", sub: "Netzstabilität §13.2" }],
  },
  gesamt: {
    co2Total: "–3.800 t", bessLabel: "100 MW / 200 MWh", bessRevenueLabel: "+8,7M p.a.",
    systemKPIs: [{ icon: "sun", text: "6,5–11 MWp" }, { icon: "battery", text: "6,5–11 MWh" }, { icon: "fire", text: "5–10 MW WP" }, { icon: "plug", text: "70+ Lader" }, { icon: "chartUp", text: "1,4–2,5 Mio €/a" }],
  },
};

/* ── Shared SVG Defs ──────────────────────────────────────────── */
export function SharedDefs({ warm = false, cool = false }) {
  const T = useTheme();
  return (
    <defs>
      <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="glowWide" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
        <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.23  0 0 0 0 0.54  0 0 0 0 0.4  0 0 0 1 0" result="colored"/>
        <feMerge><feMergeNode in="colored" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="shadow" x="-10%" y="-5%" width="125%" height="130%">
        <feDropShadow dx="1.5" dy="2" stdDeviation="1.5" floodColor={cool ? "#0A1530" : "#000"} floodOpacity="0.35" />
      </filter>
      <filter id="shadowHard" x="-5%" y="-5%" width="115%" height="120%">
        <feDropShadow dx="2" dy="3" stdDeviation="2.5" floodColor="#000" floodOpacity="0.45" />
      </filter>
      <filter id="ao" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
      </filter>
      <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="blur2" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
      </filter>

      {/* Sky gradient */}
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={cool ? "#050E1C" : warm ? "#18182E" : T.skyTop} />
        <stop offset="40%" stopColor={cool ? "#0C1828" : warm ? "#1C1E3C" : T.skyMid} />
        <stop offset="100%" stopColor={T.navyLight} />
      </linearGradient>
      <radialGradient id="bgRadial" cx="50%" cy="35%" r="65%">
        <stop offset="0%" stopColor={warm ? "rgba(232,192,90,0.09)" : cool ? "rgba(74,142,194,0.05)" : "rgba(212,168,67,0.05)"} />
        <stop offset="70%" stopColor="rgba(0,0,0,0)" />
      </radialGradient>
      <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
        <stop offset="55%" stopColor="rgba(0,0,0,0)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.32)" />
      </radialGradient>
      {/* Sun glow scatter */}
      <radialGradient id="sunScatter" cx="88%" cy="22%" r="50%">
        <stop offset="0%" stopColor={warm ? "rgba(232,192,90,0.07)" : "rgba(212,168,67,0.04)"} />
        <stop offset="60%" stopColor="rgba(0,0,0,0)" />
      </radialGradient>
      {/* Aurora for cool phases */}
      <linearGradient id="auroraGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="rgba(74,142,194,0)" />
        <stop offset="30%" stopColor="rgba(74,142,194,0.04)" />
        <stop offset="60%" stopColor="rgba(58,138,102,0.03)" />
        <stop offset="100%" stopColor="rgba(74,142,194,0)" />
      </linearGradient>

      <linearGradient id="solarGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={T.gold} stopOpacity="0.75" />
        <stop offset="100%" stopColor={T.goldDim} stopOpacity="0.45" />
      </linearGradient>
      <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
      </linearGradient>
      <linearGradient id="heatGrad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor={T.warmOrange} stopOpacity="0.6" />
        <stop offset="100%" stopColor={T.warmOrangeLight} stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id="fogGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(27,42,74,0)" />
        <stop offset="75%" stopColor="rgba(27,42,74,0)" />
        <stop offset="100%" stopColor="rgba(27,42,74,0.55)" />
      </linearGradient>
      <linearGradient id="fogTop" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="rgba(27,42,74,0)" />
        <stop offset="80%" stopColor="rgba(27,42,74,0)" />
        <stop offset="100%" stopColor="rgba(27,42,74,0.35)" />
      </linearGradient>
      <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={T.forestDark} stopOpacity="0.65" />
        <stop offset="100%" stopColor={T.forest} stopOpacity="0.3" />
      </linearGradient>
      <linearGradient id="lampGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={T.goldLight} stopOpacity="0.3" />
        <stop offset="100%" stopColor={T.goldLight} stopOpacity="0" />
      </linearGradient>
      <linearGradient id="hazeBand1" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="rgba(100,140,200,0)" />
        <stop offset="25%" stopColor="rgba(100,140,200,0.03)" />
        <stop offset="75%" stopColor="rgba(100,140,200,0.025)" />
        <stop offset="100%" stopColor="rgba(100,140,200,0)" />
      </linearGradient>

      <marker id="arrG" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto">
        <path d="M0,0 L5,2 L0,4" fill={T.goldLight} opacity="0.5" />
      </marker>
      <marker id="arrGr" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto">
        <path d="M0,0 L5,2 L0,4" fill={T.greenLight} opacity="0.5" />
      </marker>
      <marker id="arrW" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto">
        <path d="M0,0 L5,2 L0,4" fill={T.warmOrangeLight} opacity="0.5" />
      </marker>

      {/* Noise texture */}
      <filter id="noise" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feBlend in="SourceGraphic" mode="overlay" />
      </filter>
    </defs>
  );
}

/* ── Stars with cross-flare on bright ones ───────────────────── */
export function Stars({ count = 32, cool = false }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const GA = 2.39996;
        const x = ((i * GA * 137.5) % 390) + 5;
        const y = ((i * GA * 89.3) % 68) + 4;
        const s = 0.3 + (i % 5) * 0.15;
        const bright = i % 9 === 0;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={s} fill={cool ? "#8AB4E0" : "#fff"}
              opacity={0.04 + (i % 4) * 0.025}>
              <animate attributeName="opacity"
                values={`${0.02 + (i % 3) * 0.012};${0.1 + (i % 4) * 0.03};${0.02 + (i % 3) * 0.012}`}
                dur={`${3 + (i % 7) * 0.8}s`} repeatCount="indefinite" />
            </circle>
            {bright && (
              <g opacity="0.08">
                <line x1={x - s * 3} y1={y} x2={x + s * 3} y2={y}
                  stroke={cool ? "#8AB4E0" : "#fff"} strokeWidth="0.3" strokeLinecap="round" />
                <line x1={x} y1={y - s * 3} x2={x} y2={y + s * 3}
                  stroke={cool ? "#8AB4E0" : "#fff"} strokeWidth="0.3" strokeLinecap="round" />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

/* ── Pine tree ───────────────────────────────────────────────── */
export function Pine({ x, y, h = 8, opacity: op = 0.7 }) {
  const T = useTheme();
  return (
    <g opacity={op}>
      <line x1={x} y1={y} x2={x} y2={y - h * 0.35} stroke="#3A2818" strokeWidth="1.2" opacity="0.5" />
      <path d={`M${x},${y - h * 0.75} L${x - h * 0.45},${y - h * 0.05} L${x + h * 0.45},${y - h * 0.05} Z`} fill={T.forestMid} />
      <path d={`M${x},${y - h} L${x - h * 0.32},${y - h * 0.2} L${x + h * 0.32},${y - h * 0.2} Z`} fill={T.forest} />
      <path d={`M${x},${y - h} L${x - h * 0.1},${y - h * 0.82} L${x + h * 0.1},${y - h * 0.82} Z`}
        fill="rgba(255,255,255,0.08)" />
    </g>
  );
}

/* ── Deciduous tree ──────────────────────────────────────────── */
export function DecTree({ x, y, h = 7, opacity: op = 0.5 }) {
  const T = useTheme();
  return (
    <g opacity={op}>
      <line x1={x} y1={y} x2={x} y2={y - h * 0.5} stroke="#4A3020" strokeWidth="1" opacity="0.4" />
      <ellipse cx={x} cy={y - h * 0.7} rx={h * 0.38} ry={h * 0.35} fill={T.forestMid} opacity="0.9" />
      <ellipse cx={x - h * 0.12} cy={y - h * 0.8} rx={h * 0.25} ry={h * 0.28} fill={T.forest} opacity="0.7" />
    </g>
  );
}

/* ── Bush ────────────────────────────────────────────────────── */
export function Bush({ x, y, s = 1, opacity: op = 0.35 }) {
  const T = useTheme();
  return (
    <g opacity={op}>
      <ellipse cx={x} cy={y} rx={3.5 * s} ry={2.2 * s} fill={T.forestMid} />
      <ellipse cx={x - 1.5 * s} cy={y - 0.5 * s} rx={2.5 * s} ry={1.8 * s} fill={T.forest} opacity="0.8" />
    </g>
  );
}

/* ── Street lamp with floodlight cone ───────────────────────── */
export function StreetLamp({ x, y }) {
  const T = useTheme();
  return (
    <g opacity="0.38">
      <line x1={x} y1={y} x2={x} y2={y - 10} stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
      <ellipse cx={x} cy={y - 10} rx="2.5" ry="1" fill="rgba(255,255,255,0.05)" />
      <circle cx={x} cy={y - 10} r="1.3" fill={T.goldLight} opacity="0.25">
        <animate attributeName="opacity" values="0.18;0.35;0.18" dur="4s" repeatCount="indefinite" />
      </circle>
      <path d={`M${x - 0.5},${y - 9} L${x - 5},${y} L${x + 5},${y} L${x + 0.5},${y - 9}`}
        fill="url(#lampGrad)" opacity="0.08" />
    </g>
  );
}

/* ── Forest cluster ─────────────────────────────────────────── */
export function ForestCluster({ cx, cy, count = 6, spread = 15, op = 0.65, layer = 1 }) {
  const GA = 2.39996;
  const baseOp = op * (layer === 1 ? 1 : layer === 2 ? 0.7 : layer === 3 ? 0.45 : 0.25);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const a = i * GA;
        const r = spread * (0.35 + (i / count) * 0.65);
        const tx = cx + Math.cos(a) * r;
        const ty = cy + Math.sin(a) * r * 0.55;
        const h = 5.5 + (i % 4) * 2;
        if (i % 5 === 3) return <DecTree key={i} x={tx} y={ty} h={h * 0.8} opacity={baseOp - i * 0.015} />;
        return <Pine key={i} x={tx} y={ty} h={h} opacity={baseOp - i * 0.015} />;
      })}
    </g>
  );
}

/* ── 3D Building (enhanced) ─────────────────────────────────── */
export function Bldg({ x, y, w, h, d = 6, solar = false, heat = false, op = 1,
  chimney = false, vent = false, sign = "", antenna = false, flag = false, companySign = false }) {
  const T = useTheme();
  return (
    <g opacity={op}>
      <ellipse cx={x + w / 2 + 1} cy={y + h + 1} rx={w / 2 + 3} ry="3"
        fill="rgba(0,0,0,0.15)" filter="url(#ao)" />
      {/* Downpipe on side face */}
      <line x1={x + w + d * 0.5} y1={y - d * 0.35} x2={x + w + d * 0.5} y2={y + h - d * 0.35}
        stroke="rgba(255,255,255,0.04)" strokeWidth="0.6" />
      <rect x={x - 0.5} y={y + h - 2} width={w + 1} height="2.5" rx="0.3"
        fill="rgba(255,255,255,0.04)" />
      {/* Right face */}
      <path d={`M${x + w},${y} L${x + w + d * 0.55},${y - d * 0.4} L${x + w + d * 0.55},${y + h - d * 0.4} L${x + w},${y + h} Z`}
        fill={T.navyMid} opacity="0.5" stroke="rgba(255,255,255,0.03)" strokeWidth="0.3" />
      {/* Roof */}
      <path d={`M${x},${y} L${x + d * 0.55},${y - d * 0.4} L${x + w + d * 0.55},${y - d * 0.4} L${x + w},${y} Z`}
        fill={solar ? "url(#solarGrad)" : "url(#roofGrad)"} />
      {solar && (
        <g>
          {Array.from({ length: Math.floor(w / 4) }, (_, i) => (
            <line key={`v${i}`} x1={x + 2 + i * 4} y1={y - d * 0.35} x2={x + 2 + i * 4} y2={y - 0.5}
              stroke={T.goldLight} strokeWidth="0.2" opacity="0.4" />
          ))}
          {Array.from({ length: 3 }, (_, i) => (
            <line key={`h${i}`} x1={x + 1} y1={y - d * 0.3 + i * (d * 0.3 / 3)}
              x2={x + w - 1} y2={y - d * 0.3 + i * (d * 0.3 / 3)}
              stroke={T.goldLight} strokeWidth="0.15" opacity="0.3" />
          ))}
          {/* Travelling solar glint */}
          <circle cx={x + w * 0.3} cy={y - d * 0.2} r="2" fill={T.goldLight} opacity="0">
            <animate attributeName="cx" values={`${x + 2};${x + w - 2};${x + 2}`} dur="5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.18;0.18;0" dur="5s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
      {heat && (
        <rect x={x} y={y} width={w} height={h} rx="1" fill={T.warmOrange} opacity="0.06">
          <animate attributeName="opacity" values="0.03;0.1;0.03" dur="4s" repeatCount="indefinite" />
        </rect>
      )}
      {/* Front face */}
      <rect x={x} y={y} width={w} height={h} rx="1"
        fill={T.navyLight} stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
      {/* Wall seams */}
      {w > 20 && (
        <g opacity="0.04">
          {Array.from({ length: Math.floor(w / 12) }, (_, i) => (
            <line key={i} x1={x + 6 + i * 12} y1={y} x2={x + 6 + i * 12} y2={y + h}
              stroke="#fff" strokeWidth="0.3" />
          ))}
        </g>
      )}
      {/* Windows with warm glow */}
      {w > 18 && (
        <g>
          {Array.from({ length: Math.floor((w - 4) / 7) }, (_, i) => (
            <g key={i}>
              <rect x={x + 3 + i * 7} y={y + h * 0.25} width="4" height="3.5" rx="0.4"
                fill="rgba(232,192,90,0.04)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.3" />
              <rect x={x + 3.3 + i * 7} y={y + h * 0.25 + 0.3} width="3.4" height="2.9" rx="0.3"
                fill="rgba(232,192,90,0.04)">
                <animate attributeName="opacity" values="0.6;1;0.6" dur={`${5 + i * 0.7}s`} repeatCount="indefinite" />
              </rect>
              <line x1={x + 5 + i * 7} y1={y + h * 0.25} x2={x + 5 + i * 7} y2={y + h * 0.25 + 3.5}
                stroke="rgba(255,255,255,0.04)" strokeWidth="0.2" />
            </g>
          ))}
        </g>
      )}
      {/* Roof gutter */}
      <line x1={x} y1={y} x2={x + w} y2={y} stroke="rgba(255,255,255,0.09)" strokeWidth="0.9" />
      {/* Goods receiving marking on ground */}
      {w > 35 && (
        <g opacity="0.06">
          <rect x={x + w - 12} y={y + h} width="10" height="4" fill="none"
            stroke="rgba(255,220,80,0.3)" strokeWidth="0.3" strokeDasharray="1.5,1.5" />
        </g>
      )}
      {/* HVAC unit on roof */}
      {w > 35 && !vent && (
        <g opacity="0.2">
          <rect x={x + w / 2 - 4} y={y - d * 0.4 - 3.5} width="8" height="3.5" rx="0.5"
            fill={T.navyMid} stroke="rgba(255,255,255,0.04)" strokeWidth="0.3" />
          <circle cx={x + w / 2} cy={y - d * 0.4 - 1.75} r="1" fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
        </g>
      )}
      {/* Loading dock roller door */}
      {w > 35 && (
        <g>
          <rect x={x + w - 10} y={y + h - 6} width="8" height="6" rx="0.5"
            fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
          {[0, 1, 2].map((j) => (
            <line key={j} x1={x + w - 9.5} y1={y + h - 5 + j * 1.8} x2={x + w - 2.5} y2={y + h - 5 + j * 1.8}
              stroke="rgba(255,255,255,0.03)" strokeWidth="0.3" />
          ))}
        </g>
      )}
      {/* Security camera */}
      {w > 30 && antenna && (
        <g opacity="0.2">
          <line x1={x + w} y1={y + 3} x2={x + w + 3} y2={y + 2} stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
          <rect x={x + w + 2} y={y + 1} width="2.5" height="1.5" rx="0.3" fill="rgba(255,255,255,0.1)" />
          {/* Security camera sweep */}
          <circle cx={x + w + 3.2} cy={y + 1.8} r="0.5" fill="rgba(255,80,80,0.2)">
            <animate attributeName="opacity" values="0.1;0.4;0.1" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
      {/* Chimney with continuous smoke trail */}
      {chimney && (
        <g>
          <rect x={x + w - 6} y={y - d * 0.4 - 9} width="3.5" height="9" rx="0.5"
            fill={T.navyMid} stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
          <rect x={x + w - 6.5} y={y - d * 0.4 - 9} width="4.5" height="1.5" rx="0.3"
            fill="rgba(255,255,255,0.07)" />
          {/* Continuous smoke trail */}
          <path d={`M${x + w - 4.25},${y - d * 0.4 - 10} Q${x + w - 2},${y - d * 0.4 - 16} ${x + w - 4},${y - d * 0.4 - 22} Q${x + w - 6},${y - d * 0.4 - 28} ${x + w - 3},${y - d * 0.4 - 34}`}
            fill="none" stroke="rgba(200,200,200,0.04)" strokeWidth="2.5" strokeLinecap="round">
            <animate attributeName="stroke-dashoffset" values="0;-40" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.06;0.02;0.06" dur="4s" repeatCount="indefinite" />
          </path>
          {[0, 1, 2].map((j) => (
            <circle key={j} cx={x + w - 4.25} cy={y - d * 0.4 - 12 - j * 4} r="1.5"
              fill="rgba(200,200,200,0.025)">
              <animate attributeName="cy"
                values={`${y - d * 0.4 - 10 - j * 3};${y - d * 0.4 - 24 - j * 3};${y - d * 0.4 - 10 - j * 3}`}
                dur={`${3.5 + j * 0.8}s`} repeatCount="indefinite" />
              <animate attributeName="r" values={`${1 + j * 0.5};${3 + j * 0.8};${1 + j * 0.5}`}
                dur={`${3.5 + j * 0.8}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.04;0.01;0.04"
                dur={`${3.5 + j * 0.8}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>
      )}
      {/* Vent unit */}
      {vent && (
        <g>
          <rect x={x + 4} y={y - d * 0.4 - 4} width="6" height="4" rx="0.5"
            fill={T.navyMid} stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
          <rect x={x + 5} y={y - d * 0.4 - 4.5} width="4" height="1" rx="0.3" fill="rgba(255,255,255,0.04)" />
        </g>
      )}
      {/* Building sign */}
      {sign && (
        <g>
          <rect x={x + 2} y={y + h * 0.55} width={sign.length * 3.5 + 4} height="5" rx="0.5"
            fill="rgba(0,0,0,0.2)" />
          <text x={x + 4} y={y + h * 0.55 + 3.8} fill="rgba(255,255,255,0.16)"
            fontSize="3.5" fontFamily="Calibri, sans-serif" fontWeight="700" letterSpacing="0.5">{sign}</text>
        </g>
      )}
      {/* Company signage on main building */}
      {companySign && (
        <g>
          <rect x={x + 4} y={y + h * 0.3} width={32} height="7" rx="1" fill="rgba(212,168,67,0.06)" />
          <text x={x + 5} y={y + h * 0.3 + 5.2} fill="rgba(212,168,67,0.22)"
            fontSize="5" fontFamily="Calibri, sans-serif" fontWeight="700" letterSpacing="1.5">{company.signage}</text>
        </g>
      )}
      {/* Antenna with blink */}
      {antenna && (
        <g>
          <line x1={x + w - 2} y1={y - d * 0.4} x2={x + w - 2} y2={y - d * 0.4 - 12}
            stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          <circle cx={x + w - 2} cy={y - d * 0.4 - 12} r="1" fill="rgba(255,100,100,0.3)">
            <animate attributeName="opacity" values="0.15;0.5;0.15" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
      {/* Flag */}
      {flag && (
        <g>
          <line x1={x + 2} y1={y - d * 0.4} x2={x + 2} y2={y - d * 0.4 - 14}
            stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" />
          <path d={`M${x + 2},${y - d * 0.4 - 14} L${x + 10},${y - d * 0.4 - 12} L${x + 2},${y - d * 0.4 - 10}`}
            fill={T.gold} opacity="0.22">
            <animate attributeName="d"
              values={`M${x+2},${y-d*0.4-14} L${x+10},${y-d*0.4-12} L${x+2},${y-d*0.4-10};M${x+2},${y-d*0.4-14} L${x+9},${y-d*0.4-12.5} L${x+2},${y-d*0.4-10};M${x+2},${y-d*0.4-14} L${x+10},${y-d*0.4-12} L${x+2},${y-d*0.4-10}`}
              dur="3s" repeatCount="indefinite" />
          </path>
        </g>
      )}
    </g>
  );
}

/* ── Water tower ────────────────────────────────────────────── */
export function WaterTower({ x, y }) {
  const T = useTheme();
  return (
    <g opacity="0.22">
      {/* Stilts */}
      {[[-4,0],[0,0],[4,0]].map(([dx],i) => (
        <line key={i} x1={x+dx} y1={y-2} x2={x+dx} y2={y+10}
          stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
      ))}
      <line x1={x-4} y1={y+4} x2={x+4} y2={y+4} stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />
      {/* Tank */}
      <ellipse cx={x} cy={y-4} rx="6" ry="2" fill={T.navyMid} stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
      <rect x={x-6} y={y-10} width="12" height="7" fill={T.navyMid} stroke="rgba(255,255,255,0.07)" strokeWidth="0.4" />
      <ellipse cx={x} cy={y-10} rx="6" ry="2" fill={T.navyLight} stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
    </g>
  );
}

/* ── Electric substation box ─────────────────────────────────── */
export function SubStation({ x, y }) {
  const T = useTheme();
  return (
    <g opacity="0.3">
      <rect x={x} y={y} width="8" height="6" rx="0.8" fill={T.navy}
        stroke="rgba(255,220,80,0.2)" strokeWidth="0.4" />
      <line x1={x+2} y1={y} x2={x+2} y2={y-3} stroke="rgba(255,220,80,0.15)" strokeWidth="0.5" />
      <line x1={x+4} y1={y} x2={x+4} y2={y-3} stroke="rgba(255,220,80,0.15)" strokeWidth="0.5" />
      <line x1={x+6} y1={y} x2={x+6} y2={y-3} stroke="rgba(255,220,80,0.15)" strokeWidth="0.5" />
      <SvgIcon name="bolt" x={x+4} y={y+2.5} size={3} color="rgba(255,220,80,0.2)" />
    </g>
  );
}

/* ── Guard booth with warm light ─────────────────────────────── */
export function GuardBooth({ x, y }) {
  const T = useTheme();
  return (
    <g opacity="0.5">
      <rect x={x} y={y} width="8" height="8" rx="1" fill={T.navyMid}
        stroke="rgba(255,255,255,0.07)" strokeWidth="0.4" />
      <rect x={x+1} y={y+1} width="3" height="2.5" rx="0.4" fill="rgba(232,192,90,0.08)">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="3.5s" repeatCount="indefinite" />
      </rect>
      {/* Warm glow */}
      <circle cx={x+2.5} cy={y+2.2} r="3" fill={T.goldLight} opacity="0.04">
        <animate attributeName="opacity" values="0.02;0.06;0.02" dur="3.5s" repeatCount="indefinite" />
      </circle>
      <rect x={x} y={y} width="8" height="2" rx="1" fill="rgba(255,255,255,0.04)" />
    </g>
  );
}

/* ── Car / Truck ────────────────────────────────────────────── */
export function Car({ x, y, color = "rgba(255,255,255,0.1)", s = 1, suv = false }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x="0" y={suv ? 1.5 : 2.5} width="12" height={suv ? 6 : 5} rx="1.5" fill={color} />
      <rect x={suv ? 1 : 1.5} y="0" width={suv ? 10 : 9} height={suv ? 5.5 : 4.5}
        rx={suv ? 1.5 : 2} fill={color} opacity="0.8" />
      <circle cx="3" cy={suv ? 8.5 : 8} r="1.3" fill="rgba(0,0,0,0.35)" />
      <circle cx="9" cy={suv ? 8.5 : 8} r="1.3" fill="rgba(0,0,0,0.35)" />
      <rect x="2.5" y="0.5" width="3.5" height="2.5" rx="0.8" fill="rgba(120,180,255,0.1)" />
      {suv && <rect x="7" y="0.5" width="3.5" height="2.5" rx="0.8" fill="rgba(120,180,255,0.08)" />}
      <rect x="0" y={suv ? 2 : 3} width="0.8" height="1.5" rx="0.3" fill="rgba(255,240,200,0.09)" />
      <rect x="11.2" y={suv ? 2 : 3} width="0.8" height="1.2" rx="0.3" fill="rgba(255,60,60,0.07)" />
    </g>
  );
}

export function Truck({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x="0" y="0" width="24" height="8" rx="1" fill="rgba(255,255,255,0.07)"
        stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
      {[4, 9, 14, 19].map((xi) => (
        <line key={xi} x1={xi} y1="0.5" x2={xi} y2="7.5"
          stroke="rgba(255,255,255,0.03)" strokeWidth="0.3" />
      ))}
      <rect x="-7" y="1" width="8" height="7" rx="1.5" fill="rgba(255,255,255,0.1)" />
      <rect x="-6" y="1.5" width="4" height="3.5" rx="0.8" fill="rgba(120,180,255,0.1)" />
      <circle cx="-3" cy="9.5" r="1.8" fill="rgba(0,0,0,0.3)" />
      <circle cx="7" cy="9.5" r="1.8" fill="rgba(0,0,0,0.3)" />
      <circle cx="18" cy="9.5" r="1.8" fill="rgba(0,0,0,0.3)" />
      <rect x="-7" y="5" width="0.8" height="1.5" rx="0.3" fill="rgba(255,240,200,0.07)" />
    </g>
  );
}
