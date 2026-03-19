/** SVG Icon system — matches prompt template icon names */

const paths = {
  sun: "M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m12.73-12.73l1.41-1.41M12 6a6 6 0 100 12 6 6 0 000-12z",
  battery: "M17 6H3a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-1h2V9h-2V8a2 2 0 00-2-2zM5 9h4v6H5V9z",
  fire: "M12 2c-1 4-4 6-4 10a4 4 0 008 0c0-4-3-6-4-10zm0 14a2 2 0 01-2-2c0-1 .5-1.5 2-4 1.5 2.5 2 3 2 4a2 2 0 01-2 2z",
  car: "M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11m-14 0h14m-14 0a2 2 0 00-2 2v4a1 1 0 001 1h1a2 2 0 004 0h6a2 2 0 004 0h1a1 1 0 001-1v-4a2 2 0 00-2-2",
  factory: "M2 20h20M4 20V10l4 2V8l4 2V6l4 2V4l4 2v14",
  leaf: "M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66S8 16 16 12l1 1c2-3 0-8 0-8s-5-2-8 0",
  money: "M12 1v22m5-18H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H7",
  shield: "M12 2l8 4v6c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V6l8-4z",
  chart: "M3 20h18M5 20V10m4 10V4m4 16v-8m4 8V8",
  bolt: "M13 1L6 14h6l-1 9 7-13h-6l1-9z",
  globe: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 0c2 0 4 4 4 10s-2 10-4 10-4-4-4-10S10 2 12 2zM2 12h20",
  target: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 100 12 6 6 0 000-12zm0 4a2 2 0 100 4 2 2 0 000-4z",
  clock: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4v6l4 2",
  tools: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.8-3.7A6 6 0 0112 18.3l-7.4 6.3a2.1 2.1 0 01-3-3L8 14.2A6 6 0 0114.7 6.3z",
  building: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4M9 9h.01M15 9h.01M9 13h.01M15 13h.01",
  grid: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
  plus: "M12 5v14m-7-7h14",
  trash: "M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  copy: "M16 1H4a2 2 0 00-2 2v14h2V3h12V1zm3 4H8a2 2 0 00-2 2v14a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11-3a3 3 0 100 6 3 3 0 000-6z",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zm7.94-2.06a1 1 0 00.75-1.05l-.33-2.34a1 1 0 00-.84-.83l-1.6-.24a7.5 7.5 0 00-.68-1.64l.9-1.32a1 1 0 00-.09-1.28l-1.66-1.66a1 1 0 00-1.28-.09l-1.32.9a7.5 7.5 0 00-1.64-.68L12 1.11a1 1 0 00-1.05-.75l-2.34.33a1 1 0 00-.83.84",
  check: "M20 6L9 17l-5-5",
  arrowRight: "M5 12h14m-7-7l7 7-7 7",
  arrowLeft: "M19 12H5m7 7l-7-7 7-7",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5 5 5-5m-5 5V3",
  sparkle: "M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z",
};

export default function Icon({ name, size = 18, color = "currentColor", ...rest }) {
  const d = paths[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={d} />
    </svg>
  );
}
