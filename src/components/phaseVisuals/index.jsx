/**
 * PhaseVisuals — Main entry (memo'd default export)
 * Extracted from PhaseVisuals.jsx for maintainability.
 */
import { memo, useEffect, useRef } from "react";
import { SharedDefs } from "./primitives";
import { SvgAutarkieRing } from "./widgets";
import {
  AnalyseVisual, PVVisual, SpeicherVisual,
  WaermeVisual, LadeVisual, BESSVisual, GesamtVisual,
} from "./phases";

/* ── Export map ─────────────────────────────────────────────── */
const visuals = {
  "I": AnalyseVisual, "II": PVVisual, "III": SpeicherVisual,
  "IV": WaermeVisual, "V": LadeVisual, "VI": BESSVisual, "∑": GesamtVisual,
};

/* ── Main export ────────────────────────────────────────────── */
function PhaseVisualInner({ phaseNum, score = 0 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const svg = svgRef.current;
      if (!svg) return;
      if (mq.matches) {
        svg.pauseAnimations?.();
      } else {
        svg.unpauseAnimations?.();
      }
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const Visual = visuals[phaseNum];
  if (!Visual) return null;
  const warm = phaseNum === "II" || phaseNum === "∑";
  const cool = phaseNum === "VI";
  return (
    <div style={{
      width: "100%", margin: "0",
      borderRadius: "14px", overflow: "hidden",
      background: "linear-gradient(150deg, rgba(27,42,74,0.75), rgba(30,48,80,0.45), rgba(37,55,87,0.2))",
      border: "1px solid rgba(212,168,67,0.08)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.02)",
    }}>
      <svg ref={svgRef} viewBox="0 0 400 320" style={{ width: "100%", height: "auto", display: "block" }}
        xmlns="http://www.w3.org/2000/svg">
        <SharedDefs warm={warm} cool={cool} />
        <Visual />
        {score > 0 && <SvgAutarkieRing cx={365} cy={42} score={score}
          size={phaseNum === "∑" ? 42 : 36} />}
      </svg>
    </div>
  );
}

export default memo(PhaseVisualInner);
