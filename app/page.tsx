import type { ReactNode } from "react";
import { figures, meanCost, tally, type Arm, type Run, type Verdict } from "../lib/score";
import { cases, loadGuideDiff, runs } from "./data";

const REPO = "https://github.com/cherylaurelia/credible-data-demo";
const TOUR_SET = "https://github.com/malloydata/publisher/tree/main/examples/storefront/evals/storefront-tour";
const GUIDE = "https://github.com/malloydata/publisher/blob/main/examples/storefront/skills/storefront-conventions/SKILL.md";

const ARM_LABEL: Record<Arm, string> = {
  raw: "Raw SQL",
  mcp: "Publisher MCP",
  fix: "MCP + guide edit",
};

const DOT: Record<Verdict, { color: string; label: string }> = {
  match: { color: "bg-pass", label: "match" },
  near_match: { color: "bg-near", label: "near match" },
  no_match: { color: "bg-fail", label: "no match" },
  "n/a": { color: "bg-line", label: "not graded" },
};

const DESIGNED_TO_FAIL = new Set([
  "storefront-tour-summer-sales-2025",
  "storefront-tour-customer-count-basis",
  "storefront-tour-best-customers",
]);

const CONSISTENCY = new Set(["x-return-rate", "x-avg-order-value", "x-gross-margin"]);

/** "raw 4.95% ×3, 4.96% ×2 · MCP 4.96% ×5": each arm's leading figures with counts. */
function leadSummary(runs: readonly Run[], qid: string): string {
  const parts: string[] = [];

  for (const arm of ["raw", "mcp"] as const) {
    const counts = new Map<string, number>();

    for (const run of runs) {
      if (run.arm !== arm || run.qid !== qid) continue;
      const lead = figures(run.headline)[0] ?? "?";
      counts.set(lead, (counts.get(lead) ?? 0) + 1);
    }

    const shown = [...counts].map(([fig, n]) => `${fig} ×${n}`).join(", ");
    parts.push(`${arm === "raw" ? "raw" : "MCP"} ${shown}`);
  }

  return parts.join(" · ");
}

const RAW_PROMPT =
  'You are a data analyst for an online storefront. The data is in ./data: order_items.parquet (one row per product sold on an order), customers.parquet, products.parquet, regions.csv (state -> region). Run DuckDB SQL with: ./q "<SQL>" (you can read files by path, e.g. FROM \'data/order_items.parquet\'). Answer this question from the data, with the numbers: <question>';

const MCP_PROMPT =
  "You are a data analyst for an online storefront. Use the malloy MCP tools (Malloy Publisher, environment 'examples', package 'storefront') to answer this question from the data, with the numbers: <question>";

function runsFor(runs: readonly Run[], arm: Arm, qid: string): Run[] {
  const out: Run[] = [];

  for (const run of runs) if (run.arm === arm && run.qid === qid) out.push(run);

  return out.toSorted((a, b) => a.rep - b.rep);
}

const DOT_BY_VERDICT = new Map(Object.entries(DOT));

function dot(verdict: string) {
  return DOT_BY_VERDICT.get(verdict) ?? DOT["n/a"];
}

function Dots({ runs }: { runs: readonly Run[] }) {
  if (runs.length === 0) return <span className="text-xs text-muted">not re-run</span>;

  return (
    <span className="inline-flex gap-1" role="img" aria-label={runs.map((r) => dot(r.verdict).label).join(", ")}>
      {runs.map((r) => (
        <span key={r.rep} title={`run ${r.rep}: ${r.headline}`} className={`size-3 rounded-full ${dot(r.verdict).color}`} />
      ))}
    </span>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-card p-6 sm:p-8">
      <p className="font-mono text-xs tracking-widest text-gold uppercase">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed">{children}</div>
    </section>
  );
}

