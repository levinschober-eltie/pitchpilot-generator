/** Nested getter: getVal(obj, ["a", "b"]) → obj.a.b */
export function getVal(obj, path) {
  let o = obj;
  for (const k of path) { o = o?.[k]; }
  return o;
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
