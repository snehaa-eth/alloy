#!/usr/bin/env python3
"""Write pixel/type/word check results (checks.json from the headless run) + consistency results into wireframes-v3.html."""
import json, sys, html, re
checks, page = sys.argv[1], sys.argv[2]
d = json.load(open(checks)); s = open(page).read()
import os; cons = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), os.path.basename(page) + '.consistency.json')))
rows = []
for f in d:
    over = [b for b in f['blocks'] if b['words'] > b['budget']]
    ok = f['burg'] <= .10 and f['gold'] <= .03 and len(f['anton']) <= 1 and len(f['sizes']) <= 3 and not over
    wb = '; '.join(f"{b['kind']} {b['words']}/{b['budget']}" for b in f['blocks'][:4])
    rows.append(f"<tr><td>{html.escape(html.unescape(f['name']))}</td><td>{f['burg']*100:.2f}%</td><td>{f['gold']*100:.2f}%</td><td>{len(f['anton'])}</td><td>{', '.join(f['sizes'])}</td><td>{html.escape(wb)}</td><td class=\"{'p-ok' if ok else 'p-bad'}\">{'pass' if ok else 'FAIL'}</td></tr>")
fails = sum('FAIL' in r for r in rows)
t = (f"<p class=\"p-lede\">{len(d)} screens · {fails} failures · consistency scan: {cons['violations']} one-off styles (colours, radii, font sizes, inline styling, undefined classes). Max burgundy {max(f['burg'] for f in d)*100:.2f}% (≤ 10%) · max gold {max(f['gold'] for f in d)*100:.2f}% (≤ 3%).</p>"
     "<table><tr><th>Screen</th><th>Burgundy</th><th>Gold</th><th>Anton</th><th>Type sizes</th><th>Words / budget</th><th></th></tr>" + ''.join(rows) + "</table>")
s = re.sub(r'<div class="p-checks" id="checkout">.*?</div></div></section>', '<div class="p-checks" id="checkout">' + t + '</div></div></section>', s, flags=re.S)
open(page, 'w').write(s); print('injected', fails, 'fails')
