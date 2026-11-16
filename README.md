# A raw-SQL baseline for storefront-tour (unofficial)

Malloy Publisher's own eval set, [`examples/storefront/evals/storefront-tour`](https://github.com/malloydata/publisher/tree/main/examples/storefront/evals/storefront-tour),
has 12 questions with verified answers. Its arms vary the model and the package skills, but it has
no arm without the model, so it can't show what the semantic layer adds over plain SQL. This adds
that arm, plus one fix it surfaced.

## Results (Publisher 0.13.1, Claude Sonnet via `claude -p`, 134 runs, 2026-11-15)

- **12 questions, 3 passes per arm:** answers matched the key 7.3 times per pass through Publisher's MCP, and 5.0 times with DuckDB SQL over the
  package's own four files. Raw SQL mostly lost by switching to net revenue unasked (peak month,
  top region, signup cohort).
- **"Who is our single biggest customer by total spend?":** 0 of 3 through MCP, because the
  conventions guide pushes "decide which revenue" and every run picked net. The eval README already
  calls this a finding about the guide.
- **Average discount:** right in every run, but each MCP run first summed
  `products.retail_price.sum()` (each product once, $17,525.92) instead of `sum(products.retail_price)`
  (once per line, $2,218,715.93), then re-queried; 7–9 tool calls.
- **Guide edit** ([`data/guide-fix.diff`](data/guide-fix.diff), 16 lines in
  `skills/storefront-conventions/SKILL.md`): top customer 0/3 → 5/5; discount 5/5 with one query
  and 5 tool calls each, mean cost $0.21 → $0.11; peak month, top category, top region and best
  customers no worse (3 runs each).
- Mean cost per question: $0.142 through MCP, $0.030 raw.

Not shown: other models, embedding retrieval (none was configured, so retrieval used keyword
matching, the npx default), other packages or real warehouses. The raw arm got a one-line description
of each file.

## What's here

- `bench/run1.sh`: runs one question in one arm (`raw`, `mcp`, or `fix`) with `claude -p --model sonnet --setting-sources project`, in an empty folder with no CLAUDE.md, skills or plugins loaded.
- `bench/q`: the raw arm's DuckDB wrapper. `bench/judge.py`: grades one answer with Sonnet against the case rubric. `bench/collect.py`: builds `data/`.
- `bench/cases_all.json`: the 12 storefront-tour cases (verbatim) and 4 added ones.
- `data/results.json`: every run's verdict, headline, cost and turns. `data/transcripts.json`: every run's tool calls and final answer.
- `app/`: the page (Next.js).

## Re-run

```sh
npx @malloy-publisher/server@0.13.1 --port 4000          # MCP on :4040, examples bundled
# fix arm: copy examples/storefront, apply data/guide-fix.diff, serve it as environment "fixed" on :4100/:4140
bench/run1.sh mcp storefront-tour-top-customer-spend 1    # raw | mcp | fix, qid, rep
python3 bench/judge.py logs/full/mcp.storefront-tour-top-customer-spend.1.jsonl
python3 bench/collect.py <bench dir>
npm install && npm run build && npm start
```

`bench/run1.sh` hard-codes `/tmp/credbench` paths; adjust them to your bench folder.

---

Unofficial demo by Cheryl Aurelia: not affiliated with Credible Data. Malloy Publisher and the
storefront example are MIT-licensed by Credible Data Inc.
