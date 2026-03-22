/**
 * PhaseVisuals — Layout components (ValleyBg, IsoGrid, SiteBase, Atmosphere)
 * Extracted from PhaseVisuals.jsx for maintainability.
 */
import { useTheme } from "../../ThemeContext";
import { Stars, Pine, DecTree, Bush, ForestCluster, Bldg, StreetLamp, GuardBooth, WaterTower, SubStation } from "./primitives";

/* ── Valley background ──────────────────────────────────────────── */
export function ValleyBg({ cool = false }) {
  const T = useTheme();
  return (
    <g>
      <rect width="400" height="320" fill="url(#skyGrad)" />
      <rect width="400" height="320" fill="url(#bgRadial)" />
      <rect width="400" height="320" fill="url(#sunScatter)" />

      <Stars count={cool ? 50 : 28} cool={cool} />

      {/* Moon with crater detail for cool phases */}
      {cool && (
        <g>
          <circle cx="52" cy="38" r="12" fill="#C8D8E8" opacity="0.05" />
          <circle cx="52" cy="38" r="7.5" fill="#D0E0F0" opacity="0.09" />
          <circle cx="49" cy="36" r="5.5" fill={T.skyTop} opacity="0.06" />
          {/* Crater details */}
          <circle cx="54" cy="41" r="1.2" fill="none" stroke="#B0C8E0" strokeWidth="0.3" opacity="0.08" />
          <circle cx="49" cy="37" r="0.8" fill="none" stroke="#B0C8E0" strokeWidth="0.25" opacity="0.07" />
          <circle cx="52" cy="34" r="0.6" fill="none" stroke="#B0C8E0" strokeWidth="0.2" opacity="0.06" />
          <circle cx="52" cy="38" r="16" fill="none" stroke="#C8D8E8" strokeWidth="0.4" opacity="0.03" />
          {/* Aurora */}
          <rect x="0" y="55" width="400" height="20" fill="url(#auroraGrad)" opacity="0.6">
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="6s" repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="translate"
              values="-20,0;20,0;-20,0" dur="12s" repeatCount="indefinite" />
          </rect>
        </g>
      )}

      {/* Atmospheric haze layers between hills */}
      <rect x="0" y="72" width="400" height="12" fill="url(#hazeBand1)" opacity="0.7" />
      <rect x="0" y="82" width="400" height="8" fill="url(#hazeBand1)" opacity="0.5" />
      <rect x="0" y="90" width="400" height="6" fill="url(#hazeBand1)" opacity="0.3" />

      {/* Far hills */}
      <path d="M-10,95 Q30,55 80,68 Q130,80 170,60 Q210,42 260,55 Q310,68 360,50 Q390,42 410,60 L410,110 L-10,110 Z"
        fill="url(#hillGrad)" opacity="0.36" />
      <path d="M-10,95 Q30,55 80,68 Q130,80 170,60 Q210,42 260,55 Q310,68 360,50 Q390,42 410,60"
        fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="0.8" />
      <path d="M-10,100 Q50,70 110,82 Q160,92 200,75 Q250,58 300,72 Q350,85 410,70 L410,120 L-10,120 Z"
        fill={T.forestDark} opacity="0.3" />

      {/* Distant village lights on hillside */}
      {[[55,78],[60,82],[65,79],[310,64],[315,68],[320,65],[362,60],[366,63]].map(([x,y],i) => (
        <circle key={`vl${i}`} cx={x} cy={y} r="0.5" fill={T.goldLight} opacity="0.06">
          <animate attributeName="opacity" values="0.04;0.1;0.04" dur={`${3+i*0.7}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Distant wind turbines */}
      {[[55, 68], [310, 56], [362, 52]].map(([x, y], i) => (
        <g key={i} opacity="0.12">
          <line x1={x} y1={y} x2={x} y2={y - 18} stroke="#fff" strokeWidth="0.5" />
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values={`0 ${x} ${y - 18};360 ${x} ${y - 18}`}
              dur={`${6 + i * 2}s`} repeatCount="indefinite" />
            {[0, 120, 240].map((a) => (
              <line key={a} x1={x} y1={y - 18}
                x2={x + Math.cos(a * Math.PI / 180) * 8}
                y2={y - 18 + Math.sin(a * Math.PI / 180) * 8}
                stroke="#fff" strokeWidth="0.4" />
            ))}
          </g>
        </g>
      ))}

      {/* Clouds with ground shadows */}
      {[[40, 35, 1], [180, 25, 0.7], [310, 40, 0.85], [120, 50, 0.5]].map(([x, y, s], i) => (
        <g key={i}>
          <g opacity={0.045 + i * 0.01}>
            <animateTransform attributeName="transform" type="translate"
              values={`0,0;${12 + i * 5},0;0,0`} dur={`${30 + i * 8}s`} repeatCount="indefinite" />
            <ellipse cx={x} cy={y} rx={22 * s} ry={5 * s} fill="#fff" />
            <ellipse cx={x - 10 * s} cy={y + 2} rx={14 * s} ry={4 * s} fill="#fff" />
            <ellipse cx={x + 12 * s} cy={y + 1} rx={16 * s} ry={3.5 * s} fill="#fff" />
          </g>
          {/* Cloud shadow on ground */}
          <ellipse cx={x + 10} cy={230 + i * 8} rx={18 * s} ry={3 * s} fill="rgba(0,0,0,0.03)" opacity="0.6">
            <animateTransform attributeName="transform" type="translate"
              values={`0,0;${12 + i * 5},0;0,0`} dur={`${30 + i * 8}s`} repeatCount="indefinite" />
          </ellipse>
        </g>
      ))}
      {/* Cirrus wisps */}
      {[[70, 18, 30], [220, 12, 25], [350, 22, 20]].map(([x, y, w], i) => (
        <path key={`c${i}`}
          d={`M${x},${y} Q${x + w * 0.3},${y - 1} ${x + w * 0.6},${y + 0.5} Q${x + w * 0.8},${y + 1} ${x + w},${y}`}
          fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.8" strokeLinecap="round">
          <animateTransform attributeName="transform" type="translate"
            values={`0,0;${6 + i * 2},0;0,0`} dur={`${25 + i * 6}s`} repeatCount="indefinite" />
        </path>
      ))}

      {/* Birds */}
      {[[85, 45], [245, 30], [340, 38]].map(([x, y], i) => (
        <path key={i} d={`M${x - 3},${y} Q${x - 1},${y - 2} ${x},${y} Q${x + 1},${y - 2} ${x + 3},${y}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.6">
          <animateTransform attributeName="transform" type="translate"
            values={`0,0;${8 + i * 3},${-2 + i};0,0`} dur={`${15 + i * 5}s`} repeatCount="indefinite" />
        </path>
      ))}
    </g>
  );
}

/* ── Isometric grid underlay ─────────────────────────────────── */
export function IsoGrid({ opacity: op = 0.02 }) {
  const T = useTheme();
  return (
    <g opacity={op}>
      {Array.from({ length: 14 }, (_, i) => (
        <line key={`d1${i}`} x1={i * 32} y1="80" x2={i * 32 - 80} y2="320"
          stroke={T.gold} strokeWidth="0.4" />
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <line key={`d2${i}`} x1={i * 32} y1="80" x2={i * 32 + 80} y2="320"
          stroke={T.gold} strokeWidth="0.4" />
      ))}
    </g>
  );
}

/* ── Enhanced SiteBase ──────────────────────────────────────── */
export function SiteBase({ children, dim = false, solar = false, heat = false }) {
  const T = useTheme();
  return (
    <g opacity={dim ? 0.3 : 1}>
      <IsoGrid opacity={dim ? 0.01 : 0.02} />

      {/* Valley floor */}
      <ellipse cx="200" cy="290" rx="230" ry="80" fill={T.forest} opacity="0.18" />
      <path d="M25,210 Q55,105 145,90 Q200,80 255,95 Q345,115 385,205 Q395,248 360,272 Q295,302 200,304 Q105,302 45,272 Q10,248 25,210Z"
        fill={T.forest} opacity="0.35" />
      <path d="M50,205 Q75,122 155,106 Q200,98 248,112 Q330,132 365,205 Q372,236 345,258 Q285,284 200,286 Q115,284 58,258 Q32,236 50,205Z"
        fill={T.forestMid} opacity="0.25" />

      {/* Ground texture */}
      {Array.from({ length: 12 }, (_, i) => {
        const rx = 100 + ((i * 27.3 + 13) % 200);
        const ry = 200 + ((i * 19.7 + 7) % 70);
        return <ellipse key={`r${i}`} cx={rx} cy={ry} rx={1.5 + i % 3} ry={0.8 + i % 2}
          fill="rgba(255,255,255,0.015)" />;
      })}

      {/* Stream/river */}
      <path d="M15,260 Q60,248 105,256 Q140,262 170,254 Q200,246 230,252 Q260,258 300,248 Q340,238 395,250"
        fill="none" stroke="rgba(100,160,255,0.08)" strokeWidth="3" strokeLinecap="round" />
      <path d="M15,260 Q60,248 105,256 Q140,262 170,254 Q200,246 230,252 Q260,258 300,248 Q340,238 395,250"
        fill="none" stroke="rgba(150,200,255,0.04)" strokeWidth="1" strokeDasharray="4,6">
        <animate attributeName="strokeDashoffset" values="0;-20" dur="4s" repeatCount="indefinite" />
      </path>
      {[[130, 258], [220, 250], [310, 244]].map(([rx, ry], i) => (
        <ellipse key={`rip${i}`} cx={rx} cy={ry} rx="0" ry="0" fill="none"
          stroke="rgba(150,200,255,0.04)" strokeWidth="0.3">
          <animate attributeName="rx" values="0;5;0" dur={`${4 + i * 1.5}s`} repeatCount="indefinite" />
          <animate attributeName="ry" values="0;1.5;0" dur={`${4 + i * 1.5}s`} repeatCount="indefinite" />
        </ellipse>
      ))}

      {/* Forest clusters */}
      <ForestCluster cx={45} cy={140} count={8} spread={18} layer={4} />
      <ForestCluster cx={360} cy={138} count={9} spread={20} layer={4} />
      <ForestCluster cx={200} cy={92} count={5} spread={12} op={0.3} layer={4} />
      <ForestCluster cx={75} cy={128} count={7} spread={16} layer={3} />
      <ForestCluster cx={330} cy={125} count={8} spread={17} layer={3} />
      <ForestCluster cx={130} cy={112} count={5} spread={12} layer={3} />
      <ForestCluster cx={275} cy={110} count={5} spread={13} layer={3} />
      <ForestCluster cx={58} cy={165} count={9} spread={20} layer={2} />
      <ForestCluster cx={348} cy={162} count={10} spread={22} layer={2} />
      <ForestCluster cx={85} cy={130} count={6} spread={15} layer={2} />
      <ForestCluster cx={318} cy={126} count={7} spread={16} layer={2} />
      <ForestCluster cx={42} cy={230} count={7} spread={16} />
      <ForestCluster cx={365} cy={234} count={6} spread={14} />

      {/* Bushes */}
      <Bush x={95} y={225} s={1.2} opacity={0.25} />
      <Bush x={310} y={228} s={1} opacity={0.2} />
      <Bush x={72} y={200} s={0.8} opacity={0.18} />
      <Bush x={335} y={198} s={0.9} opacity={0.18} />
      <Bush x={115} y={250} s={1.1} opacity={0.15} />
      <Bush x={298} y={252} s={0.9} opacity={0.15} />

      {/* Cleared inner area */}
      <path d="M88,196 Q108,140 168,128 Q200,122 235,132 Q298,150 322,196 Q332,226 312,246 Q275,268 200,270 Q128,268 92,246 Q72,226 88,196Z"
        fill={T.navyLight} opacity="0.1" />

      {/* Site fence */}
      <path d="M95,194 Q110,148 165,132 Q200,124 238,134 Q292,150 318,194 Q328,220 310,240 Q278,262 200,264 Q125,262 95,240 Q78,220 95,194"
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="3,2" />
      {[[110,155],[148,135],[200,126],[252,136],[302,162],[320,200],[310,238],[270,260],[200,264],[130,260],[100,238],[85,210]].map(
        ([px, py], i) => (
          <rect key={`fp${i}`} x={px - 0.5} y={py - 3} width="1" height="6" rx="0.2"
            fill="rgba(255,255,255,0.07)" />
        )
      )}

      {/* Roads */}
      <path d="M35,282 Q72,252 112,232 Q148,216 188,212 Q218,210 248,216 Q292,228 332,254 Q365,274 390,290"
        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" strokeLinecap="round" />
      <path d="M65,268 Q100,244 140,226 Q170,216 200,212 Q235,212 270,224 Q310,240 345,264"
        fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.6" strokeDasharray="5,5" />
      {/* Parking lot lines more visible */}
      <ellipse cx="185" cy="253" rx="4" ry="0.6" fill="rgba(255,255,255,0.04)" />
      <path d="M188,212 Q192,192 202,168"
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4.5" strokeLinecap="round" />

      {/* Gate + guard booth */}
      <g>
        <rect x="185" y="258" width="4" height="10" rx="0.5" fill="rgba(255,255,255,0.09)" />
        <rect x="212" y="258" width="4" height="10" rx="0.5" fill="rgba(255,255,255,0.09)" />
        <path d="M189,260 Q200,256 216,260" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        <GuardBooth x={217} y={256} />
      </g>

      {/* Street lamps */}
      <StreetLamp x={160} y={215} />
      <StreetLamp x={240} y={215} />
      <StreetLamp x={200} y={252} />

      {/* Floodlights on building corners */}
      <g opacity="0.06">
        <path d="M199,142 L192,160 L206,160 Z" fill={T.goldLight} />
        <path d="M258,155 L252,170 L264,170 Z" fill={T.goldLight} />
      </g>

      {/* Fire hydrants */}
      {[[168, 230], [238, 227]].map(([hx, hy], i) => (
        <g key={`fh${i}`} opacity="0.18">
          <rect x={hx} y={hy} width="1.5" height="3" rx="0.3" fill="rgba(255,80,80,0.35)" />
          <rect x={hx - 0.5} y={hy} width="2.5" height="1" rx="0.3" fill="rgba(255,80,80,0.28)" />
        </g>
      ))}

      {/* Water tower */}
      <WaterTower x={340} y={175} />

      {/* Electric substation */}
      <SubStation x={296} y={200} />

      {/* Pallets / loading dock activity */}
      <g opacity="0.12">
        <rect x="254" y="178" width="5" height="4" rx="0.3" fill="rgba(255,255,255,0.2)" />
        <rect x="260" y="179" width="4" height="3" rx="0.3" fill="rgba(255,255,255,0.15)" />
        <rect x="255" y="174" width="4" height="4" rx="0.3" fill="rgba(255,255,255,0.18)" />
      </g>

      {/* Buildings */}
      <Bldg x={144} y={150} w={52} h={26} d={7} solar={solar} heat={heat} chimney sign="HALLE A" flag />
      <Bldg x={200} y={142} w={58} h={34} d={9} solar={solar} heat={heat} vent antenna sign="PRODUKTION" companySign />
      <Bldg x={152} y={182} w={46} h={23} d={6} solar={solar} heat={heat} sign="LAGER" />
      <Bldg x={202} y={182} w={54} h={23} d={7} solar={solar} heat={heat} chimney sign="MÜHLE" />
      <Bldg x={120} y={168} w={26} h={18} d={4} solar={solar} sign="BÜRO" />
      <Bldg x={262} y={155} w={34} h={24} d={5} solar={solar} heat={heat} vent sign="TROCKNER" />
      <Bldg x={262} y={184} w={30} h={18} d={4} solar={solar} />
      <Bldg x={168} y={208} w={38} h={16} d={4} solar={solar} />
      <Bldg x={212} y={208} w={44} h={16} d={4} solar={solar} />
      <Bldg x={136} y={130} w={34} h={19} d={5} sign="VERWALTUNG" />

      {/* Flagpole (separate, taller) */}
      <g opacity="0.3">
        <line x1="137" y1="111" x2="137" y2="94" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
        <path d="M137,94 L145,96 L137,98" fill={T.gold} opacity="0.25">
          <animate attributeName="d"
            values="M137,94 L145,96 L137,98;M137,94 L144,95.5 L137,98;M137,94 L145,96 L137,98"
            dur="3.5s" repeatCount="indefinite" />
        </path>
      </g>

      {/* Conveyor belt */}
      <path d="M196,162 L202,162" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <path d="M196,164 L202,164" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

      {/* Forklift */}
      <g opacity="0.18">
        <rect x="158" y="205" width="5" height="3" rx="0.5" fill="rgba(255,220,100,0.35)" />
        <rect x="155" y="204" width="3" height="4" rx="0.3" fill="rgba(255,255,255,0.12)" />
        <circle cx="156" cy="208.5" r="0.8" fill="rgba(0,0,0,0.35)" />
        <circle cx="162" cy="208.5" r="0.8" fill="rgba(0,0,0,0.35)" />
      </g>

      {/* Parking areas */}
      <g>
        <rect x="110" y="218" width="44" height="24" rx="1.5"
          fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.4" />
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i}>
            <line x1={114 + i * 5} y1="220" x2={114 + i * 5} y2="228"
              stroke="rgba(255,255,255,0.055)" strokeWidth="0.4" />
          </g>
        ))}
        {/* Colored cars in parking */}
        <rect x="113" y="222" width="9" height="5" rx="1" fill="rgba(100,160,255,0.08)" />
        <rect x="124" y="222" width="9" height="5" rx="1" fill="rgba(255,255,255,0.05)" />
        <rect x="135" y="222" width="9" height="5" rx="1" fill="rgba(180,255,180,0.07)" />
        <rect x="146" y="222" width="9" height="5" rx="1" fill="rgba(255,200,100,0.07)" />
      </g>
      <g>
        <rect x="268" y="212" width="40" height="26" rx="1.5"
          fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.4" />
        {Array.from({ length: 7 }, (_, i) => (
          <line key={i} x1={272 + i * 5} y1="214" x2={272 + i * 5} y2="224"
            stroke="rgba(255,255,255,0.04)" strokeWidth="0.3" />
        ))}
        <rect x="271" y="215" width="9" height="5" rx="1" fill="rgba(255,200,100,0.07)" />
        <rect x="281" y="215" width="9" height="5" rx="1" fill="rgba(100,160,255,0.07)" />
      </g>

      {children}
    </g>
  );
}

/* ── Atmosphere overlay ─────────────────────────────────────── */
export function Atmosphere({ warm = false }) {
  return (
    <g>
      <rect width="400" height="320" fill="url(#fogGrad)" />
      <rect width="400" height="320" fill="url(#fogTop)" />
      <rect width="400" height="320" fill="url(#vignette)" />
      {warm && <rect width="400" height="320" fill="rgba(212,168,67,0.025)" />}
    </g>
  );
}