function Headlines({ runs }: { runs: readonly Run[] }) {
  return (
    <ul className="space-y-1 font-mono text-sm">
      {runs.map((r) => (
        <li key={`${r.arm}-${r.rep}`} className="flex gap-2">
          <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot(r.verdict).color}`} role="img" aria-label={dot(r.verdict).label} />
          <span>{r.headline}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  const diff = loadGuideDiff();
  const tour: string[] = [];

  for (const c of cases) if (c.qid.startsWith("storefront-tour")) tour.push(c.qid);
  const raw = tally(runs, "raw", tour);
  const mcp = tally(runs, "mcp", tour);
  const reps = mcp.total / tour.length;
  const perPass = (n: number) => (n / reps).toFixed(1);
  const cost = (arm: Arm) => `$${meanCost(runs, arm).toFixed(3)}`;
  const spend = "storefront-tour-top-customer-spend";
  const discount = "storefront-tour-avg-discount";
  const fix = tally(runs, "fix", tour);
  const heldOut: string[] = [];

  for (const c of cases) if (c.qid.startsWith("h-")) heldOut.push(c.qid);
  const heldMcp = tally(runs, "mcp", heldOut);
  const heldFix = tally(runs, "fix", heldOut);
  const heldRaw = tally(runs, "raw", heldOut);

  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <p className="text-center font-mono text-xs tracking-widest text-gold uppercase">
        Unofficial · Malloy Publisher 0.13.1 · storefront-tour
      </p>
      <h1 className="mt-4 text-center font-display text-4xl leading-tight font-extrabold text-ink sm:text-5xl">
        A raw-SQL baseline for storefront-tour
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-center text-lg">
        On your own answer key, Claude matched <strong className="text-ink">{perPass(mcp.match)} of 12</strong> per pass
        through Publisher and <strong className="text-ink">{perPass(raw.match)} of 12</strong> with plain SQL on the same files:
        the model wins. Most of what is left is the conventions guide turning &ldquo;total&rdquo; into net revenue.
      </p>
      <p className="mx-auto mt-3 max-w-2xl text-center text-lg">
        A general 16-line guide edit raises Publisher to <strong className="text-ink">{perPass(fix.match)} of 12</strong>, and to{" "}
        <strong className="text-ink">
          {heldFix.match} of {heldFix.total}
        </strong>{" "}
        on three held-out &ldquo;total&rdquo; questions written before it ({heldMcp.match} of {heldMcp.total} with the guide as
        shipped).
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a href={REPO} className="rounded-lg bg-slate px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
          Bench, logs and data on GitHub
        </a>
        <a href="#guide-edit" className="rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink hover:bg-page">
          See the guide edit
        </a>
      </div>

      <dl className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          { k: "Matches per pass, 12 questions", v: `${perPass(raw.match)} → ${perPass(mcp.match)} → ${perPass(fix.match)}`, s: "raw SQL → Publisher → Publisher + guide edit, 3 passes each" },
          { k: "Held-out “total” questions", v: `${heldRaw.match} → ${heldMcp.match} → ${heldFix.match} of ${heldFix.total}`, s: "same three arms, written before the edit" },
          { k: "Mean cost per question", v: `${cost("mcp")} vs ${cost("raw")}`, s: "Publisher vs raw SQL; Sonnet, four small local files, so only this setup" },
        ].map((card) => (
          <div key={card.k} className="rounded-xl border border-line bg-card p-5">
            <dt className="text-sm text-muted">{card.k}</dt>
            <dd className="mt-1 font-display text-3xl font-extrabold text-ink">{card.v}</dd>
            <dd className="mt-1 text-sm text-muted">{card.s}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 space-y-6">
        <Section eyebrow="Finding 1" title="“Total spend” gets answered as net spend">
          <p>
            The guide says <code>total_sales</code> includes cancelled and returned lines and tells the agent to decide which
            revenue the question wants. For <em>&ldquo;Who is our single biggest customer by total spend?&rdquo;</em> it filtered
            them out every time, and named the wrong customer. Your eval README already marks this case as a finding about the
            guide; what this page adds is a tested edit. The same habit costs Publisher
            the held-out questions below (&ldquo;total revenue in 2024&rdquo;, &ldquo;spent the most in total&rdquo;).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-ink">{ARM_LABEL.mcp} (guide as shipped)</p>
              <Headlines runs={runsFor(runs, "mcp", spend)} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink">{ARM_LABEL.fix}</p>
              <Headlines runs={runsFor(runs, "fix", spend)} />
            </div>
          </div>
          <p className="text-sm text-muted">The key wants Delilah Okafor, about $8,818: every line, as &ldquo;total&rdquo; says.</p>
        </Section>

        <Section eyebrow="Finding 2" title="Discount: right answer, but 7–9 tool calls and 5× the cost">
          <p>
            <code>products.retail_price</code> is in the parquet but not in the model text, and the guide lists discounts under
            &ldquo;Not modelled&rdquo;. The agent still got about 5.4% in every run. But all three first tried{" "}
            <code>products.retail_price.sum()</code>. From <code>order_items</code>, that sums each product once ($17,525.92, the
            catalog) instead of once per line sold ($2,218,715.93). They noticed and re-queried. With the guide saying where list
            price lives and, in general terms, which aggregate form counts per line, no run took the detour.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-ink">
                {ARM_LABEL.mcp} (guide as shipped)
              </p>
              <Headlines runs={runsFor(runs, "mcp", discount)} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink">
                {ARM_LABEL.fix}
              </p>
              <Headlines runs={runsFor(runs, "fix", discount)} />
            </div>
          </div>
          <p className="text-sm text-muted">
            Tool calls per run: 7, 9, 9 with the shipped guide; 5, 5, 6 with the edit. Mean cost on this question $0.21 → $0.04.
          </p>
        </Section>

        <Section eyebrow="The guide edit" title="16 lines in skills/storefront-conventions">
          <p className="rounded-lg border border-gold/40 bg-page p-3 text-sm">
            Your eval README asks people not to edit the package to make cases pass. This is offered as input to{" "}
            <code>skill:eval-improve</code>, not as a patch: the edit states rules in general terms and carries no figure from
            the answer key, and the held-out questions check that it isn&apos;t tuned to the twelve.
          </p>
          <p>
            Served as a copy of the package in a second environment (<code>fixed</code>), all twelve questions × 3 plus the three
            held-out ones. Every question scored the same or better except orders per customer, where one of three runs was a
            near match (it led with 11.0 over all 1,000 customers).{" "}
            <a className="underline" href={GUIDE}>
              The guide as shipped
            </a>
            .
          </p>
          <pre
            id="guide-edit"
            tabIndex={0}
            aria-label="Diff of the conventions guide edit"
            className="overflow-x-auto rounded-lg bg-ink p-4 font-mono text-xs leading-relaxed text-page"
          >
            {diff.split("\n").map((line, i) => (
              <span
                key={i}
                className={line.startsWith("+") && !line.startsWith("+++") ? "block text-[#9fd8b4]" : line.startsWith("-") && !line.startsWith("---") ? "block text-[#f2a49c]" : "block"}
              >
                {line || " "}
              </span>
            ))}
          </pre>
        </Section>

        <Section eyebrow="Every run" title="All 19 questions, every run">
          <p>
            Twelve are your <a className="underline" href={TOUR_SET}>storefront-tour</a> set, graded with its own rubrics. Three
            are held-out &ldquo;total&rdquo; questions with rubrics in the same style. Four I added earlier (5 runs each): one customer-grain share, where counting lines instead of customers shifts the answer by a
            point, and three ambiguous metrics, where only consistency was checked. Raw SQL loses mostly by switching to net
            revenue unasked (peak month, top region, signup cohort); Publisher uses <code>total_sales</code> as defined.
          </p>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Results by question">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="py-2 pr-3 font-medium">Question</th>
                  {(["raw", "mcp", "fix"] as const).map((arm) => (
                    <th key={arm} className="px-2 py-2 font-medium whitespace-nowrap">
                      {ARM_LABEL[arm]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.qid} className="border-b border-line/70 align-top">
                    <td className="py-2 pr-3">
                      <span className="text-ink">{c.question}</span>
                      {DESIGNED_TO_FAIL.has(c.qid) && <span className="ml-2 text-xs text-gold">designed to fail</span>}
                      {c.qid.startsWith("x-") && <span className="ml-2 text-xs text-gold">added</span>}
                      {c.qid.startsWith("h-") && <span className="ml-2 text-xs text-gold">held out</span>}
                      {CONSISTENCY.has(c.qid) && (
                        <span className="mt-0.5 block text-xs text-muted">consistency check, no key: {leadSummary(runs, c.qid)}</span>
                      )}
                    </td>
                    {(["raw", "mcp", "fix"] as const).map((arm) => (
                      <td key={arm} className="px-2 py-2.5">
                        <Dots runs={runsFor(runs, arm, c.qid)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="flex flex-wrap gap-4 text-xs text-muted">
            {(["match", "near_match", "no_match", "n/a"] as const).map((v) => (
              <span key={v} className="inline-flex items-center gap-1.5">
                <span className={`size-2.5 rounded-full ${DOT[v].color}`} />
                {DOT[v].label}
              </span>
            ))}
            <span>Hover a dot for that run&apos;s answer. &ldquo;Not re-run&rdquo;: added consistency questions the fix arm skipped.</span>
          </p>
          <p className="text-sm text-muted">
            Consistency did not separate the arms here: average order value was $190.74 and gross margin 47.3% in all ten runs
            of each. Return rate split for raw SQL (3 runs by orders, 2 by lines, both about 5%); Publisher used lines every
            time.
          </p>
        </Section>

        <Section eyebrow="Method" title="How it was run, and what it doesn't show">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Publisher 0.13.1 from <code>npx @malloy-publisher/server</code>, bundled <code>examples/storefront</code>, keyword
              retrieval (no <code>EMBEDDING_API_KEY</code>, the npx default). Claude Code 2.1.325, <code>claude -p --model sonnet
              --setting-sources project</code>, run in an empty folder, so no CLAUDE.md, skills or plugins were loaded. Checked
              before the runs.
            </li>
            <li>
              Raw arm: DuckDB over the package&apos;s own four data files, Bash limited to one <code>./q</code> wrapper. MCP arm:
              <code>mcp__malloy</code> tools only. Same question text as <code>cases.jsonl</code>.
            </li>
            <li>
              <details>
                <summary className="cursor-pointer">Both prompts, verbatim</summary>
                <p className="mt-2 font-mono text-xs">Raw: {RAW_PROMPT}</p>
                <p className="mt-2 font-mono text-xs">MCP: {MCP_PROMPT}</p>
              </details>
            </li>
            <li>
              Grading: Sonnet with each case&apos;s rubric, one call per answer; every verdict and the answer it judged are in the
              repo. {runs.length} runs, all graded, ${Math.round(runs.reduce((sum, run) => sum + run.cost, 0))} in answering cost.
            </li>
            <li>
              Not shown: other models, embedding retrieval, other packages, real warehouse schemas. The raw arm got a one-line
              description of each file, which a warehouse user wouldn&apos;t. Your three designed gaps fail in both arms, as
              intended.
            </li>
          </ul>
        </Section>
      </div>

      <footer className="mt-12 border-t border-line pt-6 text-center text-sm text-muted">
        Unofficial demo by Cheryl Aurelia: not affiliated with Credible Data. Malloy Publisher and storefront are MIT-licensed by
        Credible Data Inc.
      </footer>
    </main>
  );
}
