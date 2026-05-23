import type { CloakMap } from "./types.js";
import type { DmmfDocument } from "./parser.js";

const TYPE_PREFIX: Record<string, string> = {
  String: "StringField",
  Int: "IntField",
  BigInt: "BigIntField",
  Float: "FloatField",
  Decimal: "DecimalField",
  Boolean: "BooleanField",
  DateTime: "DateTimeField",
  Json: "JsonField",
  Bytes: "BytesField",
};

type Dmmf = DmmfDocument;

function fieldTypePrefix(field: Dmmf["datamodel"]["models"][number]["fields"][number]): string {
  if (field.kind === "enum") {
    return "EnumField";
  }

  if (field.kind === "object") {
    return "RelationField";
  }

  return TYPE_PREFIX[field.type] ?? "Field";
}

export function buildCloakMap(
  schemaPath: string,
  dmmf: Dmmf,
): CloakMap {
  const models: Record<string, string> = {};
  const fields: Record<string, Record<string, string>> = {};
  const enums: Record<string, string> = {};
  const enumValues: Record<string, Record<string, string>> = {};
  const tableMaps: Record<string, string> = {};
  const columnMaps: Record<string, Record<string, string>> = {};

  let modelIndex = 0;
  for (const model of dmmf.datamodel.models) {
    modelIndex += 1;
    models[model.name] = `Model${indexToLabel(modelIndex)}`;
    fields[model.name] = {};

    const counters: Record<string, number> = {};
    for (const field of model.fields) {
      const prefix = fieldTypePrefix(field);
      counters[prefix] = (counters[prefix] ?? 0) + 1;
      fields[model.name][field.name] = `${prefix}${counters[prefix]}`;
    }

    if (model.dbName) {
      tableMaps[model.dbName] = `table_${indexToLabel(modelIndex)}`;
    }

    columnMaps[model.name] = {};
    for (const field of model.fields) {
      if (field.dbName) {
        columnMaps[model.name][field.dbName] = `col_${fields[model.name][field.name]!.toLowerCase()}`;
      }
    }
  }

  let enumIndex = 0;
  for (const enumDef of dmmf.datamodel.enums) {
    enumIndex += 1;
    enums[enumDef.name] = `Enum${indexToLabel(enumIndex)}`;
    enumValues[enumDef.name] = {};

    let valueIndex = 0;
    for (const value of enumDef.values) {
      valueIndex += 1;
      enumValues[enumDef.name][value.name] = `Value${indexToLabel(valueIndex)}`;
    }
  }

  return {
    version: 1,
    sourceSchema: schemaPath,
    createdAt: new Date().toISOString(),
    models,
    fields,
    enums,
    enumValues,
    tableMaps,
    columnMaps,
  };
}

function indexToLabel(index: number): string {
  let label = "";
  let current = index;

  while (current > 0) {
    current -= 1;
    label = String.fromCharCode(65 + (current % 26)) + label;
    current = Math.floor(current / 26);
  }

  return label;
}

