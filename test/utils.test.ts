import { describe, expect, it } from "vitest";
import { readInput } from "../src/utils/input.js";
import { transformText, loadCloakMap } from "../src/core/transformer.js";
import { buildCloakMap } from "../src/core/mapper.js";
import { loadSchema } from "../src/core/parser.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sampleSchema = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/sample.schema.prisma",
);

describe("readInput", () => {
  it("reads inline text", async () => {
    const result = await readInput({ text: "hello", allowStdin: false });
    expect(result).toBe("hello");
  });
});

describe("transformText", () => {
  it("translates original names to shadow names", async () => {
    const parsed = await loadSchema(sampleSchema);
    const map = buildCloakMap(sampleSchema, parsed.dmmf);

    const output = transformText("PatientRecord.ssn_hash", map, "toShadow");
    expect(output).toContain(map.models.PatientRecord);
    expect(output).toContain(map.fields.PatientRecord.ssn_hash);
    expect(output).not.toContain("PatientRecord");
    expect(output).not.toContain("ssn_hash");
  });
});

describe("loadCloakMap", () => {
  it("rejects unsupported map versions", () => {
    expect(() => loadCloakMap(JSON.stringify({ version: 99 }))).toThrow(/Unsupported map version/);
  });
});
