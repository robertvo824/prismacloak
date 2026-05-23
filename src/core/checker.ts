import type { CloakMap } from "./types.js";

export interface CheckResult {
  ok: boolean;
  leaks: string[];
}

export function checkShadowSchema(shadowText: string, map: CloakMap): CheckResult {
  const leaks = new Set<string>();

  collectLeaks(shadowText, Object.keys(map.models), "model", leaks);
  collectLeaks(shadowText, Object.keys(map.enums), "enum", leaks);

  for (const [model, fieldMap] of Object.entries(map.fields)) {
    collectLeaks(shadowText, Object.keys(fieldMap), `field on ${model}`, leaks);
  }

  for (const [enumName, valueMap] of Object.entries(map.enumValues)) {
    collectLeaks(shadowText, Object.keys(valueMap), `enum value on ${enumName}`, leaks);
  }

  collectLeaks(shadowText, Object.keys(map.tableMaps), "table map", leaks);

  for (const [model, columnMap] of Object.entries(map.columnMaps)) {
    collectLeaks(shadowText, Object.keys(columnMap), `column map on ${model}`, leaks);
  }

  if (/supersecret|postgres(?:ql)?:\/\/[^R][^"]+/i.test(shadowText)) {
    leaks.add("datasource URL appears insufficiently redacted");
  }

  return {
    ok: leaks.size === 0,
    leaks: [...leaks],
  };
}

function collectLeaks(
  shadowText: string,
  identifiers: string[],
  label: string,
  leaks: Set<string>,
): void {
  for (const identifier of identifiers.sort((a, b) => b.length - a.length)) {
    const pattern = new RegExp(`(?<![\\w@])${escapeRegExp(identifier)}(?![\\w])`);
    if (pattern.test(shadowText)) {
      leaks.add(`${label}: ${identifier}`);
    }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
