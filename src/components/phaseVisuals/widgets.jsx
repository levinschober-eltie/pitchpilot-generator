/**
 * PhaseVisuals — Widget components (Badge, InfoPanel, FlowParticles, CompassRose, SvgAutarkieRing)
 * Extracted from PhaseVisuals.jsx for maintainability.
 */
import { useTheme } from "../../ThemeContext";
import { SvgIcon } from "../Icons";

/* ── Callout badge ──────────────────────────────────────────── */
export function Badge({ x, y, text, sub, icon, color, align = "left", lineFrom }) {
  const T = useTheme();
  color = color ?? T.gold;
  const w = Math.max(text.length * 5.2 + (icon ? 14 : 8), sub ? sub.length * 3.8 + (icon ? 14 : 8) : 0, 42);
  const bx = align === "right" ? x - w - 2 : x + 2;
  return (
    <g>
      {lineFrom && (
        <g>
          <path d={`M${lineFrom[0]},${lineFrom[1]} L${lineFrom[0]},${y} L${align === "right" ? bx + w : bx},${y}`}
            fill="none" stroke={color} strokeWidth="0.5" opacity="0.2" />
          <circle cx={lineFrom[0]} cy={lineFrom[1]} r="1.5" fill={color} opacity="0.3" />
        </g>
      )}
      <rect x={bx} y={y - 10} width={w} height={sub ? 22 : 15} rx="5"
        fill={T.navy} opacity="0.94" stroke={color} strokeWidth="0.5" />
      <rect x={bx + 2} y={y - 10} width={w - 4} height="1.5" rx="0.5"
        fill={color} opacity="0.15" />
      {icon && <SvgIcon name={icon} x={bx + 6} y={y - 3} size={7} color={color} />}
      <text x={bx + (icon ? 14 : 5)} y={y - 0.5} fill={color}
        fontSize="5.8" fontFamily="Calibri, sans-serif" fontWeight="700" letterSpacing="0.3">{text}</text>
      {sub && <text x={bx + (icon ? 14 : 5)} y={y + 7.5} fill={T.midGray}
        fontSize="4.2" fontFamily="Calibri, sans-serif">{sub}</text>}
    </g>
  );
}

/* ── Phase number badge ─────────────────────────────────────── */
export function PhaseBadge({ x, y, num, icon, label, color }) {
  const T = useTheme();
  color = color ?? T.gold;
  return (
    <g>
      <rect x={x} y={y} width="58" height="17" rx="8.5" fill={T.navy} stroke={color} strokeWidth="0.9" opacity="0.96" />
      <text x={x + 10} y={y + 12} fill={color}
        fontSize="7.5" fontFamily="Georgia, serif" fontWeight="700">{num}</text>
      <SvgIcon name={icon} x={x + 22} y={y + 8.5} size={7} color={color} />
      <text x={x + 28} y={y + 12} fill={color}
        fontSize="4.8" fontFamily="Calibri, sans-serif" fontWeight="700" letterSpacing="0.6">{label}</text>
    </g>
  );
}

/* ── Flow particles with comet trail ────────────────────────── */
export function FlowParticles({ pathId, color, count = 3, dur = 3, r = 2, glow = false }) {
  const T = useTheme();
  color = color ?? T.gold;
  return (
    <g filter={glow ? "url(#softGlow)" : undefined}>
      {Array.from({ length: count }, (_, i) => {
        const pr = r * (0.75 + (i % 3) * 0.18);
        return (
          <g key={i}>
            <circle r={pr} fill={color} opacity="0">
              <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${(i / count) * dur}s`}>
                <mpath href={`#${pathId}`} xlinkHref={`#${pathId}`} />
              </animateMotion>
              <animate attributeName="opacity" values="0;0.85;0.85;0"
                dur={`${dur}s`} repeatCount="indefinite" begin={`${(i / count) * dur}s`} />
            </circle>
            {/* Comet tail */}
            <circle r={pr * 1.8} fill={color} opacity="0">
              <animateMotion dur={`${dur}s`} repeatCount="indefinite"
                begin={`${(i / count) * dur + 0.04}s`}>
                <mpath href={`#${pathId}`} xlinkHref={`#${pathId}`} />
              </animateMotion>
              <animate attributeName="opacity" values="0;0.2;0.2;0"
                dur={`${dur}s`} repeatCount="indefinite" begin={`${(i / count) * dur + 0.04}s`} />
            </circle>
          </g>
        );
      })}
    </g>
  );
}

