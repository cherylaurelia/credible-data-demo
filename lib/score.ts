export type Arm = "raw" | "mcp" | "fix";

export type Verdict = "match" | "near_match" | "no_match" | "n/a";

/** One graded run, as written by bench/collect.py. Arm and verdict stay strings: they come from JSON. */
export interface Run {
  arm: string;
  qid: string;
  rep: number;
  verdict: string;
  headline: string;
  definition: string;
  cost: number;
}

/** Matches, near matches and runs for one arm over a set of questions. */
export function tally(runs: readonly Run[], arm: Arm, qids: readonly string[]) {
  const wanted = new Set(qids);
  let match = 0;
  let near = 0;
  let total = 0;

  for (const run of runs) {
    if (run.arm !== arm || !wanted.has(run.qid)) continue;
    total += 1;

    if (run.verdict === "match") match += 1;

    if (run.verdict === "near_match") near += 1;
  }

  return { match, near, total };
}

/** Average matches per full pass over `qids`, i.e. matches divided by reps. */
export function matchesPerPass(runs: readonly Run[], arm: Arm, qids: readonly string[]): number {
  const { match, total } = tally(runs, arm, qids);

  if (total === 0) return 0;

  return (match * qids.length) / total;
}

/** Pull every dollar figure or percentage out of a headline, normalised for comparison. */
export function figures(headline: string): string[] {
  const found = headline.match(/\$[\d,]+(?:\.\d+)?|\d+(?:\.\d+)?%/g) ?? [];

  return found.map((f) => f.replaceAll(",", ""));
}

/** Distinct leading figures across one arm's runs of a question: 1 means every run agreed. */
export function distinctLeadFigures(runs: readonly Run[], arm: Arm, qid: string): string[] {
  const leads = new Set<string>();

  for (const run of runs) {
    if (run.arm !== arm || run.qid !== qid) continue;
    leads.add(figures(run.headline)[0] ?? run.headline);
  }

  return [...leads];
}

export function meanCost(runs: readonly Run[], arm: Arm): number {
  let sum = 0;
  let n = 0;

  for (const run of runs) {
    if (run.arm !== arm) continue;
    sum += run.cost;
    n += 1;
  }

  return n === 0 ? 0 : sum / n;
}
