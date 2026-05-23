import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { loadCloakMap } from "../core/transformer.js";

export async function runInspect(mapFile: string): Promise<void> {
  const map = loadCloakMap(await fs.readFile(path.resolve(mapFile), "utf8"));

  console.log(chalk.bold("PrismaCloak mapping summary"));
  console.log(chalk.dim(`Source: ${map.sourceSchema}`));
  console.log(chalk.dim(`Created: ${map.createdAt}`));
  console.log();

  console.log(chalk.bold("Models"));
  for (const [original, shadow] of Object.entries(map.models)) {
    console.log(`  ${chalk.cyan(shadow)} ← ${original}`);
  }

  console.log();
  console.log(chalk.bold("Enums"));
  for (const [original, shadow] of Object.entries(map.enums)) {
    console.log(`  ${chalk.cyan(shadow)} ← ${original}`);
  }

  console.log();
  console.log(chalk.bold("Fields (sample)"));
  for (const [model, fieldMap] of Object.entries(map.fields)) {
    console.log(`  ${chalk.yellow(map.models[model] ?? model)}`);
    for (const [original, shadow] of Object.entries(fieldMap)) {
      console.log(`    ${chalk.cyan(shadow)} ← ${original}`);
    }
  }
}
