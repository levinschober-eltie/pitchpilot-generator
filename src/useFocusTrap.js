import { useEffect } from "react";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const timer = setTimeout(() => {
      const first = el.querySelector(FOCUSABLE);
      if (first) first.focus();
    }, 50);

    const handleKey = (e) => {
      if (e.key !== "Tab") return;
      const nodes = [...el.querySelectorAll(FOCUSABLE)].filter(
        (n) => getComputedStyle(n).display !== "none"
      );
      if (nodes.length === 0) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    el.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(timer);
      el.removeEventListener("keydown", handleKey);
    };
  }, [ref]);
}
