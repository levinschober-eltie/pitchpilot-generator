/** Nested getter: getVal(obj, ["a", "b"]) → obj.a.b */
export function getVal(obj, path) {
  let o = obj;
  for (const k of path) { o = o?.[k]; }
  return o;
}

/** Convert hex color to [r, g, b] array. Falls back to mid-gray for malformed input. */
export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return [128, 128, 128];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Immutable nested setter (2 or 3 levels deep) */
export function setVal(obj, path, value) {
  const next = { ...obj };
  if (path.length === 2) {
    next[path[0]] = { ...next[path[0]], [path[1]]: value };
  } else if (path.length === 3) {
    next[path[0]] = {
      ...next[path[0]],
      [path[1]]: { ...(next[path[0]]?.[path[1]] || {}), [path[2]]: value },
    };
  }
  return next;
}
