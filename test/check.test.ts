import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runCheck } from "../src/commands/check.js";
import { runCloak } from "../src/commands/cloak.js";
import { checkShadowSchema } from "../src/core/checker.js";
import { buildCloakMap } from "../src/core/mapper.js";
import { loadSchema } from "../src/core/parser.js";
import { defaultShadowPath, redactSchema } from "../src/core/redactor.js";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const multiSchemaDir = path.join(fixtureDir, "fixtures/multi");
const sampleSchema = path.join(fixtureDir, "fixtures/sample.schema.prisma");

describe("multi-file schemas", () => {
  it("cloaks a schema directory into a single shadow file", async () => {
    const parsed = await loadSchema(multiSchemaDir);
    const map = buildCloakMap(multiSchemaDir, parsed.dmmf);
    const shadow = redactSchema(parsed.schemaText, map);

    expect(parsed.schemaText).toContain("UserAccount");
    expect(shadow).not.toContain("UserAccount");
    expect(shadow).not.toContain("token_hash");
    expect(shadow).toContain("ModelA");
    expect(shadow).toContain("@relation");
  });

  it("check passes on a freshly cloaked multi-file schema", async () => {
    const shadowPath = defaultShadowPath(multiSchemaDir);
    await runCloak(multiSchemaDir, { output: shadowPath, quiet: true });

    const ok = await runCheck({
      schema: multiSchemaDir,
      shadow: shadowPath,
      mapFile: path.join(path.dirname(multiSchemaDir), "prismacloak.map.json"),
    });

    expect(ok).toBe(true);
  });
});

describe("checkShadowSchema", () => {
  it("detects leaked identifiers", async () => {
    const parsed = await loadSchema(sampleSchema);
    const map = buildCloakMap(sampleSchema, parsed.dmmf);

    const badShadow = "model PatientRecord { ssn_hash String }";
    const result = checkShadowSchema(badShadow, map);

    expect(result.ok).toBe(false);
    expect(result.leaks.length).toBeGreaterThan(0);
  });
});
