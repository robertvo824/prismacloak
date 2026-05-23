export interface CloakMap {
  version: 1;
  sourceSchema: string;
  createdAt: string;
  models: Record<string, string>;
  fields: Record<string, Record<string, string>>;
  enums: Record<string, string>;
  enumValues: Record<string, Record<string, string>>;
  tableMaps: Record<string, string>;
  columnMaps: Record<string, Record<string, string>>;
}

export interface ParsedSchema {
  schemaPath: string;
  schemaText: string;
  dmmf: import("./parser.js").DmmfDocument;
}

export type Direction = "toShadow" | "toOriginal";
