import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { loadCloakMap, transformText } from "../core/transformer.js";
import { readInput } from "../utils/input.js";

export interface TextCommandOptions {
  mapFile: string;
  file?: string;
  text?: string;
  output?: string;
  quiet?: boolean;
}

export async function runReveal(options: TextCommandOptions): Promise<string> {
  const map = loadCloakMap(await fs.readFile(path.resolve(options.mapFile), "utf8"));
  const input = await readInput(options);
  const output = transformText(input, map, "toOriginal");

  await writeOutput(output, options);
  if (!options.quiet) {
    console.error(chalk.green("✓ Restored original domain names locally."));
  }

  return output;
}

export async function runTranslate(options: TextCommandOptions): Promise<string> {
  const map = loadCloakMap(await fs.readFile(path.resolve(options.mapFile), "utf8"));
  const input = await readInput(options);
  const output = transformText(input, map, "toShadow");

  await writeOutput(output, options);
  if (!options.quiet) {
    console.error(chalk.green("✓ Translated to shadow names for LLM-safe sharing."));
  }

  return output;
}

async function writeOutput(output: string, options: TextCommandOptions): Promise<void> {
  if (options.output) {
    await fs.writeFile(path.resolve(options.output), output, "utf8");
    if (!options.quiet) {
      console.error(chalk.green("✓ Output written:"), path.resolve(options.output));
    }
    return;
  }

  process.stdout.write(output);
  if (!output.endsWith("\n")) {
    process.stdout.write("\n");
  }
}
