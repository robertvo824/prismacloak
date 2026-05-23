import fs from "node:fs/promises";
import path from "node:path";

export interface InputOptions {
  file?: string;
  text?: string;
  allowStdin?: boolean;
}

export async function readInput(options: InputOptions): Promise<string> {
  if (options.text !== undefined) {
    return options.text;
  }

  if (options.file) {
    return fs.readFile(path.resolve(options.file), "utf8");
  }

  if (options.allowStdin !== false && !process.stdin.isTTY) {
    return readStdin();
  }

  throw new Error("Provide --file, --text, or pipe content via stdin");
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}
