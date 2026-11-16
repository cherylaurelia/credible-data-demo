#!/bin/bash
# run1.sh <arm> <qid> <rep>
arm=$1; qid=$2; rep=$3
q=$(python3 -c "import json,sys;print([c['question'] for c in json.load(open('/tmp/credbench/cases_all.json')) if c['qid']==sys.argv[1]][0])" "$qid")
out=/tmp/credbench/logs/full/$arm.$qid.$rep.jsonl
if [ $arm = raw ]; then
  cd /tmp/credbench/raw
  p="You are a data analyst for an online storefront. The data is in ./data: order_items.parquet (one row per product sold on an order), customers.parquet, products.parquet, regions.csv (state -> region). Run DuckDB SQL with: ./q \"<SQL>\" (you can read files by path, e.g. FROM 'data/order_items.parquet'). Answer this question from the data, with the numbers: $q"
  timeout 900 claude -p "$p" --model sonnet --setting-sources project --max-turns 40 --output-format stream-json --verbose --allowedTools "Bash(./q:*)" --strict-mcp-config --mcp-config '{"mcpServers":{}}' > $out 2>/tmp/credbench/logs/full/$arm.$qid.$rep.err
elif [ $arm = fix ]; then
  cd /tmp/credbench/fix
  p="You are a data analyst for an online storefront. Use the malloy MCP tools (Malloy Publisher, environment 'fixed', package 'storefront') to answer this question from the data, with the numbers: $q"
  timeout 900 claude -p "$p" --model sonnet --setting-sources project --max-turns 40 --output-format stream-json --verbose --allowedTools "mcp__malloy" --strict-mcp-config --mcp-config /tmp/credbench/mcp-fix.json > $out 2>/tmp/credbench/logs/full/$arm.$qid.$rep.err
else
  cd /tmp/credbench/mcp
  p="You are a data analyst for an online storefront. Use the malloy MCP tools (Malloy Publisher, environment 'examples', package 'storefront') to answer this question from the data, with the numbers: $q"
  timeout 900 claude -p "$p" --model sonnet --setting-sources project --max-turns 40 --output-format stream-json --verbose --allowedTools "mcp__malloy" --strict-mcp-config --mcp-config /tmp/credbench/mcp.json > $out 2>/tmp/credbench/logs/full/$arm.$qid.$rep.err
fi
echo "$arm $qid $rep exit=$?"
