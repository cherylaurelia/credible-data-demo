import { readFileSync } from "node:fs";
import { join } from "node:path";
import results from "../data/results.json";

export const { cases, runs } = results;

export type Case = (typeof cases)[number];

export function loadGuideDiff(): string {
  return readFileSync(join(process.cwd(), "data", "guide-fix.diff"), "utf8");
}
