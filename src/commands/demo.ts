import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { runCloak } from "./cloak.js";
import { loadCloakMap, transformText } from "../core/transformer.js";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const sampleSchema = path.resolve(fixtureDir, "../../test/fixtures/sample.schema.prisma");

export async function runDemo(): Promise<void> {
  console.log(chalk.bold.cyan("\nPrismaCloak — what this tool does\n"));
  console.log("When you ask an AI to write database queries, you often paste your full");
  console.log("schema.prisma into the chat. That leaks table names like PatientRecord,");
  console.log("field names like ssn_hash, and your database URL.");
  console.log();
  console.log(chalk.bold("PrismaCloak fixes this in two steps:\n"));
  console.log(`  ${chalk.yellow("1. cloak")}  → build a fake schema with generic names (safe to paste)`);
  console.log(`  ${chalk.yellow("2. reveal")} → convert the AI's answer back to your real names locally`);
  console.log();
  console.log(chalk.dim("Running a live demo on the sample healthcare schema...\n"));

  const { shadowPath, mapPath } = await runCloak(sampleSchema, { quiet: true });
  const map = loadCloakMap(await fs.readFile(mapPath, "utf8"));
  const shadowText = await fs.readFile(shadowPath, "utf8");

  console.log(chalk.bold("Step 1 — Your real schema contains sensitive names"));
  printSnippet([
    "model PatientRecord {",
    "  ssn_hash  String @unique",
    "  diagnosis Diagnosis @relation(...)",
    "}",
  ]);

  console.log(chalk.bold("\nStep 2 — cloak replaces names but keeps relationships"));
  printSnippet(extractModelBlock(shadowText, "ModelA"));
  console.log(chalk.dim("  ↑ Safe to paste into ChatGPT / Claude / Cursor. No SSN fields, no prod URLs."));

  console.log(chalk.bold("\nStep 3 — You ask the AI using shadow names"));
  const aiCode = [
    "const rows = await prisma.ModelA.findMany({",
    "  where: { EnumField1: 'ValueA' },",
    "  select: { StringField1: true, RelationField2: true },",
    "});",
  ].join("\n");
  printSnippet(aiCode.split("\n"));

  console.log(chalk.bold("\nStep 4 — reveal converts the AI output back on your machine"));
  const restored = transformText(aiCode, map, "toOriginal");
  printSnippet(restored.trim().split("\n"));
  console.log(chalk.dim("  ↑ Only you have prismacloak.map.json. The AI never saw the real names."));

  console.log(chalk.bold("\nName dictionary (from inspect)"));
  console.log(`  ${chalk.cyan(map.models.PatientRecord)} ← PatientRecord`);
  console.log(`  ${chalk.cyan(map.fields.PatientRecord.ssn_hash)} ← ssn_hash`);
  console.log(`  ${chalk.cyan(map.enumValues.PatientStatus.ACTIVE)} ← ACTIVE`);
  console.log();
  console.log(chalk.bold.green("Demo complete."));
  console.log();
  console.log(chalk.bold("Try it yourself:"));
  console.log(chalk.cyan("  npm run build"));
  console.log(chalk.cyan(`  node dist/cli.js cloak ${sampleSchema}`));
  console.log(chalk.cyan(`  node dist/cli.js inspect --map ${mapPath}`));
  console.log();
}

function printSnippet(lines: string[]): void {
  console.log(chalk.dim("  ┌────────────────────────────────────────"));
  for (const line of lines) {
    console.log(`${chalk.dim("  │")} ${line}`);
  }
  console.log(chalk.dim("  └────────────────────────────────────────"));
}

function extractModelBlock(schemaText: string, modelName: string): string[] {
  const match = schemaText.match(new RegExp(`model ${modelName}\\s*\\{[\\s\\S]*?\\}`, "m"));
  if (!match) {
    return [`model ${modelName} { ... }`];
  }

  return match[0].split("\n").slice(0, 6);
}
