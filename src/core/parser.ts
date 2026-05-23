import type * as DMMF from "@prisma/dmmf";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { getDMMF, getSchemaWithPath } = require("@prisma/internals") as {
  getDMMF: (options: { datamodel: Array<[string, string]> }) => Promise<DMMF.Document>;
  getSchemaWithPath: (schemaPath: string) => Promise<{
    schemas: Array<[string, string]>;
  }>;
};

export type DmmfDocument = DMMF.Document;

export async function loadDmmf(schemaPath: string): Promise<DmmfDocument> {
  const absolutePath = path.resolve(schemaPath);
  const schema = await getSchemaWithPath(absolutePath);

  return getDMMF({ datamodel: schema.schemas });
}

export async function loadSchema(schemaPath: string): Promise<{
  schemaPath: string;
  schemaText: string;
  dmmf: DmmfDocument;
}> {
  const absolutePath = path.resolve(schemaPath);
  const schema = await getSchemaWithPath(absolutePath);
  const schemaText = schema.schemas.map(([, content]) => content).join("\n");
  const dmmf = await getDMMF({ datamodel: schema.schemas });

  return {
    schemaPath: absolutePath,
    schemaText,
    dmmf,
  };
}
