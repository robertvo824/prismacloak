import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { buildCloakMap } from "../core/mapper.js";
import { loadSchema } from "../core/parser.js";
import {
  defaultMapPath,
  defaultShadowPath,
  redactSchema,
} from "../core/redactor.js";

export interface CloakOptions {
  output?: string;
  mapFile?: string;
  watch?: boolean;
  quiet?: boolean;
}

export async function runCloak(
  schemaPath: string,
  options: CloakOptions = {},
): Promise<{ shadowPath: string; mapPath: string }> {
  const resolvedSchema = path.resolve(schemaPath);

  if (options.watch) {
    await cloakOnce(resolvedSchema, options);
    console.log(chalk.dim(`Watching ${resolvedSchema} for changes...`));
    let timer: NodeJS.Timeout | undefined;

    const watcher = (await import("node:fs")).watch(resolvedSchema, () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          await cloakOnce(resolvedSchema, options);
          if (!options.quiet) {
            console.log(chalk.green("✓ Re-cloaked after schema change"));
          }
        } catch (error) {
          console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
        }
      }, 150);
    });

    await new Promise<void>(() => {
      watcher.on("close", () => {});
    });
  }

  return cloakOnce(resolvedSchema, options);
}

async function cloakOnce(
  resolvedSchema: string,
  options: CloakOptions,
): Promise<{ shadowPath: string; mapPath: string }> {
  const parsed = await loadSchema(resolvedSchema);
  const map = buildCloakMap(resolvedSchema, parsed.dmmf);
  const shadowSchema = redactSchema(parsed.schemaText, map);

  const shadowPath = path.resolve(options.output ?? defaultShadowPath(resolvedSchema));
  const mapPath = path.resolve(options.mapFile ?? defaultMapPath(resolvedSchema));

  await fs.writeFile(shadowPath, shadowSchema, "utf8");
  await fs.writeFile(mapPath, `${JSON.stringify(map, null, 2)}\n`, "utf8");

  if (!options.quiet) {
    console.log(chalk.green("✓ Shadow schema written:"), shadowPath);
    console.log(chalk.green("✓ Mapping dictionary written:"), mapPath);
    console.log();
    console.log(chalk.dim("What to do next:"));
    console.log(chalk.dim("  1. Open the .shadow.prisma file and paste it into your AI chat"));
    console.log(chalk.dim("  2. Ask the AI for queries/code using names like ModelA, StringField1"));
    console.log(chalk.dim("  3. Run the AI output through reveal to get your real names back:"));
    console.log(chalk.cyan(`     prismacloak reveal --map ${mapPath} --file ai-output.ts`));
    console.log();
    console.log(chalk.dim("Run `prismacloak demo` for a full walkthrough."));
  }

  return { shadowPath, mapPath };
}
