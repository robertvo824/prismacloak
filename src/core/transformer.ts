import type { CloakMap, Direction } from "./types.js";

export function transformText(
  input: string,
  map: CloakMap,
  direction: Direction,
): string {
  const replacements = collectReplacements(map, direction);
  replacements.sort((a, b) => b.from.length - a.from.length);

  let output = input;
  for (const { from, to } of replacements) {
    output = replaceToken(output, from, to);
  }

  return output;
}

function collectReplacements(
  map: CloakMap,
  direction: Direction,
): Array<{ from: string; to: string }> {
  const pairs: Array<{ from: string; to: string }> = [];
  const pick = direction === "toShadow"
    ? (original: string, shadow: string) => ({ from: original, to: shadow })
    : (original: string, shadow: string) => ({ from: shadow, to: original });

  for (const [original, shadow] of Object.entries(map.models)) {
    pairs.push(pick(original, shadow));
  }

  for (const [original, shadow] of Object.entries(map.enums)) {
    pairs.push(pick(original, shadow));
  }

  for (const [model, fieldMap] of Object.entries(map.fields)) {
    for (const [original, shadow] of Object.entries(fieldMap)) {
      pairs.push(pick(original, shadow));
    }
  }

  for (const [enumName, valueMap] of Object.entries(map.enumValues)) {
    for (const [original, shadow] of Object.entries(valueMap)) {
      pairs.push(pick(original, shadow));
    }
  }

  for (const [original, shadow] of Object.entries(map.tableMaps)) {
    pairs.push(pick(original, shadow));
  }

  for (const [, columnMap] of Object.entries(map.columnMaps)) {
    for (const [original, shadow] of Object.entries(columnMap)) {
      pairs.push(pick(original, shadow));
    }
  }

  return dedupeReplacements(pairs);
}

function dedupeReplacements(
  pairs: Array<{ from: string; to: string }>,
): Array<{ from: string; to: string }> {
  const seen = new Set<string>();
  const result: Array<{ from: string; to: string }> = [];

  for (const pair of pairs) {
    const key = `${pair.from}\0${pair.to}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(pair);
  }

  return result;
}

function replaceToken(text: string, from: string, to: string): string {
  const pattern = new RegExp(`(?<![\\w@])${escapeRegExp(from)}(?![\\w])`, "g");
  return text.replace(pattern, to);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function loadCloakMap(raw: string): CloakMap {
  const parsed = JSON.parse(raw) as CloakMap;

  if (parsed.version !== 1) {
    throw new Error(`Unsupported map version: ${String((parsed as { version?: unknown }).version)}`);
  }

  return parsed;
}
