import assert from "node:assert/strict";
import { test } from "node:test";
import { distinctLeadFigures, figures, matchesPerPass, meanCost, tally, type Run } from "./score.ts";

const run = (arm: Run["arm"], qid: string, rep: number, verdict: Run["verdict"], headline = "", cost = 0.1): Run => ({
  arm, qid, rep, verdict, headline, definition: "", cost,
});

test("tally counts only the arm and questions asked for", () => {
  const runs = [run("raw", "a", 1, "match"), run("raw", "a", 2, "near_match"), run("raw", "b", 1, "no_match"), run("mcp", "a", 1, "match")];
  assert.deepEqual(tally(runs, "raw", ["a"]), { match: 1, near: 1, total: 2 });
  assert.deepEqual(tally(runs, "raw", ["a", "b"]), { match: 1, near: 1, total: 3 });
});

test("matchesPerPass scales matches to one pass over the set", () => {
  const runs = [1, 2, 3].flatMap((rep) => [run("mcp", "a", rep, "match"), run("mcp", "b", rep, rep === 1 ? "match" : "no_match")]);
  assert.equal(matchesPerPass(runs, "mcp", ["a", "b"]), 4 / 3);
  assert.equal(matchesPerPass([], "mcp", ["a"]), 0);
});

test("figures normalises dollars and percentages", () => {
  assert.deepEqual(figures("$190.74 average (alt: $190.51)"), ["$190.74", "$190.51"]);
  assert.deepEqual(figures("47.3% gross margin ($992,714 on $2,098,178)"), ["47.3%", "$992714", "$2098178"]);
  assert.deepEqual(figures("Outerwear"), []);
});

test("distinctLeadFigures keys on the first figure of each run", () => {
  const runs = [run("raw", "aov", 1, "n/a", "$190.51 per order"), run("raw", "aov", 2, "n/a", "$190.74"), run("raw", "aov", 3, "n/a", "$190.51"), run("mcp", "aov", 1, "n/a", "$190.74")];
  assert.deepEqual(distinctLeadFigures(runs, "raw", "aov"), ["$190.51", "$190.74"]);
  assert.deepEqual(distinctLeadFigures(runs, "mcp", "aov"), ["$190.74"]);
});

test("meanCost averages one arm", () => {
  assert.equal(meanCost([run("raw", "a", 1, "match", "", 0.1), run("raw", "a", 2, "match", "", 0.3), run("mcp", "a", 1, "match", "", 9)], "raw"), 0.2);
  assert.equal(meanCost([], "fix"), 0);
});
