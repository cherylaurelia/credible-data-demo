"""Grade one answer with claude -p (sonnet) against the case rubric. Writes judge/<log>.json."""
import json,subprocess,sys,os
from extract import extract
log=sys.argv[1]; base=os.path.basename(log).removesuffix('.jsonl')
arm,qid,rep=base.split('.')
case=[c for c in json.load(open('/tmp/credbench/cases_all.json')) if c['qid']==qid][0]
ans=extract(log)['result']
consistency=qid.startswith('x-') and qid!='x-west-customer-share'
prompt=f"""You grade one analytics answer. Question: {case['question']}
Rubric: {case['golden']['rubric']}
Answer to grade (between the markers):
<<<
{ans}
>>>
Reply with JSON only: {{"verdict": "match"|"near_match"|"no_match"{'|"n/a"' if consistency else ''}, "headline": "<the main figure or entity the answer gives, short>", "definition": "<one short phrase: what basis/definition the answer used>", "reason": "<one sentence>"}}"""
out=subprocess.run(['claude','-p',prompt,'--model','sonnet','--setting-sources','project','--max-turns','1','--strict-mcp-config','--mcp-config','{"mcpServers":{}}'],capture_output=True,text=True,timeout=300,cwd='/tmp/credbench/judge').stdout
s=out[out.find('{'):out.rfind('}')+1]
try: j=json.loads(s)
except ValueError: j={'verdict':'judge_error','raw':out[:500]}
j.update(arm=arm,qid=qid,rep=int(rep))
json.dump(j,open(f'/tmp/credbench/judge/{base}.json','w'),indent=1)
print(base,j.get('verdict'),j.get('headline'))
