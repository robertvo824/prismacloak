#!/usr/bin/env node

import { Command } from "commander";
import { runCheck } from "./commands/check.js";
import { runCloak } from "./commands/cloak.js";
import { runDemo } from "./commands/demo.js";
import { runInspect } from "./commands/inspect.js";
import { runReveal, runTranslate } from "./commands/transform.js";

const program = new Command();

program
  .name("prismacloak")
  .description("Anonymize Prisma schemas for safe LLM context")
  .version("0.1.0")
  .addHelpText(
    "after",
    `
Workflow:
  1. cloak   Create a safe copy of your schema for AI chats
  2. reveal  Convert AI output back to your real table/field names

Run "prismacloak demo" for a guided walkthrough.
`,
  );

program
  .command("demo")
  .description("Show a guided walkthrough of the full cloak → reveal workflow")
  .action(async () => {
    try {
      await runDemo();
    } catch (error) {
      reportError(error);
    }
  });

program
  .command("cloak")
  .description("Generate a redacted shadow schema and local mapping file")
  .argument("<schema>", "Path to schema.prisma")
  .option("-o, --output <path>", "Shadow schema output path")
  .option("-m, --map-file <path>", "Mapping dictionary output path")
  .option("-w, --watch", "Re-generate when the schema file changes")
  .action(async (schema: string, options: { output?: string; mapFile?: string; watch?: boolean }) => {
    try {
      await runCloak(schema, options);
    } catch (error) {
      reportError(error);
    }
  });

program
  .command("reveal")
  .description("Map shadow names back to original domain names (runs locally)")
  .requiredOption("-m, --map <path>", "Path to prismacloak.map.json")
  .option("-f, --file <path>", "File containing LLM output to restore")
  .option("-t, --text <text>", "Inline text to restore")
  .option("-o, --output <path>", "Write output to file instead of stdout")
  .action(async (options: {
    map: string;
    file?: string;
    text?: string;
    output?: string;
  }) => {
    try {
      await runReveal({
        mapFile: options.map,
        file: options.file,
        text: options.text,
        output: options.output,
      });
    } catch (error) {
      reportError(error);
    }
  });

program
  .command("translate")
  .description("Convert original domain names to shadow names before sharing")
  .requiredOption("-m, --map <path>", "Path to prismacloak.map.json")
  .option("-f, --file <path>", "File to translate")
  .option("-t, --text <text>", "Inline text to translate")
  .option("-o, --output <path>", "Write output to file instead of stdout")
  .action(async (options: {
    map: string;
    file?: string;
    text?: string;
    output?: string;
  }) => {
    try {
      await runTranslate({
        mapFile: options.map,
        file: options.file,
        text: options.text,
        output: options.output,
      });
    } catch (error) {
      reportError(error);
    }
  });

program
  .command("check")
  .description("Verify a shadow schema contains no original identifiers (for CI)")
  .requiredOption("-s, --schema <path>", "Path to schema.prisma or schema directory")
  .option("--shadow <path>", "Path to shadow schema (default: auto)")
  .option("-m, --map-file <path>", "Path to map file (default: auto)")
  .action(async (options: { schema: string; shadow?: string; mapFile?: string }) => {
    try {
      const ok = await runCheck({
        schema: options.schema,
        shadow: options.shadow,
        mapFile: options.mapFile,
      });
      if (!ok) {
        process.exit(1);
      }
    } catch (error) {
      reportError(error);
    }
  });

program
  .command("inspect")
  .description("Show the anonymization mapping for a cloak run")
  .requiredOption("-m, --map <path>", "Path to prismacloak.map.json")
  .action(async (options: { map: string }) => {
    try {
      await runInspect(options.map);
    } catch (error) {
      reportError(error);
    }
  });

function reportError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
}

program.parseAsync(process.argv);
