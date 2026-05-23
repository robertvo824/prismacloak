import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildCloakMap } from "../src/core/mapper.js";
import { loadSchema } from "../src/core/parser.js";
import { redactSchema } from "../src/core/redactor.js";
import { transformText } from "../src/core/transformer.js";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const sampleSchema = path.join(fixtureDir, "fixtures/sample.schema.prisma");

describe("PrismaCloak", () => {
  it("generates anonymized schema while preserving relations", async () => {
    const parsed = await loadSchema(sampleSchema);
    const map = buildCloakMap(sampleSchema, parsed.dmmf);
    const shadow = redactSchema(parsed.schemaText, map);

    expect(shadow).not.toContain("PatientRecord");
    expect(shadow).not.toContain("ssn_hash");
    expect(shadow).not.toContain("supersecret");
    expect(shadow).not.toContain("patient_records");
    expect(shadow).toContain("ModelA");
    expect(shadow).toContain("@relation");
    expect(shadow).toContain("references: [");
  });

  it("round-trips AI output back to original names", async () => {
    const parsed = await loadSchema(sampleSchema);
    const map = buildCloakMap(sampleSchema, parsed.dmmf);

    const aiOutput = `
      SELECT ${map.models.PatientRecord}.${map.fields.PatientRecord.id}, ${map.models.PatientRecord}.${map.fields.PatientRecord.ssn_hash}
      FROM ${map.models.PatientRecord}
      JOIN ${map.models.Diagnosis} ON ${map.models.PatientRecord}.${map.fields.PatientRecord.diagnosis} = ${map.models.Diagnosis}.${map.fields.Diagnosis.id}
      WHERE ${map.models.PatientRecord}.${map.fields.PatientRecord.status} = ${map.enumValues.PatientStatus.ACTIVE}
    `;

    const restored = transformText(aiOutput, map, "toOriginal");

    expect(restored).toContain("PatientRecord");
    expect(restored).toContain("ssn_hash");
    expect(restored).toContain("Diagnosis");
    expect(restored).toContain("ACTIVE");
  });

  it("writes mapping dictionary with stable model aliases", async () => {
    const parsed = await loadSchema(sampleSchema);
    const map = buildCloakMap(sampleSchema, parsed.dmmf);

    expect(map.models.PatientRecord).toBe("ModelA");
    expect(map.models.Diagnosis).toBe("ModelB");
    expect(map.models.InsuranceClaim).toBe("ModelC");
    expect(map.fields.PatientRecord.ssn_hash).toMatch(/^StringField\d+$/);
  });
});

describe("fixture sanity", () => {
  it("loads the sample schema fixture", async () => {
    const content = await fs.readFile(sampleSchema, "utf8");
    expect(content).toContain("model PatientRecord");
  });
});
