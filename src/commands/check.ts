import fs from "node:fs/promises";
import { statSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { checkShadowSchema } from "../core/checker.js";
import {
  defaultMapPath,
  defaultShadowPath,
} from "../core/redactor.js";
import { loadCloakMap } from "../core/transformer.js";

export interface CheckOptions {
  schema: string;
  shadow?: string;
  mapFile?: string;
}

export async function runCheck(options: CheckOptions): Promise<boolean> {
  const schemaPath = path.resolve(options.schema);
  const shadowPath = path.resolve(options.shadow ?? defaultShadowPath(schemaPath));
  const mapPath = path.resolve(options.mapFile ?? defaultMapPath(schemaPath));

  const [shadowText, mapRaw] = await Promise.all([
    fs.readFile(shadowPath, "utf8"),
    fs.readFile(mapPath, "utf8"),
  ]);

  const map = loadCloakMap(mapRaw);
  const result = checkShadowSchema(shadowText, map);

  if (result.ok) {
    console.log(chalk.green("✓ Shadow schema is safe — no original identifiers detected."));
    console.log(chalk.dim(`  schema: ${schemaPath}`));
    console.log(chalk.dim(`  shadow: ${shadowPath}`));
    console.log(chalk.dim(`  map:    ${mapPath}`));
    return true;
  }

  console.error(chalk.red("✗ Shadow schema still leaks original identifiers:\n"));
  for (const leak of result.leaks) {
    console.error(chalk.red(`  - ${leak}`));
  }
  console.error();
  console.error(chalk.dim("Re-run:"), chalk.cyan(`prismacloak cloak ${schemaPath}`));

  return false;
}
