export function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export function cloneDraft(value) {
  return structuredClone(value);
}

export function createDraft(preset, language) {
  if (!preset?.copy?.[language]) throw new Error("unsupported_language");
  return cloneDraft({
    ...preset.base,
    language,
    presetId: preset.id,
    ...preset.copy[language]
  });
}

export function updateDraftAtPath(draft, path, value) {
  const next = cloneDraft(draft);
  let cursor = next;
  for (let index = 0; index < path.length - 1; index += 1) {
    cursor = cursor[path[index]];
  }
  cursor[path.at(-1)] = value;
  return next;
}

export function canonicalize(value) {
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalize(value[key])
    ).join(",") + "}";
  }
  return JSON.stringify(value);
}
