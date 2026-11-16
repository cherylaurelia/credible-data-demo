"""Pull final answer, cost, turns and tool calls out of one stream-json log."""
import json,sys
def extract(path):
    calls=[];res=None
    for l in open(path):
        try: e=json.loads(l)
        except ValueError: continue
        if e.get('type')=='assistant':
            for c in e['message']['content']:
                if c.get('type')=='tool_use': calls.append({'name':c['name'],'input':c['input']})
        if e.get('type')=='result': res=e
    return {'result':(res or {}).get('result',''),'cost':(res or {}).get('total_cost_usd'),
            'turns':(res or {}).get('num_turns'),'is_error':(res or {}).get('is_error',True),
            'calls':calls,'usage':(res or {}).get('usage')}
if __name__=='__main__': print(json.dumps(extract(sys.argv[1]),indent=1)[:3000])
