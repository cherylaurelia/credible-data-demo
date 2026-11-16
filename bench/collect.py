"""Build ../data/results.json (scores) and ../data/transcripts.json (tool calls + answers) from the
bench directory. Usage: python3 collect.py /tmp/credbench"""
import glob, json, os, re, sys

bench = sys.argv[1]
sys.path.insert(0, bench)
from extract import extract  # noqa: E402

out = os.path.join(os.path.dirname(__file__), "..", "data")
cases = json.load(open(os.path.join(bench, "cases_all.json")))
runs, transcripts = [], {}
for path in sorted(glob.glob(os.path.join(bench, "judge", "*.json"))):
    base = os.path.basename(path)[:-5]
    if not base.startswith(("raw.", "mcp.", "fix.")):
        continue
    j = json.load(open(path))
    x = extract(os.path.join(bench, "logs", "full", base + ".jsonl"))
    if j["qid"] in ("x-return-rate", "x-avg-order-value", "x-gross-margin"):
        j["verdict"] = "n/a"  # consistency questions have no key; the judge sometimes grades anyway
    runs.append({k: j[k] for k in ("arm", "qid", "rep", "verdict", "headline", "definition", "reason")} | {
        "cost": round(x["cost"] or 0, 4), "turns": x["turns"], "toolCalls": len(x["calls"])})
    transcripts[base] = {"calls": [{"name": c["name"], "input": c["input"]} for c in x["calls"]], "answer": x["result"]}

blob = json.dumps(transcripts)
for needle in ("/Users/", "cheryl", "@gmail"):
    assert needle.lower() not in blob.lower(), f"transcripts contain {needle!r}"
keep = ("qid", "question", "tags")
json.dump({"cases": [{k: c[k] for k in keep if k in c} | {"rubric": c["golden"].get("rubric", ""), "reps": c["reps"]} for c in cases],
           "runs": runs}, open(os.path.join(out, "results.json"), "w"), indent=1)
json.dump(transcripts, open(os.path.join(out, "transcripts.json"), "w"))
print(len(runs), "runs")
