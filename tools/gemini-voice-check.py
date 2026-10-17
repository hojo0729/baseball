import csv,os,json,base64,urllib.request,time,re,difflib
import sys
key=os.environ.get('GEMINI_API_KEY') or open(os.path.expanduser('~/.gemini.key')).read().strip()
DIR=sys.argv[1]
rows={r[0]:r[1] for r in list(csv.reader(open(os.path.join(os.path.dirname(__file__),'..','voice-script.csv'),encoding='utf-8-sig')))[1:]}
norm=lambda s: re.sub(r'[\s、。！？!?ー〜…・「」『』,.\-]','',s)
out=[]
for f in sorted(os.listdir(DIR)):
  lid=f[:-4]
  b64=base64.b64encode(open(os.path.join(DIR,f),'rb').read()).decode()
  body={"contents":[{"parts":[{"inlineData":{"mimeType":"audio/mpeg","data":b64}},{"text":"話されている日本語をそのまま書き起こし、書き起こしだけを1行で出力してください。"}]}]}
  req=urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",data=json.dumps(body).encode(),headers={"Content-Type":"application/json","x-goog-api-key":key})
  for t in range(4):
    try: d=json.load(urllib.request.urlopen(req,timeout=90)); txt=d['candidates'][0]['content']['parts'][0]['text'].strip(); break
    except Exception as e: txt='ERR '+str(e); time.sleep(10)
  r=difflib.SequenceMatcher(None,norm(rows[lid]),norm(txt)).ratio()
  out.append((r,lid,rows[lid],txt))
  time.sleep(0.5)
for r,lid,exp,got in sorted(out):
  if r<0.8: print(f'{r:.2f} {lid} | {exp} | {got}')
print('checked',len(out),'ok',sum(1 for x in out if x[0]>=0.8))