/* ── Info panel ─────────────────────────────────────────────── */
export function InfoPanel({ x, y, w, h, title, color, children }) {
  const T = useTheme();
  color = color ?? T.gold;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="6" fill={T.navy} opacity="0.94"
        stroke={color} strokeWidth="0.5" />
      <rect x={x} y={y} width={w} height="12" rx="6" fill={color} opacity="0.08" />
      <rect x={x} y={y + 6} width={w} height="6" fill={color} opacity="0.08" />
      <text x={x + w / 2} y={y + 9} textAnchor="middle" fill={color}
        fontSize="4" fontFamily="Calibri, sans-serif" fontWeight="700" letterSpacing="1.5">{title}</text>
      <line x1={x + 4} y1={y + 13} x2={x + w - 4} y2={y + 13}
        stroke={color} strokeWidth="0.3" opacity="0.15" />
      {children}
    </g>
  );
}

/* ── Compass Rose ───────────────────────────────────────────── */
export function CompassRose({ x, y }) {
  const T = useTheme();
  return (
    <g opacity="0.35">
      <circle cx={x} cy={y} r="7" fill={T.navy} stroke={T.gold} strokeWidth="0.4" opacity="0.8" />
      <line x1={x} y1={y - 5.5} x2={x} y2={y + 5.5} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <line x1={x - 5.5} y1={y} x2={x + 5.5} y2={y} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <path d={`M${x},${y - 6} L${x - 1.2},${y} L${x},${y + 6} L${x + 1.2},${y} Z`}
        fill={T.gold} opacity="0.5" />
      <path d={`M${x},${y - 6} L${x + 1.2},${y} L${x},${y + 6} L${x - 1.2},${y} Z`}
        fill="rgba(255,255,255,0.12)" />
      {[["N",x,y-8.5],["S",x,y+10],["E",x+9,y+1.5],["W",x-9,y+1.5]].map(([l,lx,ly]) => (
        <text key={l} x={lx} y={ly} textAnchor="middle" fill={l==="N" ? T.gold : T.midGray}
          fontSize="3" fontFamily="Calibri, sans-serif" fontWeight="700">{l}</text>
      ))}
    </g>
  );
}

/* ── SVG Autarkie Ring ──────────────────────────────────────── */
export function SvgAutarkieRing({ cx, cy, score, size = 36 }) {
  const T = useTheme();
  const r = size / 2 - 3;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <g>
      <circle cx={cx} cy={cy} r={size / 2 + 4} fill={T.navy} opacity="0.87" />
      <circle cx={cx} cy={cy} r={size / 2 + 4} fill="none" stroke={T.gold} strokeWidth="0.4" opacity="0.16" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth="3.5"
        stroke={T.gold} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}>
        <animate attributeName="stroke-dashoffset" from={circ} to={offset} dur="1.2s" fill="freeze" />
      </circle>
      {/* Glow ring */}
      <circle cx={cx} cy={cy} r={r + 1} fill="none" strokeWidth="1"
        stroke={T.gold} opacity="0.06"
        strokeDasharray={circ * 1.07}
        strokeDashoffset={circ * 1.07 - (score / 100) * circ * 1.07}
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 1} textAnchor="middle" fill={T.goldLight}
        fontSize="10" fontFamily="Calibri, sans-serif" fontWeight="700">{score}%</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill={T.midGray}
        fontSize="3.5" fontFamily="Calibri, sans-serif" letterSpacing="1">AUTARKIE</text>
    </g>
  );
}
