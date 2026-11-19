"""Generate v4 guilloche engravings (from docs/design/cards-data/system_v4.py, real basket data) for the video.
Writes assets/guil.js: window.GUIL = {SYM: {svg, serial, recipe, tone, name}}.
Engravings are generated at 435x? user units and drawn 2x in the video so hairlines render ~1 px."""
import sys, json, re, os
D = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../design/cards-data'))
sys.path.insert(0, D); os.chdir(D)
import system_v4 as S
SYM = {'The AI Build-Out': 'AIB', 'Big Tech, Trimmed': 'BTT', 'Picks & Shovels': 'PNS', 'Conviction Bets': 'CVB'}
out = {}
for b in S.load_baskets().values():
    if b['name'] not in SYM: continue
    svg = S.guilloche(b, w=435, h=110)
    svg = svg.replace('vector-effect:non-scaling-stroke', '')
    out[SYM[b['name']]] = {'svg': svg, 'serial': f'No. {S.seed_of(b)["serial"]:04d} · {SYM[b["name"]]}',
                           'recipe': sorted(b['recipe'].items(), key=lambda kv: -kv[1]), 'tone': b['tone'], 'name': b['name']}
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'guil.js')
open(dst, 'w').write('window.GUIL = ' + json.dumps(out) + ';\n')
print({k: (v['serial'], v['tone'], v['recipe']) for k, v in out.items()}, os.path.getsize(dst))
