/**
 * PhaseVisuals — All 7 phase-specific visual components
 * Extracted from PhaseVisuals.jsx for maintainability.
 */
import { useTheme } from "../../ThemeContext";
import { SvgIcon } from "../Icons";
import { KPI, site, buildings, Pine, Car, Truck } from "./primitives";
import { ValleyBg, SiteBase, Atmosphere } from "./layouts";
import { Badge, PhaseBadge, FlowParticles, InfoPanel, CompassRose } from "./widgets";

/* ══════════════════════════════════════════════════════════════════
   PHASE I — ANALYSE & BEWERTUNG
   ══════════════════════════════════════════════════════════════════ */
export function AnalyseVisual() {
  const T = useTheme();
  return (
    <>
      <ValleyBg />
      <SiteBase>
        {/* Faint "BESTANDSAUFNAHME" watermark at 45° */}
        <g opacity="0.04" transform="rotate(-45 200 180)">
          <text x="100" y="190" fill={T.gold} fontSize="18" fontFamily="Calibri, sans-serif"
            fontWeight="700" letterSpacing="3">BESTANDSAUFNAHME</text>
        </g>

        {/* Laser scan grid */}
        <g>
          {Array.from({ length: 10 }, (_, i) => (
            <line key={`sv${i}`} x1={112 + i * 20} y1="118" x2={112 + i * 20} y2="255"
              stroke={T.gold} strokeWidth="0.3" opacity="0.18" strokeDasharray="1.5,4" />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <line key={`sh${i}`} x1="108" y1={124 + i * 18} x2="310" y2={124 + i * 18}
              stroke={T.gold} strokeWidth="0.3" opacity="0.18" strokeDasharray="1.5,4" />
          ))}
          {["A","B","C","D","E","F"].map((l, i) => (
            <text key={l} x={116 + i * 32} y="117" textAnchor="middle" fill={T.gold}
              fontSize="3" fontFamily="Calibri, sans-serif" opacity="0.22">{l}</text>
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <text key={`n${i}`} x="106" y={134 + i * 22} textAnchor="end" fill={T.gold}
              fontSize="3" fontFamily="Calibri, sans-serif" opacity="0.22">{i + 1}</text>
          ))}
          {/* Animated scan beam */}
          <rect x="108" y="124" width="2.5" height="130" fill={T.goldLight} opacity="0.12" rx="1">
            <animate attributeName="x" values="108;310;108" dur="6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.18;0.04;0.18" dur="6s" repeatCount="indefinite" />
          </rect>
        </g>

        {/* Thermal overlay zones on buildings */}
        {[
          [144,150,52,26,T.warmOrange,0.08],[200,142,58,34,T.gold,0.06],[262,155,34,24,T.warmOrangeLight,0.07]
        ].map(([bx,by,bw,bh,col,opa],i) => (
          <rect key={`th${i}`} x={bx} y={by} width={bw} height={bh} rx="1" fill={col} opacity={opa}>
            <animate attributeName="opacity" values={`${opa*0.6};${opa*1.4};${opa*0.6}`}
              dur={`${3+i*0.6}s`} repeatCount="indefinite" />
          </rect>
        ))}

        {/* Building ID labels */}
        {[
          [168,148,"A1"],[228,140,"A2"],[174,178,"B1"],[228,178,"B2"],
          [132,165,"C1"],[276,152,"D1"],[276,181,"D2"],
        ].map(([x,y,id],i) => (
          <g key={i}>
            <rect x={x-6} y={y-5} width="12" height="9" rx="2.5" fill={T.gold} opacity="0.13" />
            <text x={x} y={y+1.5} textAnchor="middle" fill={T.goldLight}
              fontSize="5" fontFamily="Calibri, sans-serif" fontWeight="700">{id}</text>
          </g>
        ))}

        {/* Survey tripod with hardhat person */}
        <g filter="url(#shadow)">
          <line x1="108" y1="192" x2="103" y2="208" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
          <line x1="108" y1="192" x2="113" y2="208" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
          <line x1="108" y1="192" x2="108" y2="209" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
          <circle cx="108" cy="190" r="3" fill={T.navy} stroke={T.gold} strokeWidth="0.6" />
          <circle cx="108" cy="190" r="1.5" fill={T.goldLight} opacity="0.35" />
          {/* Laser line to buildings */}
          <line x1="108" y1="190" x2="200" y2="170" stroke={T.gold} strokeWidth="0.3" opacity="0.18"
            strokeDasharray="2,3">
            <animate attributeName="opacity" values="0.1;0.3;0.1" dur="2s" repeatCount="indefinite" />
          </line>
          <line x1="108" y1="190" x2="175" y2="155" stroke={T.goldLight} strokeWidth="0.2" opacity="0.12"
            strokeDasharray="2,4" />
          <line x1="108" y1="190" x2="262" y2="160" stroke={T.goldLight} strokeWidth="0.2" opacity="0.1"
            strokeDasharray="2,4" />
          {/* Stick figure person with hardhat */}
          <circle cx="118" cy="202" r="2" fill="rgba(255,255,255,0.2)" />
          <rect cx="117" cy="200" width="2" height="0.8" rx="0.3" fill={T.gold} opacity="0.3" x="117" y="199.5" />
          <line x1="118" y1="204" x2="118" y2="210" stroke="rgba(255,255,255,0.15)" strokeWidth="0.7" />
          <line x1="115" y1="206" x2="121" y2="206" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
          <line x1="118" y1="210" x2="116" y2="215" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          <line x1="118" y1="210" x2="120" y2="215" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        </g>

        {/* Weather station / anemometer */}
        <g opacity="0.38" filter="url(#shadow)">
          <line x1="312" y1="205" x2="312" y2="218" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" />
          <circle cx="312" cy="203" r="2" fill={T.navy} stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" />
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values="0 312 203;360 312 203" dur="3s" repeatCount="indefinite" />
            {[0,120,240].map((a) => (
              <circle key={a}
                cx={312 + Math.cos(a * Math.PI / 180) * 3}
                cy={203 + Math.sin(a * Math.PI / 180) * 3}
                r="0.8" fill="rgba(255,255,255,0.18)" />
            ))}
          </g>
        </g>

        {/* Data pulse points */}
        {[
          [158,162],[230,156],[178,192],[245,192],[135,177],
          [278,168],[190,218],[130,228],[285,222],[205,168],
        ].map(([x,y],i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="2" fill={T.gold} opacity="0.75">
              <animate attributeName="r" values="1.5;3;1.5" dur={`${1.8+i*0.18}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={x} cy={y} r="6" fill="none" stroke={T.gold} strokeWidth="0.4" opacity="0">
              <animate attributeName="r" values="3;10;3" dur={`${1.8+i*0.18}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.35;0;0.35" dur={`${1.8+i*0.18}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}

        {/* Data stream lines */}
        <defs>
          <path id="ds1" d="M200,180 Q260,160 330,145" />
          <path id="ds2" d="M180,200 Q240,175 330,155" />
        </defs>
        {["ds1","ds2"].map((id,i) => (
          <g key={id}>
            <use href={`#${id}`} fill="none" stroke={T.gold} strokeWidth="0.4" opacity="0.1" />
            <FlowParticles pathId={id} color={T.goldLight} count={4} dur={2.5+i*0.5} r={1.5} />
          </g>
        ))}

        {/* Satellite dish */}
        <g opacity="0.32">
          <ellipse cx="326" cy="212" rx="4" ry="2.5" fill="none"
            stroke="rgba(255,255,255,0.22)" strokeWidth="0.5" />
          <line x1="326" y1="214" x2="326" y2="220" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
          {[0,1,2].map((j) => (
            <path key={j} d={`M${330+j*3},${210-j*2} Q${332+j*3},${208-j*2} ${334+j*3},${210-j*2}`}
              fill="none" stroke={T.goldLight} strokeWidth="0.3" opacity="0.14">
              <animate attributeName="opacity" values="0;0.22;0" dur={`${1.5+j*0.3}s`} repeatCount="indefinite" />
            </path>
          ))}
        </g>

        {/* Compass rose */}
        <CompassRose x={340} y={268} />
      </SiteBase>

      {/* Drone with spinning props + laser measurement lines */}
      <g filter="url(#shadow)">
        <animateTransform attributeName="transform" type="translate"
          values="0,0; 18,-6; 35,-2; 20,6; 0,0" dur="14s" repeatCount="indefinite" />
        <rect x="174" y="105" width="24" height="14" rx="4.5" fill={T.goldDim} />
        <rect x="177" y="107" width="18" height="10" rx="2.5" fill={T.gold} opacity="0.7" />
        <circle cx="186" cy="120" r="3.5" fill={T.navy} stroke={T.gold} strokeWidth="0.6" />
        <circle cx="186" cy="120" r="1.4" fill={T.goldLight} opacity="0.45" />
        <rect x="181" y="117" width="4" height="3" rx="0.7" fill={T.warmOrange} opacity="0.3">
          <animate attributeName="opacity" values="0.2;0.55;0.2" dur="1s" repeatCount="indefinite" />
        </rect>
        {/* Propellers with blur */}
        {[[-16,0],[16,0],[-11,-6],[11,-6]].map(([dx,dy],i) => (
          <g key={i}>
            <line x1={186} y1={112+dy} x2={186+dx} y2={112+dy}
              stroke={T.goldDim} strokeWidth="1.8" />
            <ellipse cx={186+dx} cy={112+dy} rx="9" ry="2.4" fill={T.gold} opacity="0.12">
              <animate attributeName="rx" values="9;5;9" dur="0.12s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.12;0.2;0.12" dur="0.12s" repeatCount="indefinite" />
            </ellipse>
          </g>
        ))}
        {/* Laser measurement to multiple buildings */}
        <line x1="186" y1="120" x2="170" y2="154" stroke={T.gold} strokeWidth="0.3"
          opacity="0.15" strokeDasharray="2,3" />
        <line x1="186" y1="120" x2="228" y2="150" stroke={T.gold} strokeWidth="0.3"
          opacity="0.12" strokeDasharray="2,3" />
        <circle cx="170" cy="154" r="1.2" fill={T.gold} opacity="0.2" />
        <circle cx="228" cy="150" r="1.2" fill={T.gold} opacity="0.18" />
        {/* Downward cone */}
        <path d="M186,120 L174,148 L198,148 Z" fill="none" stroke={T.gold} strokeWidth="0.3" opacity="0.1" />
      </g>

      {/* Existing PV */}
      <g>
        <rect x="38" y="172" width="38" height="24" rx="2" fill={T.gold} opacity="0.18"
          stroke={T.gold} strokeWidth="0.7" />
        {Array.from({ length: 5 }, (_, i) => (
          <line key={i} x1="40" y1={176+i*4} x2="74" y2={176+i*4}
            stroke={T.goldLight} strokeWidth="0.3" opacity="0.35" />
        ))}
      </g>
      <Badge x={57} y={164} text={`${site.existingPV} MWp`} sub={site.existingPVLabel} icon="sun" lineFrom={[57,172]} />

      {/* Clipboard with animated checkmarks */}
      <g opacity="0.55">
        <rect x="334" y="260" width="28" height="36" rx="3" fill={T.navy}
          stroke={T.gold} strokeWidth="0.5" />
        <rect x="342" y="257" width="12" height="5" rx="2" fill={T.navyLight}
          stroke={T.gold} strokeWidth="0.4" />
        {KPI.analyse.checklist.map((item,i) => (
          <g key={i}>
            <text x="342" y={272+i*6} fill={T.midGray} fontSize="3" fontFamily="Calibri, sans-serif">{item}</text>
            <g opacity="0">
              <path d={`M${336},${269+i*6} l1.5,1.5 l3,-3`} fill="none" stroke={T.greenLight} strokeWidth="0.7" strokeLinecap="round" />
              <animate attributeName="opacity" values="0;0;0;1;1" dur="6s" repeatCount="indefinite"
                begin={`${i*0.8}s`} keyTimes="0;0.3;0.5;0.6;1" />
            </g>
          </g>
        ))}
      </g>

      {/* Info panel */}
      <InfoPanel x={315} y={118} w={74} h={82} title={KPI.analyse.panelTitle} color={T.gold}>
        {KPI.analyse.items.map(([val,label],i) => {
          const col = i < 3 ? T.goldLight : T.midGray;
          return (
          <g key={i}>
            <text x="323" y={142+i*12} fill={col}
              fontSize="6" fontFamily="Calibri, sans-serif" fontWeight="700">{val}</text>
            <text x="358" y={142+i*12} fill={T.midGray}
              fontSize="4.5" fontFamily="Calibri, sans-serif">{label}</text>
          </g>
        );
        })}
      </InfoPanel>

      {/* Thermographic inset with upload progress */}
      <InfoPanel x={315} y={208} w={70} h={50} title="THERMOGRAFIE" color={T.warmOrange}>
        <rect x="320" y="222" width="60" height="24" rx="2" fill="rgba(0,0,0,0.2)" />
        <rect x="322" y="224" width="18" height="13" rx="1" fill={T.warmOrange} opacity="0.35">
          <animate attributeName="opacity" values="0.25;0.48;0.25" dur="3s" repeatCount="indefinite" />
        </rect>
        <rect x="342" y="224" width="22" height="17" rx="1" fill={T.warmOrangeLight} opacity="0.25">
          <animate attributeName="opacity" values="0.2;0.38;0.2" dur="3.5s" repeatCount="indefinite" />
        </rect>
        <rect x="366" y="227" width="10" height="11" rx="1" fill={T.warmOrange} opacity="0.2" />
        <rect x="380" y="222" width="2.5" height="24" rx="1" fill="url(#heatGrad)" />
        <rect x="322" y="250" width="56" height="3" rx="1.5" fill="rgba(0,0,0,0.2)" />
        <rect x="322" y="250" width="0" height="3" rx="1.5" fill={T.warmOrange} opacity="0.4">
          <animate attributeName="width" values="0;56;0" dur="8s" repeatCount="indefinite" />
        </rect>
        <text x="350" y="256" textAnchor="middle" fill={T.midGray}
          fontSize="2.8" fontFamily="Calibri, sans-serif">DATEN-UPLOAD</text>
      </InfoPanel>

      <PhaseBadge x={12} y={8} num="I" icon="search" label="ANALYSE" />
      <Atmosphere />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PHASE II — PV & GEBÄUDEHÜLLE
   ══════════════════════════════════════════════════════════════════ */
export function PVVisual() {
  const T = useTheme();
  return (
    <>
      <ValleyBg />
      <SiteBase solar>
        {/* Fassade PV */}
        {[[200,148,32,"S"],[262,160,20,"W"]].map(([fx,fy,fw,orient],i) => (
          <g key={`fass${i}`}>
            <rect x={fx} y={fy} width={fw} height={i===0?26:18} rx="0.5"
              fill={T.gold} opacity="0.09" stroke={T.goldLight} strokeWidth="0.3" />
            {Array.from({ length: Math.floor(fw/4) }, (_,j) => (
              <line key={j} x1={fx+2+j*4} y1={fy+1} x2={fx+2+j*4} y2={fy+(i===0?25:17)}
                stroke={T.goldLight} strokeWidth="0.15" opacity="0.28" />
            ))}
            <text x={fx+fw/2} y={fy-2} textAnchor="middle" fill={T.goldLight}
              fontSize="2.5" fontFamily="Calibri, sans-serif" opacity="0.38">{orient}</text>
          </g>
        ))}

        {/* DACHSANIERUNG markers */}
        {[[144,150,"SANIERUNG"],[200,142,"SANIERUNG"]].map(([bx,by,label],i) => (
          <g key={`ds${i}`} opacity="0.22">
            <rect x={bx+2} y={by-1} width={label.length*2.8+4} height="5" rx="0.8"
              fill={T.warmOrange} opacity="0.2" />
            <text x={bx+4} y={by+3} fill={T.warmOrangeLight}
              fontSize="2.8" fontFamily="Calibri, sans-serif" fontWeight="700">{label}</text>
          </g>
        ))}

        {/* Carport left */}
        <g>
          <path d="M108,206 L110,199 L158,199 L160,206 Z" fill="url(#solarGrad)" />
          <rect x="108" y="206" width="52" height="2" fill={T.goldDim} opacity="0.5" />
          {/* Gutter channel */}
          <line x1="108" y1="207.5" x2="160" y2="207.5" stroke={T.goldDim} strokeWidth="0.5" opacity="0.3" />
          {Array.from({ length: 7 }, (_,i) => (
            <line key={i} x1={112+i*6.5} y1="199.5" x2={112+i*6.5} y2="206"
              stroke={T.goldLight} strokeWidth="0.2" opacity="0.5" />
          ))}
          {/* Electrical junction box */}
          <rect x="156" y="201" width="4" height="3" rx="0.5" fill={T.navy}
            stroke={T.goldLight} strokeWidth="0.3" opacity="0.6" />
          <circle cx="158" cy="202.5" r="0.5" fill={T.greenLight} opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.8s" repeatCount="indefinite" />
          </circle>
          {/* Panel tilt indicator */}
          <path d="M108,199 L105,202" fill="none" stroke={T.goldLight} strokeWidth="0.35" opacity="0.32" />
          <text x="102" y="204" fill={T.goldLight} fontSize="2.5" opacity="0.32">15°</text>
          {[111,126,141,157].map((xp) => (
            <line key={xp} x1={xp} y1="208" x2={xp} y2="240"
              stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" />
          ))}
          <line x1="111" y1="218" x2="157" y2="218" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          <Car x={113} y={222} color="rgba(100,180,255,0.13)" />
          <Car x={127} y={222} />
          <Car x={141} y={222} color="rgba(180,255,180,0.1)" suv />
        </g>

        {/* Carport right */}
        <g>
          <path d="M265,199 L267,192 L310,192 L312,199 Z" fill="url(#solarGrad)" />
          <rect x="265" y="199" width="47" height="2" fill={T.goldDim} opacity="0.5" />
          <line x1="265" y1="200.5" x2="312" y2="200.5" stroke={T.goldDim} strokeWidth="0.5" opacity="0.28" />
          {Array.from({ length: 6 }, (_,i) => (
            <line key={i} x1={269+i*6.5} y1="192.5" x2={269+i*6.5} y2="199"
              stroke={T.goldLight} strokeWidth="0.2" opacity="0.5" />
          ))}
          <rect x="310" y="194" width="4" height="3" rx="0.5" fill={T.navy}
            stroke={T.goldLight} strokeWidth="0.3" opacity="0.6" />
          {[268,282,296,310].map((xp) => (
            <line key={xp} x1={xp} y1="201" x2={xp} y2="236"
              stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" />
          ))}
          <Car x={270} y={218} />
          <Car x={284} y={218} color="rgba(255,220,150,0.12)" suv />
        </g>

        {/* Inverter boxes + cable runs */}
        {[[196,172],[256,178],[146,200]].map(([x,y],i) => (
          <g key={i}>
            <rect x={x} y={y} width="5" height="4" rx="0.5" fill={T.navy}
              stroke={T.goldLight} strokeWidth="0.4" />
            <circle cx={x+2.5} cy={y+1.5} r="0.6" fill={T.greenLight} opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.85;0.3" dur={`${1.5+i*0.3}s`} repeatCount="indefinite" />
            </circle>
            {/* Power meter spinning disc */}
            <ellipse cx={x+4} cy={y+3} rx="0.6" ry="0.3" fill={T.goldLight} opacity="0.2">
              <animate attributeName="rx" values="0.6;0.1;0.6" dur="0.8s" repeatCount="indefinite" />
            </ellipse>
            {[0,1,2].map((j) => (
              <line key={j} x1={x+1+j*1.5} y1={y+2.5} x2={x+1+j*1.5} y2={y+3.5}
                stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
            ))}
          </g>
        ))}

        {/* Cable runs */}
        <path d="M197,174 Q195,188 195,200" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        <path d="M257,180 Q258,192 260,200" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />

        {/* Workers on scaffolding */}
        {[[182,144],[240,136],[175,176]].map(([cx,cy],i) => (
          <g key={`crew${i}`} opacity="0.15">
            <circle cx={cx} cy={cy-5} r="1.3" fill="rgba(255,255,255,0.3)" />
            {/* Hardhat */}
            <rect x={cx-1.5} y={cy-7} width="3" height="1" rx="0.5" fill={T.gold} opacity="0.4" />
            <line x1={cx} y1={cy-4} x2={cx} y2={cy-1} stroke="rgba(255,255,255,0.22)" strokeWidth="0.7" />
            <line x1={cx-1.5} y1={cy-2.5} x2={cx+1.5} y2={cy-2.5} stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
            <line x1={cx} y1={cy-1} x2={cx-1.2} y2={cy+2} stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
            <line x1={cx} y1={cy-1} x2={cx+1.2} y2={cy+2} stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
          </g>
        ))}

        {/* Small construction crane */}
        <g opacity="0.2">
          <line x1="300" y1="140" x2="300" y2="170" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="295" y1="140" x2="320" y2="140" stroke="rgba(255,255,255,0.15)" strokeWidth="0.7" />
          <line x1="300" y1="140" x2="316" y2="145"
            stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" strokeDasharray="1.5,1.5" />
          {/* Hook */}
          <line x1="316" y1="140" x2="316" y2="148" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />
          <path d="M314,148 Q316,150 318,148" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4">
            <animateTransform attributeName="transform" type="translate"
              values="0,0;0,3;0,0" dur="4s" repeatCount="indefinite" />
          </path>
        </g>

        {/* Travelling solar glints across roofs */}
        {[[170,144],[225,138],[175,176],[230,176],[278,150]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="0" fill={T.goldLight} opacity="0">
            <animate attributeName="r" values="0;10;0" dur={`${3+i*0.7}s`} repeatCount="indefinite" begin={`${i*0.5}s`} />
            <animate attributeName="opacity" values="0;0.14;0" dur={`${3+i*0.7}s`} repeatCount="indefinite" begin={`${i*0.5}s`} />
          </circle>
        ))}

        {/* Sun with animated pulse rings + angle arc */}
        <g>
          {/* Light scatter */}
          <circle cx="358" cy="72" r="22" fill={T.gold} opacity="0.04">
            <animate attributeName="r" values="18;26;18" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.03;0.07;0.03" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx="358" cy="72" r="16" fill={T.gold} opacity="0.06" />
          <circle cx="358" cy="72" r="10" fill={T.goldLight} opacity="0.16" />
          <circle cx="358" cy="72" r="5.5" fill={T.goldLight} opacity="0.38" />
          {/* Lens flare circles */}
          <circle cx="340" cy="82" r="2.5" fill={T.goldLight} opacity="0.04" />
          <circle cx="328" cy="90" r="4" fill={T.goldLight} opacity="0.025" />
          <circle cx="318" cy="96" r="1.5" fill={T.goldLight} opacity="0.035" />
          {/* Sun angle arc */}
          <path d="M358,72 L340,110" fill="none" stroke={T.goldLight} strokeWidth="0.3" opacity="0.1"
            strokeDasharray="3,4" />
          <path d="M350,82 Q346,88 348,92" fill="none" stroke={T.goldLight} strokeWidth="0.4" opacity="0.12" />
          <text x="342" y="94" fill={T.goldLight} fontSize="3" opacity="0.14">32°</text>
          {Array.from({ length: 16 }, (_,i) => {
            const a = (i/16) * Math.PI * 2;
            return (
              <line key={i}
                x1={358+Math.cos(a)*19} y1={72+Math.sin(a)*19}
                x2={358+Math.cos(a)*27} y2={72+Math.sin(a)*27}
                stroke={T.goldLight} strokeWidth="0.7" opacity="0.12" strokeLinecap="round">
                <animate attributeName="opacity" values="0.06;0.24;0.06"
                  dur={`${2.5+(i%4)*0.4}s`} repeatCount="indefinite" />
              </line>
            );
          })}
          {[[175,125],[225,118],[280,130],[135,135]].map(([tx,ty],i) => (
            <line key={i} x1={348-i*3} y1={78+i*2} x2={tx} y2={ty}
              stroke={T.goldLight} strokeWidth="0.3" opacity="0.07" strokeDasharray="5,10">
              <animate attributeName="opacity" values="0.02;0.12;0.02" dur={`${4+i}s`} repeatCount="indefinite" />
            </line>
          ))}
        </g>
      </SiteBase>

      {/* Existing PV dimmed */}
      <g opacity="0.4">
        <rect x="38" y="182" width="24" height="16" rx="1.5" fill={T.gold} opacity="0.2"
          stroke={T.gold} strokeWidth="0.5" />
        {Array.from({ length: 3 }, (_,i) => (
          <line key={i} x1="40" y1={186+i*4} x2="60" y2={186+i*4}
            stroke={T.goldLight} strokeWidth="0.2" opacity="0.3" />
        ))}
        <text x="50" y="204" textAnchor="middle" fill={T.midGray}
          fontSize="3.5" fontFamily="Calibri, sans-serif">{site.existingPV} MWp Bestand</text>
      </g>

      {/* New PV breakdown */}
      <InfoPanel x={12} y={110} w={78} h={50} title={KPI.pv.panelTitle} color={T.gold}>
        {KPI.pv.arrays.map(({icon,label,power,detail},i) => (
          <g key={i}>
            <SvgIcon name={icon} x={20} y={131+i*13} size={6} color={T.goldLight} />
            <text x="30" y={133+i*13} fill={T.goldLight}
              fontSize="4.5" fontFamily="Calibri, sans-serif" fontWeight="700">{label}</text>
            <text x="30" y={139+i*13} fill={T.goldLight}
              fontSize="5.5" fontFamily="Calibri, sans-serif" fontWeight="700">{power}</text>
            <text x="62" y={139+i*13} fill={T.midGray}
              fontSize="3.5" fontFamily="Calibri, sans-serif">{detail}</text>
          </g>
        ))}
      </InfoPanel>

      {/* Yield panel */}
      <InfoPanel x={315} y={130} w={74} h={62} title={KPI.pv.totalLabel} color={T.gold}>
        <text x="352" y={155} textAnchor="middle" fill={T.goldLight}
          fontSize="11" fontFamily="Calibri, sans-serif" fontWeight="700">{KPI.pv.totalPower}</text>
        <text x="352" y={166} textAnchor="middle" fill={T.midGray}
          fontSize="5" fontFamily="Calibri, sans-serif">{KPI.pv.totalYield}</text>
        <rect x="322" y="172" width="54" height="5" rx="2" fill="rgba(0,0,0,0.2)" />
        <rect x="322" y="172" width="30" height="5" rx="2" fill={T.gold} opacity="0.3" />
        <rect x="352" y="172" width="10" height="5" fill={T.gold} opacity="0.2" />
        <rect x="362" y="172" width="14" height="5" rx="2" fill={T.gold} opacity="0.15" />
        <text x="336" y="182" textAnchor="middle" fill={T.midGray}
          fontSize="3" fontFamily="Calibri, sans-serif">Dach</text>
        <text x="358" y="182" textAnchor="middle" fill={T.midGray}
          fontSize="3" fontFamily="Calibri, sans-serif">Fass.</text>
        <text x="372" y="182" textAnchor="middle" fill={T.midGray}
          fontSize="3" fontFamily="Calibri, sans-serif">Carp.</text>
        {/* kWh live ticker */}
        <rect x="322" y="185" width="54" height="4" rx="1" fill="rgba(0,0,0,0.15)" />
        <rect x="322" y="185" width="0" height="4" rx="1" fill={T.gold} opacity="0.15">
          <animate attributeName="width" values="0;54;54" dur="5s" repeatCount="indefinite" />
        </rect>
        <text x="349" y="188.5" textAnchor="middle" fill={T.midGray}
          fontSize="2.5" fontFamily="Calibri, sans-serif">kWh LIVE ▶</text>
      </InfoPanel>

      <PhaseBadge x={12} y={8} num="II" icon="sun" label="PV" />
      <Atmosphere warm />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PHASE III — SPEICHER & STEUERUNG
   ══════════════════════════════════════════════════════════════════ */
export function SpeicherVisual() {
  const T = useTheme();
  return (
    <>
      <ValleyBg />
      <SiteBase dim solar />

      {/* Safety zone marking */}
      <rect x="118" y="225" width="172" height="2" rx="0.5"
        fill="rgba(255,220,80,0.04)" stroke="rgba(255,220,80,0.08)" strokeWidth="0.3" strokeDasharray="3,3" />

      {/* HOCHSPANNUNG warning sign */}
      <g opacity="0.45">
        <polygon points="120,225 125,216 130,225" fill="rgba(255,220,0,0.12)"
          stroke="rgba(255,220,0,0.3)" strokeWidth="0.4" />
        <text x="125" y="223" textAnchor="middle" fill="rgba(255,220,0,0.4)"
          fontSize="3.5" fontFamily="Calibri, sans-serif" fontWeight="700">!</text>
        <text x="135" y="224" fill="rgba(255,220,0,0.2)"
          fontSize="2.5" fontFamily="Calibri, sans-serif">HOCHSPANNUNG</text>
      </g>

      {/* BESS containers */}
      <g filter="url(#shadow)">
        {[0,1,2,3,4].map((i) => (
          <g key={i}>
            {/* Pulsing green glow around BESS area when charging */}
            <rect x={123+i*30} y="228" width="30" height="22" rx="4" fill={T.greenLight} opacity="0">
              <animate attributeName="opacity" values="0;0.06;0" dur={`${2+i*0.25}s`} repeatCount="indefinite" />
            </rect>
            <rect x={126+i*30} y="232" width="26" height="14" rx="2"
              fill={T.green} opacity="0.52" stroke={T.greenLight} strokeWidth="0.7" />
            <path d={`M${152+i*30},232 L${155+i*30},229.5 L${155+i*30},243.5 L${152+i*30},246`}
              fill={T.forestMid} opacity="0.35" />
            {/* Cooling fans */}
            {[0,1,2].map((j) => (
              <g key={j}>
                <rect x={129+i*30+j*7} y="235" width="4.5" height="8" rx="0.5"
                  fill={T.navy} opacity="0.35" />
                <circle cx={131.25+i*30+j*7} cy="239" r="1.5" fill="none"
                  stroke={T.greenLight} strokeWidth="0.3" opacity="0.28">
                  <animateTransform attributeName="transform" type="rotate"
                    values={`0 ${131.25+i*30+j*7} 239;360 ${131.25+i*30+j*7} 239`}
                    dur={`${2+i*0.2}s`} repeatCount="indefinite" />
                </circle>
              </g>
            ))}
            {/* LED status */}
            <rect x={128+i*30} y="233" width="20" height="1.5" rx="0.5" fill={T.greenLight} opacity="0.45">
              <animate attributeName="opacity" values="0.25;0.7;0.25" dur={`${1.8+i*0.2}s`} repeatCount="indefinite" />
            </rect>
            {/* LCD energy level display */}
            <rect x={128+i*30} y="244" width="14" height="3.5" rx="0.5" fill="rgba(0,0,0,0.25)" />
            <text x={135+i*30} y="246.8" textAnchor="middle" fill={T.greenLight}
              fontSize="2.4" fontFamily="Calibri, sans-serif" opacity="0.55">{22+i}°C</text>
            {/* SoC bar */}
            <rect x={148+i*30} y={240-(4+i)} width="2.5" height={4+i} rx="0.5"
              fill={T.greenLight} opacity="0.52" />
            {/* Fire suppression piping (red dashed outline) */}
            <rect x={126+i*30} y="232" width="26" height="14" rx="2" fill="none"
              stroke="rgba(255,60,60,0.22)" strokeWidth="0.5" strokeDasharray="2,2" />
            {/* Fire suppression nozzle dots */}
            <circle cx={128+i*30} cy="232.5" r="1.2" fill="rgba(255,80,80,0.3)"
              stroke="rgba(255,80,80,0.4)" strokeWidth="0.3" />
            {/* Container numbering */}
            <text x={139+i*30} y="249" textAnchor="middle" fill={T.greenLight}
              fontSize="3.2" fontFamily="Calibri, sans-serif" opacity="0.42">B{String(i+1).padStart(2,'0')}</text>
          </g>
        ))}
        {/* PCS units */}
        {[0,1,2,3].map((i) => (
          <g key={i}>
            <rect x={152+i*30} y="237" width="4" height="6" rx="1"
              fill={T.navy} stroke={T.greenLight} strokeWidth="0.3" opacity="0.65" />
            {/* Cable bus bars */}
            <line x1={154+i*30} y1="237" x2={154+i*30} y2="232"
              stroke={T.greenLight} strokeWidth="0.8" opacity="0.4" />
            <line x1={153.5+i*30} y1="233" x2={154.5+i*30} y2="233"
              stroke={T.goldLight} strokeWidth="0.5" opacity="0.35" />
            <SvgIcon name="bolt" x={154+i*30} y={239.5} size={3} color={T.greenLight} />
          </g>
        ))}
        {/* Ground grounding rods */}
        {[130,160,190,220,250].map((gx,i) => (
          <g key={`gr${i}`} opacity="0.2">
            <line x1={gx} y1="246" x2={gx} y2="252" stroke="rgba(80,220,80,0.5)" strokeWidth="0.5" />
            <line x1={gx-1.5} y1="252" x2={gx+1.5} y2="252" stroke="rgba(80,220,80,0.4)" strokeWidth="0.5" />
          </g>
        ))}
      </g>

      <text x="200" y="260" textAnchor="middle" fill={T.greenLight}
        fontSize="5.5" fontFamily="Calibri, sans-serif" fontWeight="700">
        {KPI.speicher.capacity}
      </text>

      {/* EMS Dashboard with charts */}
      <g filter="url(#glow)">
        <rect x="168" y="152" width="64" height="44" rx="5" fill={T.navy}
          stroke={T.gold} strokeWidth="1.2" />
        <rect x="172" y="158" width="56" height="30" rx="2.5" fill="rgba(0,0,0,0.35)" />
        {/* Waveform */}
        <polyline points="175,178 180,172 185,175 190,168 195,170 200,165 205,168 210,172 215,167 220,170 225,175"
          fill="none" stroke={T.greenLight} strokeWidth="0.8" opacity="0.5">
          <animate attributeName="points"
            values="175,178 180,172 185,175 190,168 195,170 200,165 205,168 210,172 215,167 220,170 225,175;175,175 180,170 185,172 190,165 195,168 200,162 205,170 210,168 215,172 220,167 225,172;175,178 180,172 185,175 190,168 195,170 200,165 205,168 210,172 215,167 220,170 225,175"
            dur="4s" repeatCount="indefinite" />
        </polyline>
        {/* Bar chart */}
        {Array.from({ length: 8 }, (_,i) => {
          const bh = 3 + ((i*3+2)%8);
          return (
            <rect key={i} x={175+i*6.5} y={177-bh} width="4" height={bh}
              fill={i<5?T.gold:T.greenLight} opacity="0.5" rx="0.5">
              <animate attributeName="height" values={`${bh};${bh+2};${bh}`} dur={`${2+i*0.2}s`} repeatCount="indefinite" />
              <animate attributeName="y" values={`${177-bh};${175-bh};${177-bh}`} dur={`${2+i*0.2}s`} repeatCount="indefinite" />
            </rect>
          );
        })}
        {/* Mini pie chart in corner */}
        <circle cx="220" cy="165" r="4" fill="none" stroke={T.greenLight}
          strokeWidth="4" strokeDasharray="16 9" opacity="0.3"
          transform="rotate(-90 220 165)" />
        <circle cx="220" cy="165" r="4" fill="none" stroke={T.gold}
          strokeWidth="4" strokeDasharray="9 16" opacity="0.25"
          transform="rotate(-90 220 165)" />
        {/* Efficiency gauge */}
        <rect x="175" y="180" width="20" height="3" rx="1" fill="rgba(0,0,0,0.2)" />
        <rect x="175" y="180" width="18" height="3" rx="1" fill={T.greenLight} opacity="0.28" />
        <text x="198" y="182.5" fill={T.greenLight} fontSize="2.5"
          fontFamily="Calibri, sans-serif" opacity="0.42">92%</text>
        <text x="200" y="167" textAnchor="middle" fill={T.goldLight} opacity="0.45"
          fontSize="3.5" fontFamily="Calibri, sans-serif" letterSpacing="0.5">ECHTZEIT-STEUERUNG</text>
        <text x="200" y="191" textAnchor="middle" fill={T.goldLight}
          fontSize="9" fontFamily="Calibri, sans-serif" fontWeight="700">EMS</text>
      </g>

      {/* Control room window with screens */}
      <g opacity="0.35">
        <rect x="120" y="168" width="14" height="10" rx="1" fill={T.navy}
          stroke={T.goldLight} strokeWidth="0.4" />
        <rect x="122" y="169.5" width="4" height="3" rx="0.3" fill="rgba(58,138,102,0.25)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
        </rect>
        <rect x="128" y="169.5" width="4" height="3" rx="0.3" fill="rgba(212,168,67,0.2)">
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2.8s" repeatCount="indefinite" />
        </rect>
      </g>

      {/* Energy flow paths */}
      <defs>
        <path id="ef1" d="M172,185 Q150,215 148,232" />
        <path id="ef2" d="M232,185 Q250,215 252,232" />
        <path id="ef3" d="M200,196 L200,232" />
      </defs>
      {["ef1","ef2","ef3"].map((id,i) => (
        <g key={id}>
          <use href={`#${id}`} fill="none" stroke={T.greenLight} strokeWidth="0.8" opacity="0.12" />
          <FlowParticles pathId={id} color={T.greenLight} count={3} dur={2.5+i*0.3} />
        </g>
      ))}

      {/* Charge/discharge arrows */}
      <g opacity="0.32">
        <path d="M120,238 L115,240 L120,242" fill="none" stroke={T.greenLight} strokeWidth="0.7" opacity="0.45">
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" />
        </path>
        <text x="108" y="241.5" textAnchor="middle" fill={T.greenLight}
          fontSize="3" fontFamily="Calibri, sans-serif">LADE</text>
        <path d="M290,238 L295,240 L290,242" fill="none" stroke={T.goldLight} strokeWidth="0.7" opacity="0.45">
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" begin="1s" />
        </path>
        <text x="302" y="241.5" fill={T.goldLight} fontSize="3" fontFamily="Calibri, sans-serif">ENTL.</text>
      </g>

      {/* EMS strategy panel */}
      <InfoPanel x={298} y={132} w={92} h={92} title={KPI.speicher.panelTitle} color={T.gold}>
        {KPI.speicher.strategies.map(({num, title, sub}, i) => {
          const colors = [T.goldLight, T.greenLight, T.goldLight];
          const col = colors[i] || T.goldLight;
          return (
            <g key={i}>
              <circle cx="310" cy={152+i*20} r="4" fill={col} opacity="0.15" />
              <text x="310" y={154+i*20} textAnchor="middle" fill={col} fontSize="5" fontWeight="700">{num}</text>
              <text x="318" y={152+i*20} fill={col} fontSize="4.5" fontFamily="Calibri, sans-serif" fontWeight="700">{title}</text>
              <text x="318" y={158+i*20} fill={T.midGray} fontSize="3.5" fontFamily="Calibri, sans-serif">{sub}</text>
            </g>
          );
        })}
        {/* Peak Shaving mini chart */}
        <polyline points="366,178 370,174 374,176 378,172 382,175 386,178"
          fill="none" stroke="rgba(255,150,150,0.3)" strokeWidth="0.8" />
        <polyline points="366,178 370,174 374,176 378,176 382,176 386,178"
          fill="none" stroke={T.greenLight} strokeWidth="0.8" />
        {/* Spotmarkt arrows */}
        <text x="374" y="192" fill={T.greenLight} fontSize="5" fontFamily="Calibri, sans-serif" fontWeight="700">↓</text>
        <text x="380" y="192" fill={T.warmOrangeLight} fontSize="5" fontFamily="Calibri, sans-serif" fontWeight="700">↑</text>
        <text x="374" y="197" fill={T.midGray} fontSize="3" fontFamily="Calibri, sans-serif">2ct</text>
        <text x="381" y="197" fill={T.midGray} fontSize="3" fontFamily="Calibri, sans-serif">8ct</text>
        <line x1="304" y1="205" x2="384" y2="205" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <text x="344" y="215" textAnchor="middle" fill={T.goldLight}
          fontSize="5" fontFamily="Calibri, sans-serif" fontWeight="700">{KPI.speicher.savingsLabel}</text>
      </InfoPanel>

      <PhaseBadge x={12} y={8} num="III" icon="battery" label="SPEICHER" color={T.green} />
      <Atmosphere />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PHASE IV — WÄRMEKONZEPT
   ══════════════════════════════════════════════════════════════════ */
export function WaermeVisual() {
  const T = useTheme();
  const pc = T.warmOrange, pl = T.warmOrangeLight;
  return (
    <>
      <ValleyBg />
      <SiteBase dim heat />

      {/* Heat pipe backbone */}
      <defs>
        <path id="hp1" d="M170,172 L170,200 L232,200 L232,172" />
        <path id="hp2" d="M170,200 L140,200 L140,182" />
        <path id="hp3" d="M232,200 L270,200 L270,176" />
        <path id="hp4" d="M200,200 L200,218" />
        <path id="hp5" d="M170,200 L155,218" />
        <path id="hp6" d="M232,200 L250,218" />
        <path id="hpr1" d="M170,175 L170,203 L232,203 L232,175" />
      </defs>

      {/* WÄRMENETZ label along main pipeline */}
      <text x="200" y="197" textAnchor="middle" fill={pl}
        fontSize="3" fontFamily="Calibri, sans-serif" opacity="0.28" letterSpacing="2">WÄRMENETZ</text>

      {["hp1","hp2","hp3","hp4","hp5","hp6"].map((id,i) => (
        <g key={id}>
          <use href={`#${id}`} fill="none" stroke={pc} strokeWidth="4"
            opacity="0.15" strokeLinecap="round" strokeLinejoin="round" />
          <use href={`#${id}`} fill="none" stroke={pl} strokeWidth="1.2"
            opacity="0.38" strokeDasharray="4,4" strokeLinecap="round">
            <animate attributeName="strokeDashoffset" values="0;-16" dur="2.5s" repeatCount="indefinite" />
          </use>
          <FlowParticles pathId={id} color={pl} count={2} dur={3+i*0.3} />
        </g>
      ))}

      {/* Return flow (cool blue) */}
      <use href="#hpr1" fill="none" stroke="rgba(100,160,220,0.09)" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      <use href="#hpr1" fill="none" stroke="rgba(100,160,220,0.18)" strokeWidth="0.6"
        strokeDasharray="3,5" strokeLinecap="round">
        <animate attributeName="strokeDashoffset" values="0;16" dur="3s" repeatCount="indefinite" />
      </use>

      {/* Valve handles at junctions (T-shape) */}
      {[[170,200],[232,200],[200,200]].map(([x,y],i) => (
        <g key={`v${i}`} opacity="0.45">
          <circle cx={x} cy={y} r="5" fill={pc} opacity="0.25" />
          <circle cx={x} cy={y} r="2.5" fill={pl} opacity="0.6" />
          <circle cx={x} cy={y} r="1" fill="#fff" opacity="0.22" />
          {/* Valve handle T-shape */}
          <line x1={x-3} y1={y-4} x2={x+3} y2={y-4} stroke={pl} strokeWidth="0.8" opacity="0.4" />
          <line x1={x} y1={y-4} x2={x} y2={y-6} stroke={pl} strokeWidth="0.8" opacity="0.4" />
        </g>
      ))}

      {/* Pipe cross-section detail (DN150) */}
      <g opacity="0.38">
        <circle cx="200" cy="196" r="3" fill={T.navy} stroke={pc} strokeWidth="0.5" />
        <circle cx="200" cy="196" r="2" fill={pc} opacity="0.15" />
        <circle cx="200" cy="196" r="1" fill={pl} opacity="0.32" />
        <text x="200" y="192" textAnchor="middle" fill={pl} fontSize="2.5"
          fontFamily="Calibri, sans-serif">DN150</text>
      </g>

      {/* Underground pipe section view (cutaway) */}
      <g opacity="0.3">
        <rect x="165" y="213" width="15" height="5" rx="1.5" fill={T.navy}
          stroke={pc} strokeWidth="0.4" />
        <rect x="167" y="214.5" width="11" height="2" rx="1" fill={pc} opacity="0.2" />
        <text x="172.5" y="221" textAnchor="middle" fill={pl}
          fontSize="2.5" fontFamily="Calibri, sans-serif">ERDVERLEGT</text>
      </g>

      {/* WP cascade units */}
      {[0,1,2].map((i) => (
        <g key={i} filter="url(#shadow)">
          <rect x={145+i*35} y="130" width="28" height="24" rx="3.5"
            fill={T.navy} stroke={pc} strokeWidth="1.2" />
          <circle cx={159+i*35} cy="138" r="6.5" fill="none" stroke={pc} strokeWidth="0.5" opacity="0.3" />
          <circle cx={159+i*35} cy="138" r="4" fill="none" stroke={pc} strokeWidth="0.4" opacity="0.22" />
          <circle cx={159+i*35} cy="138" r="1.5" fill={pc} opacity="0.48">
            <animate attributeName="r" values="1;2;1" dur={`${1.5+i*0.3}s`} repeatCount="indefinite" />
          </circle>
          {/* Compressor rotor */}
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values={`0 ${159+i*35} 138;360 ${159+i*35} 138`}
              dur={`${2+i*0.3}s`} repeatCount="indefinite" />
            {[0,90,180,270].map((a) => (
              <line key={a}
                x1={159+i*35} y1={138}
                x2={159+i*35+Math.cos(a*Math.PI/180)*5}
                y2={138+Math.sin(a*Math.PI/180)*5}
                stroke={pc} strokeWidth="0.5" opacity="0.22" />
            ))}
          </g>
          {/* Compressor vibration hint */}
          <rect x={145+i*35} y="130" width="28" height="24" rx="3.5"
            fill="none" stroke={pc} strokeWidth="0.3" opacity="0">
            <animate attributeName="opacity" values="0;0.15;0" dur={`${0.3+i*0.05}s`} repeatCount="indefinite" />
          </rect>
          <text x={159+i*35} y="151" textAnchor="middle" fill={pl}
            fontSize="5" fontFamily="Calibri, sans-serif" fontWeight="700">WP {i+1}</text>
          {/* Heat waves / steam */}
          {[0,1,2].map((j) => (
            <path key={j}
              d={`M${153+i*35+j*5},128 Q${155.5+i*35+j*5},123 ${158+i*35+j*5},128`}
              fill="none" stroke={pl} strokeWidth="0.7" opacity="0.27">
              <animate attributeName="opacity" values="0.12;0.48;0.12"
                dur={`${1.3+j*0.25+i*0.15}s`} repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate"
                values="0,0;0,-5;0,0" dur={`${1.3+j*0.25+i*0.15}s`} repeatCount="indefinite" />
            </path>
          ))}
          <line x1={159+i*35} y1="154" x2={159+i*35} y2="172"
            stroke={pc} strokeWidth="2.5" opacity="0.25" />
        </g>
      ))}

      {/* Expansion vessel */}
      <g opacity="0.42">
        <ellipse cx="120" cy="145" rx="5" ry="8" fill={T.navy} stroke={pc} strokeWidth="0.5" />
        <ellipse cx="120" cy="145" rx="4" ry="5" fill={pc} opacity="0.09" />
        <text x="120" y="147" textAnchor="middle" fill={pl} fontSize="2.5"
          fontFamily="Calibri, sans-serif">MAG</text>
        <line x1="120" y1="153" x2="140" y2="170" stroke={pc} strokeWidth="0.8" opacity="0.18" />
      </g>

      {/* Pufferspeicher (500m³) */}
      <g filter="url(#shadow)">
        <ellipse cx="268" cy="132" rx="12" ry="3.5" fill={T.navyMid} stroke={pc} strokeWidth="0.5" />
        <rect x="256" y="132" width="24" height="32" fill={T.navy} stroke={pc} strokeWidth="0.7" />
        <ellipse cx="268" cy="164" rx="12" ry="3.5" fill={T.navyMid} stroke={pc} strokeWidth="0.5" />
        <rect x="258" y="146" width="20" height="16" fill={pc} opacity="0.12" rx="1">
          <animate attributeName="height" values="14;18;14" dur="5s" repeatCount="indefinite" />
          <animate attributeName="y" values="148;144;148" dur="5s" repeatCount="indefinite" />
        </rect>
        {/* Steam/vapor wisps from top */}
        {[0,1,2].map((j) => (
          <path key={j}
            d={`M${262+j*4},129 Q${263+j*4},124 ${265+j*4},129`}
            fill="none" stroke={pl} strokeWidth="0.6" opacity="0.2">
            <animate attributeName="opacity" values="0.1;0.35;0.1"
              dur={`${1.5+j*0.2}s`} repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="translate"
              values="0,0;0,-4;0,0" dur={`${1.5+j*0.2}s`} repeatCount="indefinite" />
          </path>
        ))}
        {/* Temperature gradient scale */}
        <rect x="253" y="134" width="2" height="28" rx="0.5" fill="url(#heatGrad)" opacity="0.42" />
        {[0,1,2,3].map((j) => (
          <line key={j} x1="254" y1={136+j*7} x2="256" y2={136+j*7}
            stroke={pc} strokeWidth="0.4" opacity="0.32" />
        ))}
        <text x="252" y="137" textAnchor="end" fill={pl} fontSize="2"
          fontFamily="Calibri, sans-serif" opacity="0.32">80°</text>
        <text x="252" y="159" textAnchor="end" fill={T.coolBlue} fontSize="2"
          fontFamily="Calibri, sans-serif" opacity="0.32">35°</text>
        <text x="268" y="155" textAnchor="middle" fill={pl}
          fontSize="5" fontFamily="Calibri, sans-serif" fontWeight="700">{KPI.waerme.bufferSize}</text>
        <text x="268" y="161" textAnchor="middle" fill={T.midGray}
          fontSize="3.5" fontFamily="Calibri, sans-serif">{KPI.waerme.bufferTemp}</text>
      </g>

      {/* Building temperature indicators */}
      {[[155,170],[218,165],[275,163]].map(([x,y],i) => (
        <g key={`ti${i}`} opacity="0.3">
          <rect x={x} y={y} width="8" height="10" rx="3" fill={T.navy}
            stroke={pl} strokeWidth="0.4" />
          <rect x={x+2} y={y+4} width="4" height={4} rx="1" fill={pl} opacity="0.25" />
          <circle cx={x+4} cy={y+3} r="1.2" fill={pl} opacity="0.3" />
          <text x={x-2} y={y-2} fill={pl} fontSize="2.5"
            fontFamily="Calibri, sans-serif">{62-i*2}°</text>
        </g>
      ))}

      {/* Radiators inside buildings */}
      {[[160,186],[218,186],[275,162]].map(([x,y],i) => (
        <g key={i} opacity="0.22">
          {[0,1,2].map((j) => (
            <path key={j} d={`M${x+j*3},${y} L${x+j*3},${y+5}`}
              stroke={pl} strokeWidth="1.2" />
          ))}
          <line x1={x-1} y1={y} x2={x+7} y2={y} stroke={pl} strokeWidth="0.5" />
          <line x1={x-1} y1={y+5} x2={x+7} y2={y+5} stroke={pl} strokeWidth="0.5" />
        </g>
      ))}

      {/* Exhaust vent details on buildings */}
      {[[210,142],[264,155]].map(([x,y],i) => (
        <g key={`ev${i}`} opacity="0.25">
          <rect x={x} y={y-3} width="6" height="3" rx="0.5" fill={T.navyMid}
            stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />
          <line x1={x+1} y1={y-1.5} x2={x+1} y2={y-4} stroke={pl} strokeWidth="0.3" opacity="0.3" />
          <line x1={x+3} y1={y-1.5} x2={x+3} y2={y-4} stroke={pl} strokeWidth="0.3" opacity="0.3" />
          <line x1={x+5} y1={y-1.5} x2={x+5} y2={y-4} stroke={pl} strokeWidth="0.3" opacity="0.3" />
        </g>
      ))}

      {/* Geothermal borehole */}
      <g opacity="0.28">
        <line x1="300" y1="232" x2="300" y2="258" stroke={pc} strokeWidth="1"
          strokeDasharray="2,2" />
        <text x="300" y="262" textAnchor="middle" fill={pl} fontSize="2.5"
          fontFamily="Calibri, sans-serif">80m</text>
        <circle cx="300" cy="232" r="2" fill={pc} opacity="0.22" stroke={pc} strokeWidth="0.3" />
      </g>

      {/* Abwärme source labels */}
      {[[155,168],[212,162],[248,174]].map(([x,y],i) => {
        const label = buildings.heatSources[i];
        return (
        <g key={i} opacity="0.42">
          <line x1={x} y1={y} x2={x} y2={y-12} stroke={pl} strokeWidth="1"
            markerEnd="url(#arrW)" />
          <text x={x} y={y-14} textAnchor="middle" fill={pl}
            fontSize="3.5" fontFamily="Calibri, sans-serif">{label}</text>
        </g>
      );
      })}

      {/* Seasonal indicator */}
      <g opacity="0.35">
        <SvgIcon name="bolt" x={312} y={123} size={7} color={T.coolBlue} />
        <text x="318" y="127" fill={T.midGray} fontSize="4.5"
          fontFamily="Calibri, sans-serif">–12°C</text>
        <SvgIcon name="sun" x={312} y={133} size={7} color={T.warmOrange} />
        <text x="318" y="137" fill={T.midGray} fontSize="4.5"
          fontFamily="Calibri, sans-serif">+32°C</text>
      </g>

      {/* Info panel */}
      <InfoPanel x={308} y={142} w={80} h={74} title={KPI.waerme.panelTitle} color={pc}>
        {KPI.waerme.items.map(([val,label],i) => {
          const col = i < 2 ? pl : i === 2 ? T.greenLight : T.midGray;
          return (
          <g key={i}>
            <text x="316" y={162+i*11} fill={col}
              fontSize="5.5" fontFamily="Calibri, sans-serif" fontWeight="700">{val}</text>
            <text x="352" y={162+i*11} fill={T.midGray}
              fontSize="4" fontFamily="Calibri, sans-serif">{label}</text>
          </g>
        );
        })}
        <line x1="314" y1="206" x2="382" y2="206" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
        <text x="316" y="213" fill={T.greenLight} fontSize="5"
          fontFamily="Calibri, sans-serif" fontWeight="700">{KPI.waerme.co2Savings}</text>
        <text x="356" y="213" fill={T.midGray} fontSize="3.5"
          fontFamily="Calibri, sans-serif">CO₂/a</text>
      </InfoPanel>

      <PhaseBadge x={12} y={8} num="IV" icon="fire" label="WÄRME" color={T.warmOrange} />
      <Atmosphere />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PHASE V — LADEINFRASTRUKTUR
   ══════════════════════════════════════════════════════════════════ */
export function LadeVisual() {
  const T = useTheme();
  return (
    <>
      <ValleyBg />
      <SiteBase dim />

      {/* Energy supply lines */}
      <defs>
        <path id="pv2c1" d="M200,184 Q180,210 135,224" />
        <path id="pv2c2" d="M200,184 Q225,210 285,218" />
        <path id="pv2c3" d="M200,184 L200,262" />
      </defs>
      {["pv2c1","pv2c2","pv2c3"].map((id,i) => (
        <g key={id}>
          <use href={`#${id}`} fill="none" stroke={T.gold} strokeWidth="0.6" opacity="0.08" />
          <FlowParticles pathId={id} color={T.goldLight} count={2} dur={3.5+i*0.5} />
        </g>
      ))}

      {/* ELEKTRIFIZIERUNG banner */}
      <g opacity="0.22">
        <rect x="135" y="200" width="68" height="7" rx="3" fill={T.navy}
          stroke={T.greenLight} strokeWidth="0.4" />
        <text x="169" y="205.5" textAnchor="middle" fill={T.greenLight}
          fontSize="4" fontFamily="Calibri, sans-serif" fontWeight="700" letterSpacing="1.5">ELEKTRIFIZIERUNG</text>
      </g>

      {/* Traffic flow arrows */}
      <g opacity="0.15">
        <path d="M88,222 L100,218" fill="none" stroke={T.greenLight} strokeWidth="0.6"
          markerEnd="url(#arrGr)" />
        <path d="M100,250 L88,254" fill="none" stroke={T.greenLight} strokeWidth="0.6"
          markerEnd="url(#arrGr)" />
        <path d="M310,218 L322,222" fill="none" stroke={T.greenLight} strokeWidth="0.6"
          markerEnd="url(#arrGr)" />
      </g>

      {/* Load management bar */}
      <g opacity="0.42">
        <rect x="175" y="192" width="50" height="5" rx="2" fill={T.navy}
          stroke={T.greenLight} strokeWidth="0.4" />
        <rect x="176" y="193" width="32" height="3" rx="1.5" fill={T.greenLight} opacity="0.28">
          <animate attributeName="width" values="28;40;28" dur="6s" repeatCount="indefinite" />
        </rect>
        <text x="200" y="201" textAnchor="middle" fill={T.greenLight}
          fontSize="3" fontFamily="Calibri, sans-serif" fontWeight="700">LAST-MGMT 65%</text>
      </g>

      {/* AC Ladepark (left) */}
      <g>
        <rect x="96" y="212" width="60" height="38" rx="2.5"
          fill="rgba(255,255,255,0.02)" stroke={T.greenLight} strokeWidth="0.7" />
        <text x="126" y="210" textAnchor="middle" fill={T.greenLight}
          fontSize="4" fontFamily="Calibri, sans-serif" fontWeight="700" letterSpacing="1">AC-LADEPARK · 22 kW</text>

        {Array.from({ length: 10 }, (_,i) => {
          const row = Math.floor(i/5);
          const col = i%5;
          const wx = 100+col*11;
          const wy = 216+row*18;
          const charging = i < 7;
          return (
            <g key={i}>
              <rect x={wx} y={wy} width="7" height="10" rx="1.3"
                fill={T.navy} stroke={T.greenLight} strokeWidth="0.5" />
              <rect x={wx+1} y={wy+1} width="5" height="3.5" rx="0.5" fill="rgba(58,138,102,0.22)" />
              {/* Digital kW display */}
              <text x={wx+3.5} y={wy+3.8} textAnchor="middle" fill={T.greenLight}
                fontSize="3" fontFamily="Calibri, sans-serif" opacity="0.5">22kW</text>
              {/* RFID reader */}
              <rect x={wx+1.5} y={wy+5} width="4" height="2" rx="0.3" fill="rgba(255,255,255,0.04)" />
              <circle cx={wx+5.5} cy={wy+6} r="0.6" fill={T.gold} opacity="0.3">
                <animate attributeName="opacity" values="0.1;0.5;0.1" dur={`${2+i*0.15}s`} repeatCount="indefinite" />
              </circle>
              {/* Status LED */}
              <circle cx={wx+3.5} cy={wy+8.5} r="0.8" fill={charging?T.greenLight:T.gold}>
                <animate attributeName="opacity" values="0.3;1;0.3" dur={`${1+i*0.12}s`} repeatCount="indefinite" />
              </circle>
              {/* Charging cable glow */}
              {charging && (
                <line x1={wx+3.5} y1={wy+9.5} x2={wx+3.5} y2={wy+13}
                  stroke={T.greenLight} strokeWidth="0.5" opacity="0.25">
                  <animate attributeName="opacity" values="0.1;0.4;0.1"
                    dur={`${1.5+i*0.1}s`} repeatCount="indefinite" />
                </line>
              )}
              {/* % display */}
              {charging && (
                <text x={wx+8.5} y={wy+5} fill={T.greenLight}
                  fontSize="3" fontFamily="Calibri, sans-serif" opacity="0.4">
                  {40+i*8}%
                </text>
              )}
              {/* Charging bar */}
              {charging && (
                <rect x={wx+5.5} y={wy+10-(3+i%4)} width="1" height={3+i%4} rx="0.3"
                  fill={T.greenLight} opacity="0.32" />
              )}
            </g>
          );
        })}

        {/* Accessible parking */}
        <g opacity="0.18">
          <rect x="98" y="246" width="6" height="4" rx="0.5" fill="rgba(100,160,255,0.25)" />
          <text x="101" y="249.5" textAnchor="middle" fill="rgba(100,160,255,0.4)" fontSize="3">♿</text>
        </g>

        <Car x={100} y={234} color="rgba(100,180,255,0.13)" s={0.85} />
        <Car x={112} y={234} s={0.85} />
        <Car x={124} y={234} color="rgba(180,255,180,0.1)" s={0.85} suv />
        <Car x={136} y={234} color="rgba(255,220,150,0.1)" s={0.85} />
      </g>

      {/* DC Fleet (right) with V2G */}
      <g>
        <rect x="260" y="206" width="55" height="36" rx="2.5"
          fill="rgba(255,255,255,0.02)" stroke={T.gold} strokeWidth="0.7" />
        <text x="287" y="204" textAnchor="middle" fill={T.goldLight}
          fontSize="4" fontFamily="Calibri, sans-serif" fontWeight="700" letterSpacing="1">DC-FLEET · 150 kW</text>

        {[0,1,2,3].map((i) => (
          <g key={i}>
            <rect x={266+i*12} y="211" width="8" height="15" rx="2"
              fill={T.navy} stroke={T.gold} strokeWidth="0.7" />
            <rect x={267+i*12} y="213" width="6" height="4.5" rx="0.5" fill="rgba(212,168,67,0.22)" />
            {/* kW display */}
            <text x={271+i*12} y="216.5" textAnchor="middle" fill={T.goldLight}
              fontSize="3" fontFamily="Calibri, sans-serif" opacity="0.5">150kW</text>
            {/* % display */}
            <text x={275+i*12} y="216.5" fill={T.goldLight}
              fontSize="2.8" fontFamily="Calibri, sans-serif" opacity="0.4">
              {60+i*8}%
            </text>
            {/* Lightning bolt */}
            <path d={`M${271+i*12},220 L${272.5+i*12},222.5 L${270+i*12},223 L${272.5+i*12},226`}
              fill="none" stroke={T.goldLight} strokeWidth="0.7" opacity="0.62">
              <animate attributeName="opacity" values="0.3;0.9;0.3"
                dur={`${0.7+i*0.15}s`} repeatCount="indefinite" />
            </path>
            {/* RFID blink */}
            <circle cx={273+i*12} cy={224} r="0.8" fill={T.gold} opacity="0.2">
              <animate attributeName="opacity" values="0.1;0.5;0.1"
                dur={`${1.8+i*0.2}s`} repeatCount="indefinite" />
            </circle>
            {/* Charging cable glow line */}
            <line x1={271+i*12} y1="226" x2={271+i*12} y2="232"
              stroke={T.goldLight} strokeWidth="1" opacity="0.18">
              <animate attributeName="opacity" values="0.1;0.35;0.1"
                dur={`${1.2+i*0.15}s`} repeatCount="indefinite" />
            </line>
          </g>
        ))}

        {/* V2G bidirectional arrows with labels */}
        <g opacity="0.28">
          <path d="M262,236 L258,234 L258,238 Z" fill={T.greenLight} opacity="0.45">
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" />
          </path>
          <path d="M258,236 L262,234 L262,238 Z" fill={T.gold} opacity="0.35">
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite"
              begin="1s" />
          </path>
          <text x="248" y="234" fill={T.greenLight} fontSize="2.5"
            fontFamily="Calibri, sans-serif">V2G</text>
          <text x="248" y="239" fill={T.midGray} fontSize="2"
            fontFamily="Calibri, sans-serif">Grid→Veh</text>
          <text x="248" y="243.5" fill={T.midGray} fontSize="2"
            fontFamily="Calibri, sans-serif">Veh→Grid</text>
        </g>

        <Car x={267} y={230} color="rgba(212,168,67,0.13)" s={0.9} />
        <Car x={283} y={230} color="rgba(212,168,67,0.1)" s={0.9} suv />
        <Car x={299} y={230} s={0.9} />
      </g>

      {/* HPC Truck Depot */}
      <g>
        <rect x="130" y="262" width="140" height="32" rx="3"
          fill="rgba(255,255,255,0.015)" stroke={T.greenLight} strokeWidth="0.8" />
        {/* Solar canopy */}
        <path d="M132,262 L134,258 L268,258 L270,262" fill="url(#solarGrad)" opacity="0.15" />
        <text x="200" y="257" textAnchor="middle" fill={T.goldLight}
          fontSize="2.5" fontFamily="Calibri, sans-serif" opacity="0.22">PV-DACH</text>
        <text x="200" y="260" textAnchor="middle" fill={T.greenLight}
          fontSize="5" fontFamily="Calibri, sans-serif" fontWeight="700" letterSpacing="1">
          LKW HPC-DEPOT
        </text>

        {[0,1,2,3,4].map((i) => (
          <g key={i}>
            <rect x={140+i*25} y="267" width="14" height="18" rx="2.5"
              fill={T.navy} stroke={T.greenLight} strokeWidth="0.9" />
            <rect x={142+i*25} y="269" width="10" height="5.5" rx="1" fill="rgba(58,138,102,0.22)" />
            {/* kW display */}
            <text x={147+i*25} y="273" textAnchor="middle" fill={T.greenLight}
              fontSize="3" fontFamily="Calibri, sans-serif" fontWeight="700">{150+i*50}</text>
            <text x={147+i*25} y="277" textAnchor="middle" fill={T.midGray}
              fontSize="2.5" fontFamily="Calibri, sans-serif">kW</text>
            {/* % charge */}
            <text x={147+i*25} y="281" textAnchor="middle" fill={T.greenLight}
              fontSize="2.2" fontFamily="Calibri, sans-serif" opacity="0.55">{55+i*7}%</text>
            {/* Progress bar */}
            <rect x={143+i*25} y="284" width="8" height="1.5" rx="0.5" fill="rgba(0,0,0,0.2)" />
            <rect x={143+i*25} y="284" width="2" height="1.5" rx="0.5"
              fill={T.greenLight} opacity="0.4">
              <animate attributeName="width" values="2;8;2" dur={`${2+i*0.3}s`} repeatCount="indefinite" />
            </rect>
            {/* Liquid cooling line detail */}
            <line x1={154+i*25} y1="267" x2={154+i*25} y2="285"
              stroke="rgba(100,160,255,0.12)" strokeWidth="0.5" />
            {/* Cable coil */}
            <circle cx={155+i*25} cy="278" r="2" fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          </g>
        ))}
        <Truck x={142} y={290} />
        <Truck x={192} y={290} />
      </g>

      <Badge x={40} y={260} text={`${KPI.lade.acCount} AC`} sub={KPI.lade.acLabel} icon="plug" color={T.greenLight} />
      <Badge x={340} y={265} text={KPI.lade.dcRange} sub={KPI.lade.dcLabel} icon="bolt" color={T.greenLight} align="right" />

      <InfoPanel x={320} y={152} w={68} h={28} title="GEIG-KONFORM" color={T.greenLight}>
        <text x="354" y="172" textAnchor="middle" fill={T.midGray}
          fontSize="4.5" fontFamily="Calibri, sans-serif">Ladepflicht ab 2026</text>
        <SvgIcon name="check" x={381} y={169} size={4} color={T.greenLight} />
      </InfoPanel>

      <PhaseBadge x={12} y={8} num="V" icon="plug" label="LADEN" color={T.greenLight} />
      <Atmosphere />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PHASE VI — GRAUSTROM-BESS
   ══════════════════════════════════════════════════════════════════ */
export function BESSVisual() {
  const T = useTheme();
  return (
    <>
      <ValleyBg cool />
      <SiteBase dim />

      {/* Shooting star */}
      <line x1="380" y1="15" x2="360" y2="35" stroke="#C8D8E8" strokeWidth="0.5" opacity="0">
        <animate attributeName="opacity" values="0;0;0.4;0" dur="8s" repeatCount="indefinite" begin="3s" />
        <animate attributeName="x1" values="380;360" dur="0.5s" repeatCount="indefinite" begin="3s" />
        <animate attributeName="x2" values="360;340" dur="0.5s" repeatCount="indefinite" begin="3s" />
      </line>

      {/* 110 kV Power line + enhanced pylon */}
      <g>
        <path d="M12,95 Q48,87 85,136" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        <line x1="85" y1="136" x2="125" y2="162" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        <g>
          <line x1="77" y1="146" x2="85" y2="118" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
          <line x1="93" y1="146" x2="85" y2="118" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
          {/* Transformer humming vibration */}
          <rect x="77" y="118" width="16" height="28" fill="none" opacity="0">
            <animate attributeName="opacity" values="0;0.03;0" dur="0.1s" repeatCount="indefinite" />
          </rect>
          {[0,1,2,3].map((j) => (
            <g key={j}>
              <line x1={79+j} y1={140-j*6} x2={91-j} y2={140-j*6}
                stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
              {j<3 && (
                <line x1={80+j} y1={140-j*6} x2={90-j-1} y2={134-j*6}
                  stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
              )}
            </g>
          ))}
          <line x1="72" y1="124" x2="98" y2="124" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <line x1="75" y1="129" x2="95" y2="129" stroke="rgba(255,255,255,0.13)" strokeWidth="0.8" />
          {/* Lightning bolt accent */}
          <path d="M82,120 L85,116 L88,120 L86,120 L89,116" fill="none"
            stroke={T.goldLight} strokeWidth="0.4" opacity="0.2" />
          {/* Insulators */}
          {[73,85,97].map((ix) => (
            <g key={ix}>
              <circle cx={ix} cy="124" r="2" fill={T.blue} />
              <ellipse cx={ix} cy="125.5" rx="1.5" ry="0.5" fill="rgba(255,255,255,0.07)" />
              <ellipse cx={ix} cy="126.5" rx="1.2" ry="0.4" fill="rgba(255,255,255,0.05)" />
            </g>
          ))}
        </g>
        {/* Grid frequency indicator */}
        <g opacity="0.38">
          <rect x="22" y="82" width="28" height="10" rx="2" fill={T.navy}
            stroke={T.greenLight} strokeWidth="0.4" />
          <text x="36" y="88" textAnchor="middle" fill={T.greenLight}
            fontSize="4" fontFamily="Calibri, sans-serif" fontWeight="700">50.00</text>
          <text x="36" y="91" textAnchor="middle" fill={T.midGray}
            fontSize="2.5" fontFamily="Calibri, sans-serif">Hz</text>
        </g>
        <text x="55" y="90" fill={T.midGray} fontSize="6"
          fontFamily="Calibri, sans-serif" fontWeight="700">110 kV</text>
      </g>

      {/* Transformer + switchgear */}
      <g filter="url(#shadow)">
        <rect x="108" y="158" width="28" height="22" rx="2.5" fill={T.navy}
          stroke={T.gold} strokeWidth="1.2" />
        {/* Humming animation */}
        <rect x="107" y="157" width="30" height="24" rx="3" fill="none"
          stroke={T.goldLight} strokeWidth="0.3" opacity="0">
          <animate attributeName="opacity" values="0;0.08;0;0.08;0"
            dur="0.2s" repeatCount="indefinite" />
        </rect>
        <circle cx="118" cy="168" r="5" fill="none" stroke={T.gold} strokeWidth="0.7" opacity="0.3" />
        <circle cx="128" cy="168" r="5" fill="none" stroke={T.gold} strokeWidth="0.7" opacity="0.3" />
        {[114,122,130].map((x) => (
          <rect key={x} x={x} y="155" width="2.5" height="4" rx="0.5" fill={T.blue} />
        ))}
        <text x="122" y="177" textAnchor="middle" fill={T.goldLight}
          fontSize="4.5" fontFamily="Calibri, sans-serif" fontWeight="700">TRAFO</text>
      </g>
      <g opacity="0.72">
        <rect x="108" y="182" width="12" height="8" rx="1" fill={T.navy}
          stroke={T.gold} strokeWidth="0.3" />
        <text x="114" y="188" textAnchor="middle" fill={T.goldLight}
          fontSize="3.5" fontFamily="Calibri, sans-serif" fontWeight="700">SF₆</text>
      </g>

      {/* Bidirectional grid meter */}
      <g>
        <rect x="122" y="184" width="16" height="9" rx="2" fill={T.navy}
          stroke={T.gold} strokeWidth="0.4" opacity="0.8" />
        <text x="130" y="190" textAnchor="middle" fill={T.goldLight}
          fontSize="3" fontFamily="Calibri, sans-serif" fontWeight="700">⇄</text>
        <path d="M124,188 L127,186.5 L127,189.5 Z" fill={T.greenLight} opacity="0.4">
          <animate attributeName="opacity" values="0.2;0.65;0.2" dur="1.5s" repeatCount="indefinite" />
        </path>
        <path d="M136,188 L133,186.5 L133,189.5 Z" fill={T.gold} opacity="0.4">
          <animate attributeName="opacity" values="0.2;0.65;0.2" dur="1.5s" repeatCount="indefinite"
            begin="0.75s" />
        </path>
      </g>

      {/* Power flow to BESS */}
      <defs>
        <path id="tflow" d="M136,168 Q146,168 154,162" />
      </defs>
      <use href="#tflow" fill="none" stroke={T.gold} strokeWidth="2" opacity="0.2" />
      <FlowParticles pathId="tflow" color={T.goldLight} count={2} dur={1.5} glow />

      {/* BESS landscape area */}
      <g>
        <ellipse cx="210" cy="220" rx="85" ry="50" fill={T.forest} opacity="0.12" />
        <ellipse cx="210" cy="220" rx="72" ry="40" fill={T.forestMid} opacity="0.08" />

        {/* Perimeter security fence */}
        <path d="M145,185 Q145,148 210,138 Q275,148 280,185 Q282,248 210,258 Q140,248 145,185"
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="2,2" />

        {/* Security camera with sweep */}
        <g opacity="0.3">
          <line x1="280" y1="148" x2="285" y2="145" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
          <rect x="284" y="143" width="3" height="2" rx="0.4" fill="rgba(255,255,255,0.12)" />
          {/* Sweep arc */}
          <path d="M287,144 L295,138 L295,150 Z" fill={T.goldLight} opacity="0">
            <animate attributeName="opacity" values="0;0.04;0" dur="4s" repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="rotate"
              values="0 287 144;-30 287 144;0 287 144" dur="4s" repeatCount="indefinite" />
          </path>
          <circle cx="286" cy="144" r="0.8" fill="rgba(255,80,80,0.3)">
            <animate attributeName="opacity" values="0.15;0.5;0.15" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Maintenance walkways */}
        {[0,1,2,3,4].map((row) => (
          <line key={row} x1="148" y1={153+row*18} x2="298" y2={153+row*18}
            stroke="rgba(255,255,255,0.025)" strokeWidth="3" />
        ))}

        {/* Cooling tower silhouette */}
        <g opacity="0.2">
          <path d="M148,152 L152,136 L160,136 L158,152" fill={T.navyMid}
            stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
          <ellipse cx="155" cy="136" rx="4" ry="1.5" fill={T.navyMid}
            stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
          {/* Cooling water pipes */}
          <line x1="152" y1="152" x2="150" y2="160" stroke={T.coolBlue}
            strokeWidth="0.5" opacity="0.3" />
          <line x1="158" y1="152" x2="160" y2="160" stroke={T.coolBlue}
            strokeWidth="0.5" opacity="0.3" />
        </g>

        {/* 30 containers with numbering */}
        {[0,1,2,3,4].map((row) =>
          [0,1,2,3,4,5].map((col) => {
            const x = 150+col*24;
            const y = 143+row*18;
            const num = row*6+col+1;
            const fillH = 3+(num%5)*2;
            return (
              <g key={`${row}-${col}`}>
                <rect x={x+1.5} y={y+1.5} width="20" height="14" rx="1.5" fill="rgba(0,0,0,0.15)" />
                <rect x={x} y={y} width="20" height="14" rx="1.5"
                  fill={T.green} opacity={0.25+(row+col)*0.02}
                  stroke={T.greenLight} strokeWidth="0.45" />
                <path d={`M${x+20},${y} L${x+22},${y-1.5} L${x+22},${y+12.5} L${x+20},${y+14}`}
                  fill={T.forestMid} opacity="0.2" />
                {/* Thermal vent */}
                <rect x={x+15} y={y+1} width="3" height="2" rx="0.3" fill="rgba(255,255,255,0.025)" />
                {/* Animated SoC fill */}
                <rect x={x+6} y={y+14-fillH} width="8" height={fillH} rx="0.5"
                  fill={T.greenLight} opacity="0.15">
                  <animate attributeName="height" values={`${fillH-2};${fillH+2};${fillH-2}`}
                    dur={`${3+row*0.5+col*0.3}s`} repeatCount="indefinite" />
                  <animate attributeName="y"
                    values={`${y+14-fillH+2};${y+14-fillH-2};${y+14-fillH+2}`}
                    dur={`${3+row*0.5+col*0.3}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.1;0.25;0.1"
                    dur={`${3+row*0.5+col*0.3}s`} repeatCount="indefinite" />
                </rect>
                <circle cx={x+17} cy={y+3.5} r="1" fill={T.greenLight} opacity="0.42">
                  <animate attributeName="opacity" values="0.2;0.8;0.2"
                    dur={`${1.5+row*0.15+col*0.12}s`} repeatCount="indefinite" />
                </circle>
                {/* Container number 01-30 */}
                <text x={x+10} y={y+10} textAnchor="middle" fill={T.greenLight}
                  fontSize="3" fontFamily="Calibri, sans-serif" opacity="0.28">
                  {num<10?`0${num}`:num}
                </text>
              </g>
            );
          })
        )}

        {/* ARBITRAGE / FCR floating labels */}
        <g opacity="0.22">
          <rect x="150" y="134" width="24" height="6" rx="2" fill={T.navy}
            stroke={T.gold} strokeWidth="0.3" />
          <text x="162" y="138.5" textAnchor="middle" fill={T.goldLight}
            fontSize="3" fontFamily="Calibri, sans-serif" fontWeight="700">ARBITRAGE</text>
        </g>
        <g opacity="0.2">
          <rect x="246" y="134" width="16" height="6" rx="2" fill={T.navy}
            stroke={T.greenLight} strokeWidth="0.3" />
          <text x="254" y="138.5" textAnchor="middle" fill={T.greenLight}
            fontSize="3" fontFamily="Calibri, sans-serif" fontWeight="700">FCR</text>
        </g>

        {/* Monitoring antenna */}
        <g opacity="0.28">
          <line x1="290" y1="145" x2="290" y2="135" stroke="rgba(255,255,255,0.22)" strokeWidth="0.5" />
          <circle cx="290" cy="134" r="1.2" fill="rgba(100,200,255,0.22)">
            <animate attributeName="opacity" values="0.15;0.45;0.15" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="290" cy="134" r="3" fill="none" stroke="rgba(100,200,255,0.1)" strokeWidth="0.3">
            <animate attributeName="r" values="2;7;2" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.12;0;0.12" dur="3s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Energy flow to BESS */}
        <defs>
          <path id="gridToBess" d="M136,162 Q145,180 155,190" />
          <path id="gridToBess2" d="M136,162 Q170,170 200,180" />
        </defs>
        {["gridToBess","gridToBess2"].map((id,i) => (
          <g key={id}>
            <use href={`#${id}`} fill="none" stroke={T.greenLight} strokeWidth="0.6" opacity="0.12" />
            <FlowParticles pathId={id} color={T.greenLight} count={3} dur={2+i*0.5} r={1.8} glow />
          </g>
        ))}

        {/* Fire suppression ring */}
        <path d="M148,260 Q150,265 210,268 Q270,265 275,260"
          fill="none" stroke="rgba(255,80,80,0.15)" strokeWidth="1.5" strokeDasharray="4,4" />
      </g>

      {/* MW/MWh status display prominently */}
      <g filter="url(#glow)">
        <rect x="308" y="248" width="80" height="30" rx="6" fill={T.navy}
          stroke={T.green} strokeWidth="1.2" />
        <text x="348" y="263" textAnchor="middle" fill={T.greenLight}
          fontSize="11" fontFamily="Calibri, sans-serif" fontWeight="700">{KPI.bess.power}</text>
        <text x="348" y="273" textAnchor="middle" fill={T.midGray}
          fontSize="5.5" fontFamily="Calibri, sans-serif">{KPI.bess.capacity} · {KPI.bess.rendite}</text>
      </g>

      {/* SCADA monitoring */}
      <InfoPanel x={306} y={128} w={82} h={30} title="SCADA / MONITORING" color={T.greenLight}>
        <rect x="312" y="144" width="70" height="8" rx="1.5" fill="rgba(0,0,0,0.25)" />
        <polyline
          points="315,149 320,147 325,148 330,145 335,147 340,146 345,148 350,145 355,147 360,148 365,146 370,148 375,147 378,149"
          fill="none" stroke={T.greenLight} strokeWidth="0.6" opacity="0.5">
          <animate attributeName="points"
            values="315,149 320,147 325,148 330,145 335,147 340,146 345,148 350,145 355,147 360,148 365,146 370,148 375,147 378,149;315,148 320,148 325,146 330,147 335,145 340,148 345,146 350,147 355,145 360,147 365,148 370,146 375,148 378,148;315,149 320,147 325,148 330,145 335,147 340,146 345,148 350,145 355,147 360,148 365,146 370,148 375,147 378,149"
            dur="3s" repeatCount="indefinite" />
        </polyline>
      </InfoPanel>

      {/* Revenue stream cards */}
      <g>
        {KPI.bess.streams.map(({title,sub},i) => {
          const streamColors = [T.gold, T.greenLight, T.midGray];
          const color = streamColors[i] || T.midGray;
          const x = 306, y = 165 + i * 25;
          return (
          <g key={i}>
            <rect x={x} y={y} width="80" height="20" rx="4.5"
              fill={T.navy} stroke={color} strokeWidth="0.6" opacity="0.94" />
            <circle cx={x+10} cy={y+10} r="4.5" fill={color} opacity="0.15" />
            <text x={x+10} y={y+12.5} textAnchor="middle" fill={color}
              fontSize="5.5" fontFamily="Georgia, serif" fontWeight="700">{i+1}</text>
            <text x={x+19} y={y+8} fill={color}
              fontSize="5.5" fontFamily="Calibri, sans-serif" fontWeight="700">{title}</text>
            <text x={x+19} y={y+15.5} fill={T.midGray}
              fontSize="3.5" fontFamily="Calibri, sans-serif">{sub}</text>
          </g>
        );
        })}
      </g>

      {/* Revenue ticker */}
      <g opacity="0.52">
        <rect x="306" y="238" width="80" height="5" rx="2" fill="rgba(0,0,0,0.15)" />
        <rect x="306" y="238" width="0" height="5" rx="2" fill={T.gold} opacity="0.12">
          <animate attributeName="width" values="0;80;0" dur="10s" repeatCount="indefinite" />
        </rect>
        <text x="346" y="242" textAnchor="middle" fill={T.goldLight}
          fontSize="3" fontFamily="Calibri, sans-serif">REVENUE ▶ {KPI.bess.revenueRange}</text>
      </g>

      <PhaseBadge x={12} y={8} num="VI" icon="bolt" label="BESS" color={T.greenLight} />
      <Atmosphere />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   GESAMTERGEBNIS — Full transformation
   ══════════════════════════════════════════════════════════════════ */
export function GesamtVisual() {
  const T = useTheme();
  return (
    <>
      <ValleyBg />
      <SiteBase solar heat>
        {/* Golden shimmer overlay (celebration) */}
        <rect x="80" y="110" width="250" height="170" rx="10"
          fill="url(#sunScatter)" opacity="0.5">
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="5s" repeatCount="indefinite" />
        </rect>

        {/* 95% AUTARKIE watermark */}
        <g opacity="0.055" transform="rotate(-30 200 190)">
          <text x="100" y="210" fill={T.gold} fontSize="24" fontFamily="Calibri, sans-serif"
            fontWeight="700" letterSpacing="2">95% AUTARKIE</text>
        </g>

        {/* Golden sparkle particles */}
        {Array.from({ length: 12 }, (_,i) => {
          const GA = 2.39996;
          const sx = 120+((i*GA*50)%160);
          const sy = 130+((i*GA*30)%120);
          return (
            <g key={`sp${i}`}>
              <circle cx={sx} cy={sy} r="1" fill={T.goldLight} opacity="0">
                <animate attributeName="opacity"
                  values="0;0;0.4;0" dur={`${4+i*0.5}s`} repeatCount="indefinite"
                  begin={`${i*0.4}s`} />
                <animate attributeName="r" values="0;2;0"
                  dur={`${4+i*0.5}s`} repeatCount="indefinite" begin={`${i*0.4}s`} />
              </circle>
              <line x1={sx-1.5} y1={sy} x2={sx+1.5} y2={sy} stroke={T.goldLight} strokeWidth="0.3" opacity="0">
                <animate attributeName="opacity" values="0;0;0.35;0"
                  dur={`${4+i*0.5}s`} repeatCount="indefinite" begin={`${i*0.4}s`} />
              </line>
              <line x1={sx} y1={sy-1.5} x2={sx} y2={sy+1.5} stroke={T.goldLight} strokeWidth="0.3" opacity="0">
                <animate attributeName="opacity" values="0;0;0.35;0"
                  dur={`${4+i*0.5}s`} repeatCount="indefinite" begin={`${i*0.4}s`} />
              </line>
            </g>
          );
        })}

        {/* Carports with solar */}
        <g>
          <path d="M108,206 L110,199 L158,199 L160,206 Z" fill="url(#solarGrad)" opacity="0.72" />
          <rect x="108" y="206" width="52" height="2" fill={T.goldDim} opacity="0.42" />
          {[111,126,141,157].map((xp) => (
            <line key={xp} x1={xp} y1="208" x2={xp} y2="230"
              stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          ))}
          <Car x={113} y={216} color="rgba(100,180,255,0.1)" s={0.7} />
          <Car x={127} y={216} s={0.7} suv />
          <Car x={141} y={216} color="rgba(180,255,180,0.08)" s={0.7} />
        </g>
        <g>
          <path d="M265,199 L267,192 L310,192 L312,199 Z" fill="url(#solarGrad)" opacity="0.72" />
          <rect x="265" y="199" width="47" height="2" fill={T.goldDim} opacity="0.42" />
          {[268,282,296,310].map((xp) => (
            <line key={xp} x1={xp} y1="201" x2={xp} y2="228"
              stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          ))}
        </g>

        {/* Solar shimmer on all roofs */}
        {[[170,144],[228,138],[175,176],[228,176],[278,150],[134,200],[288,194]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="0" fill={T.goldLight} opacity="0">
            <animate attributeName="r" values="0;8;0" dur={`${3+i*0.6}s`} repeatCount="indefinite"
              begin={`${i*0.4}s`} />
            <animate attributeName="opacity" values="0;0.1;0" dur={`${3+i*0.6}s`} repeatCount="indefinite"
              begin={`${i*0.4}s`} />
          </circle>
        ))}

        {/* On-site BESS */}
        <g>
          {[0,1,2,3,4].map((i) => {
            const bx = 118+i*17;
            const by = 244;
            const charge = 60+(i*17%35);
            const barH = (charge/100)*10;
            return (
              <g key={i}>
                <rect x={bx} y={by} width="14" height="10" rx="1.5"
                  fill={T.green} opacity="0.47" stroke={T.greenLight} strokeWidth="0.5" />
                <path d={`M${bx+14},${by} L${bx+16},${by-1} L${bx+16},${by+9} L${bx+14},${by+10}`}
                  fill={T.forestMid} opacity="0.25" />
                {/* Glow */}
                <rect x={bx-1} y={by-1} width="16" height="12" rx="2.5"
                  fill={T.greenLight} opacity="0">
                  <animate attributeName="opacity" values="0;0.09;0"
                    dur={`${2+i*0.3}s`} repeatCount="indefinite" />
                </rect>
                <rect x={bx+10} y={by+10-barH} width="2.5" height={barH} rx="0.5"
                  fill={T.greenLight} opacity="0.62" />
                <circle cx={bx+3} cy={by+2.5} r="1" fill={T.greenLight}>
                  <animate attributeName="opacity" values="0.3;0.9;0.3"
                    dur={`${1.5+i*0.2}s`} repeatCount="indefinite" />
                </circle>
                <text x={bx+7} y={by+7} textAnchor="middle" fill={T.greenLight}
                  fontSize="3.5" fontFamily="Calibri, sans-serif" fontWeight="700" opacity="0.52">
                  {charge}%
                </text>
              </g>
            );
          })}
          <text x="160" y="260" textAnchor="middle" fill={T.greenLight}
            fontSize="4" fontFamily="Calibri, sans-serif" fontWeight="700" opacity="0.52">6,5–11 MWh</text>
        </g>

        {/* Heat network */}
        <defs>
          <path id="ghp1" d="M170,172 L170,195 L232,195 L232,172" />
          <path id="ghp2" d="M200,195 L200,210" />
          <path id="ghp3" d="M170,195 L140,195 L140,180" />
        </defs>
        {["ghp1","ghp2","ghp3"].map((id,i) => (
          <g key={id}>
            <use href={`#${id}`} fill="none" stroke={T.warmOrange} strokeWidth="3"
              opacity="0.12" strokeLinecap="round" />
            <use href={`#${id}`} fill="none" stroke={T.warmOrangeLight} strokeWidth="0.8"
              opacity="0.27" strokeDasharray="3,4" strokeLinecap="round">
              <animate attributeName="strokeDashoffset" values="0;-14" dur="2.5s" repeatCount="indefinite" />
            </use>
            <FlowParticles pathId={id} color={T.warmOrangeLight} count={2} dur={3+i*0.5} r={1.5} />
          </g>
        ))}
        {/* WP unit compact */}
        <g>
          <rect x="195" y="166" width="12" height="10" rx="2" fill={T.navy}
            stroke={T.warmOrange} strokeWidth="0.6" />
          <text x="201" y="174" textAnchor="middle" fill={T.warmOrangeLight}
            fontSize="3.5" fontFamily="Calibri, sans-serif" fontWeight="700">WP</text>
        </g>

        {/* EV charging stations */}
        {[0,1,2,3].map((i) => (
          <g key={`ac${i}`}>
            <rect x={272+i*9} y="215" width="5" height="8" rx="1"
              fill={T.navy} stroke={T.greenLight} strokeWidth="0.4" />
            <circle cx={274.5+i*9} cy="221" r="0.7" fill={T.greenLight}>
              <animate attributeName="opacity" values="0.3;1;0.3"
                dur={`${1+i*0.15}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
        <Car x={273} y={225} color="rgba(100,180,255,0.1)" s={0.7} />
        <Car x={285} y={225} s={0.7} />
      </SiteBase>

      {/* EMS central hub */}
      <g filter="url(#glow)">
        <rect x="180" y="130" width="40" height="22" rx="5" fill={T.navy}
          stroke={T.gold} strokeWidth="1.2" />
        <rect x="184" y="134" width="32" height="14" rx="2" fill="rgba(0,0,0,0.3)" />
        {Array.from({ length: 6 }, (_,i) => {
          const bh = 2+((i*3+1)%6);
          return (
            <rect key={i} x={186+i*5} y={146-bh} width="3" height={bh}
              fill={i<3?T.gold:T.greenLight} opacity="0.52" rx="0.3">
              <animate attributeName="height" values={`${bh};${bh+2};${bh}`}
                dur={`${1.8+i*0.15}s`} repeatCount="indefinite" />
              <animate attributeName="y" values={`${146-bh};${144-bh};${146-bh}`}
                dur={`${1.8+i*0.15}s`} repeatCount="indefinite" />
            </rect>
          );
        })}
        <text x="200" y="150" textAnchor="middle" fill={T.goldLight}
          fontSize="6" fontFamily="Calibri, sans-serif" fontWeight="700">EMS</text>
      </g>

      {/* Energy flow paths with label badges */}
      <defs>
        <path id="gf_pv" d="M220,155 Q225,148 220,140 Q215,135 210,140" />
        <path id="gf_bess" d="M200,152 Q195,200 165,244" />
        <path id="gf_charge" d="M220,148 Q260,180 280,215" />
        <path id="gf_grid" d="M190,140 Q120,130 85,125" />
        <path id="gf_prod" d="M210,155 Q215,160 220,168" />
      </defs>
      {[
        ["gf_pv",T.goldLight,"PV→EMS",2,2,true],
        ["gf_bess",T.greenLight,"EMS→BESS",3,1.8,true],
        ["gf_charge",T.greenLight,"EMS→EV",3.5,1.5,false],
        ["gf_grid",T.goldLight,"Netz↔EMS",3,1.8,false],
        ["gf_prod",T.goldLight,"EMS→Prod",2,1.5,false],
      // eslint-disable-next-line no-unused-vars
      ].map(([id,col,_label,dur,r,glow],_i) => (
        <g key={id}>
          <use href={`#${id}`} fill="none" stroke={col} strokeWidth="1" opacity="0.08" />
          <FlowParticles pathId={id} color={col} count={3} dur={dur} r={r} glow={glow} />
        </g>
      ))}

      {/* Flow label badges */}
      <g opacity="0.4">
        <rect x="225" y="142" width="20" height="5" rx="2" fill={T.navy} stroke={T.gold} strokeWidth="0.3" />
        <text x="235" y="145.8" textAnchor="middle" fill={T.goldLight}
          fontSize="2.5" fontFamily="Calibri, sans-serif">PV→EMS</text>
        <rect x="165" y="195" width="22" height="5" rx="2" fill={T.navy}
          stroke={T.greenLight} strokeWidth="0.3" />
        <text x="176" y="198.8" textAnchor="middle" fill={T.greenLight}
          fontSize="2.5" fontFamily="Calibri, sans-serif">EMS→BESS</text>
        <rect x="100" y="125" width="22" height="5" rx="2" fill={T.navy} stroke={T.gold} strokeWidth="0.3" />
        <text x="111" y="128.8" textAnchor="middle" fill={T.goldLight}
          fontSize="2.5" fontFamily="Calibri, sans-serif">Netz↔EMS</text>
      </g>

      {/* Connection pulse */}
      {[[200,152],[210,140],[190,140]].map(([px,py],i) => (
        <circle key={`pulse${i}`} cx={px} cy={py} r="0" fill={T.gold} opacity="0">
          <animate attributeName="r" values="0;6;0" dur={`${3+i}s`} repeatCount="indefinite"
            begin={`${i*0.8}s`} />
          <animate attributeName="opacity" values="0;0.09;0" dur={`${3+i}s`} repeatCount="indefinite"
            begin={`${i*0.8}s`} />
        </circle>
      ))}

      {/* 110kV Grid */}
      <g opacity="0.62">
        <line x1="12" y1="105" x2="78" y2="125" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <line x1="76" y1="133" x2="82" y2="118" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <line x1="88" y1="133" x2="82" y2="118" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <line x1="73" y1="120" x2="91" y2="120" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
        <circle cx="73" cy="120" r="1.5" fill={T.blue} />
        <circle cx="91" cy="120" r="1.5" fill={T.blue} />
        <text x="42" y="102" fill={T.midGray} fontSize="4.5"
          fontFamily="Calibri, sans-serif" fontWeight="700">110 kV</text>
      </g>

      {/* External BESS 100MW/200MWh */}
      <g>
        <ellipse cx="62" cy="195" rx="42" ry="30" fill={T.forest} opacity="0.1" />
        <Pine x={25} y={178} h={5.5} opacity={0.3} />
        <Pine x={100} y={176} h={6} opacity={0.3} />
        <Pine x={22} y={210} h={5} opacity={0.25} />
        <Pine x={102} y={212} h={5.5} opacity={0.25} />

        {[0,1,2,3].map((row) =>
          [0,1,2].map((col) => {
            const cx = 35+col*19;
            const cy = 170+row*14;
            const charge = 50+((row*3+col)*13)%45;
            const barH = (charge/100)*9;
            return (
              <g key={`e${row}-${col}`}>
                <rect x={cx} y={cy} width="15" height="10" rx="1.5"
                  fill={T.green} opacity={0.3+row*0.03} stroke={T.greenLight} strokeWidth="0.4" />
                {/* Glow */}
                <rect x={cx-0.5} y={cy-0.5} width="16" height="11" rx="2"
                  fill={T.greenLight} opacity="0">
                  <animate attributeName="opacity" values="0;0.07;0"
                    dur={`${2.5+row*0.3+col*0.2}s`} repeatCount="indefinite" />
                </rect>
                <rect x={cx+11.5} y={cy+10-barH} width="2" height={barH} rx="0.5"
                  fill={T.greenLight} opacity="0.57">
                  <animate attributeName="height" values={`${barH-0.5};${barH+1};${barH-0.5}`}
                    dur={`${3+row*0.4+col*0.3}s`} repeatCount="indefinite" />
                </rect>
                <circle cx={cx+3} cy={cy+2.5} r="0.8" fill={T.greenLight}>
                  <animate attributeName="opacity" values="0.3;0.8;0.3"
                    dur={`${1.5+row*0.12+col*0.1}s`} repeatCount="indefinite" />
                </circle>
              </g>
            );
          })
        )}

        <defs>
          <path id="gf_ext2" d="M82,135 Q72,155 55,170" />
          <path id="gf_rev" d="M70,175 Q76,150 82,135" />
        </defs>
        <use href="#gf_ext2" fill="none" stroke={T.greenLight} strokeWidth="0.8" opacity="0.08" />
        <FlowParticles pathId="gf_ext2" color={T.greenLight} count={3} dur={2.5} r={1.8} glow />
        <use href="#gf_rev" fill="none" stroke={T.gold} strokeWidth="0.6" opacity="0.06" />
        <FlowParticles pathId="gf_rev" color={T.goldLight} count={2} dur={4} r={1.5} />

        {/* Signage */}
        <rect x="30" y="225" width="58" height="18" rx="3" fill={T.navy} opacity="0.72"
          stroke={T.greenLight} strokeWidth="0.4" />
        <text x="59" y="233" textAnchor="middle" fill={T.greenLight}
          fontSize="4.5" fontFamily="Calibri, sans-serif" fontWeight="700">{KPI.gesamt.bessLabel}</text>
        <text x="59" y="240" textAnchor="middle" fill={T.midGray}
          fontSize="3.5" fontFamily="Calibri, sans-serif">Graustrom-BESS</text>

        {/* Profit counter animation */}
        <g opacity="0.55">
          <rect x="30" y="244" width="58" height="9" rx="2" fill={T.navy}
            stroke={T.gold} strokeWidth="0.4" />
          <text x="44" y="249" fill={T.goldLight} fontSize="3.5"
            fontFamily="Calibri, sans-serif" fontWeight="700">€</text>
          <rect x="50" y="245" width="35" height="7" rx="1" fill="rgba(0,0,0,0.2)" />
          <rect x="50" y="245" width="0" height="7" rx="1" fill={T.gold} opacity="0.15">
            <animate attributeName="width" values="0;35;35;0" dur="8s" repeatCount="indefinite" />
          </rect>
          <text x="67" y="250" textAnchor="middle" fill={T.goldLight}
            fontSize="3" fontFamily="Calibri, sans-serif">{KPI.gesamt.bessRevenueLabel}</text>
        </g>
      </g>

      {/* Golden sun with radiating light */}
      <g>
        {/* Outer glow */}
        <circle cx="355" cy="80" r="24" fill={T.gold} opacity="0.04">
          <animate attributeName="r" values="20;28;20" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.03;0.07;0.03" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="355" cy="80" r="14" fill={T.gold} opacity="0.07" />
        <circle cx="355" cy="80" r="8" fill={T.goldLight} opacity="0.18" />
        <circle cx="355" cy="80" r="4.5" fill={T.goldLight} opacity="0.38" />
        {/* Lens flares */}
        <circle cx="335" cy="93" r="3" fill={T.goldLight} opacity="0.045" />
        <circle cx="320" cy="103" r="5" fill={T.goldLight} opacity="0.025" />
        {/* Rays */}
        {Array.from({ length: 14 }, (_,i) => {
          const a = (i/14)*Math.PI*2;
          return (
            <line key={i}
              x1={355+Math.cos(a)*17} y1={80+Math.sin(a)*17}
              x2={355+Math.cos(a)*24} y2={80+Math.sin(a)*24}
              stroke={T.goldLight} strokeWidth="0.7" opacity="0.12" strokeLinecap="round">
              <animate attributeName="opacity" values="0.06;0.22;0.06"
                dur={`${2.5+(i%3)*0.4}s`} repeatCount="indefinite" />
            </line>
          );
        })}
        {/* Rays to all systems */}
        {/* eslint-disable-next-line no-unused-vars */}
        {[[200,130,"EMS"],[160,244,"BESS"],[280,215,"EV"]].map(([tx,ty,_sys],i) => (
          <line key={`sr${i}`} x1={350-i*5} y1={84+i*2} x2={tx} y2={ty}
            stroke={T.goldLight} strokeWidth="0.25" opacity="0.04" strokeDasharray="6,12">
            <animate attributeName="opacity" values="0.01;0.07;0.01"
              dur={`${5+i*1.5}s`} repeatCount="indefinite" />
          </line>
        ))}
      </g>

      {/* System KPI labels */}
      <g>
        {KPI.gesamt.systemKPIs.map(({icon,text},i) => {
          const kpiColors = [T.gold, T.greenLight, T.warmOrange, T.greenLight, T.goldLight];
          const col = kpiColors[i] || T.goldLight;
          const x = 325, y = 138 + i * 16;
          return (
          <g key={i}>
            <rect x={x} y={y-6} width={text.length*4.8+16} height="13" rx="6.5"
              fill={T.navy} stroke={col} strokeWidth="0.4" opacity="0.93" />
            <SvgIcon name={icon} x={x+8} y={y} size={7} color={col} />
            <text x={x+14} y={y+1.5} fill={col}
              fontSize="5" fontFamily="Calibri, sans-serif" fontWeight="700">{text}</text>
          </g>
        );
        })}
      </g>

      {/* CO2 counter ticking down */}
      <g>
        <rect x="325" y="210" width="64" height="16" rx="4" fill={T.navy} opacity="0.87"
          stroke={T.greenLight} strokeWidth="0.4" />
        <SvgIcon name="leaf" x={333} y={217} size={5} color={T.greenLight} />
        <text x="340" y="221" fill={T.greenLight}
          fontSize="5.5" fontFamily="Calibri, sans-serif" fontWeight="700">{KPI.gesamt.co2Total}</text>
        <text x="376" y="221" fill={T.midGray}
          fontSize="3.5" fontFamily="Calibri, sans-serif">CO₂/a</text>
        {/* Ticking animation hint */}
        <rect x="326" y="224" width="62" height="1.5" rx="0.5" fill="rgba(0,0,0,0.15)" />
        <rect x="326" y="224" width="62" height="1.5" rx="0.5" fill={T.greenLight} opacity="0.12">
          <animate attributeName="width" values="62;30;62" dur="6s" repeatCount="indefinite" />
        </rect>
      </g>

      {/* Certificate / quality seal */}
      <g opacity="0.55" filter="url(#softGlow)">
        <circle cx="346" cy="255" r="16" fill={T.navy} stroke={T.gold} strokeWidth="0.8" />
        <circle cx="346" cy="255" r="13" fill="none" stroke={T.gold} strokeWidth="0.3" opacity="0.4" />
        <SvgIcon name="trophy" x={346} y={248} size={8} color={T.gold} />
        <text x="346" y="258.5" textAnchor="middle" fill={T.goldLight}
          fontSize="3.5" fontFamily="Calibri, sans-serif" fontWeight="700">CERTIFIED</text>
        <text x="346" y="263.5" textAnchor="middle" fill={T.midGray}
          fontSize="2.8" fontFamily="Calibri, sans-serif">ISO 50001</text>
      </g>

      {/* Energy flow legend */}
      <g opacity="0.62">
        <rect x="12" y="260" width="65" height="42" rx="4" fill={T.navy} opacity="0.87"
          stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <text x="44" y="270" textAnchor="middle" fill={T.midGray}
          fontSize="3.5" fontFamily="Calibri, sans-serif" letterSpacing="1" fontWeight="700">ENERGIEFLÜSSE</text>
        {[
          [T.goldLight,"PV → Verbrauch"],
          [T.greenLight,"Speicher laden"],
          [T.warmOrangeLight,"Wärmenetz"],
          [T.goldLight,"Netz ↔ BESS"],
        ].map(([col,label],i) => (
          <g key={i}>
            <line x1="18" y1={278+i*6} x2="28" y2={278+i*6}
              stroke={col} strokeWidth="1.5" />
            <circle cx="23" cy={278+i*6} r="1.5" fill={col} opacity="0.62" />
            <text x="32" y={279.5+i*6} fill={T.midGray}
              fontSize="3.5" fontFamily="Calibri, sans-serif">{label}</text>
          </g>
        ))}
      </g>

      {/* Progress timeline */}
      <g>
        <line x1="100" y1="308" x2="310" y2="308" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
        <line x1="100" y1="308" x2="310" y2="308" stroke={T.gold} strokeWidth="0.8" opacity="0.1">
          <animate attributeName="x2" values="100;310" dur="3s" fill="freeze" />
        </line>
        {[["I","sun"],["II","sun"],["III","battery"],["IV","fire"],["V","plug"],["VI","bolt"]].map(([num],i) => (
          <g key={i}>
            <circle cx={118+i*36} cy="308" r="5" fill={T.gold} opacity={0.12+i*0.04}
              stroke={T.goldLight} strokeWidth="0.3" />
            <text x={118+i*36} y="310" textAnchor="middle" fill={T.goldLight}
              fontSize="4" fontFamily="Georgia, serif" fontWeight="700">{num}</text>
          </g>
        ))}
        <circle cx="330" cy="308" r="6" fill={T.gold} opacity="0.17"
          stroke={T.goldLight} strokeWidth="0.5" />
        <SvgIcon name="check" x={330} y={308} size={6} color={T.goldLight} />
      </g>

      <PhaseBadge x={12} y={8} num="∑" icon="trophy" label="GESAMT" color={T.gold} />
      <Atmosphere warm />
    </>
  );
}
