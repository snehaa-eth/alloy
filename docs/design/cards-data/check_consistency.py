#!/usr/bin/env python3
"""Consistency check for wireframes-v3.html (and any v3 page): flags one-off styles outside the token system.
Rules
  1. CSS rules (outside :root) may not contain colour literals (#hex, rgb/rgba/hsl) — use var(--token). Exempt: p- doc scaffolding.
  2. font-size / font shorthand sizes must be var(--fs-*) (product) or var(--p-fs-*) (doc).
  3. border-radius must be var(--r-*), 50% or 0.
  4. Inline style="" may only set layout (width/height/flex/gap/padding/margin/position offsets); no colour, font, radius, shadow.
  5. SVG fill/stroke attributes must be currentColor, none or url(#…).
  6. Every class used in markup must exist in the stylesheet (no undefined one-off classes).
Usage: python3 -I check_consistency.py ../wireframes-v3.html  → prints violations, writes <file>.consistency.json
"""
import re, sys, json, html.parser
path = sys.argv[1]; src = open(path).read()
css = "".join(re.findall(r"<style>(.*?)</style>", src, re.S))
body = src.split("</head>", 1)[1]
V = []
css_nc = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
for sel, decl in re.findall(r"([^{}]+)\{([^{}]*)\}", css_nc):
    sel = sel.strip()
    if sel == ":root" or sel.startswith("@"): continue
    doc = all(s.strip().startswith((".p-", "body.p-page")) for s in sel.split(","))
    for prop, val in re.findall(r"([\w-]+)\s*:\s*([^;]+)", decl):
        if not doc and re.search(r"#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?)\(", val): V.append(("css-colour", sel, f"{prop}:{val}"))
        if prop == "font-size" and not re.match(r"var\(--(p-)?fs-", val.strip()): V.append(("css-font-size", sel, val))
        if prop == "font" and re.search(r"(?<![\w-])\d+(\.\d+)?px", val.split("/")[0].replace("var(", "@(")) and "var(--" not in val.split("/")[0]: V.append(("css-font", sel, val))
        if prop == "border-radius":
            for part in val.split():
                if not (part.startswith(("var(--r-", "var(--p-r-")) or part in ("50%", "0")): V.append(("css-radius", sel, val)); break
LAYOUT = {"width","height","min-height","max-width","flex","gap","padding","margin","margin-top","position","left","right","top","bottom","justify-content","align-items","align-self","text-align","display","opacity"}
classes_css = set(re.findall(r"\.([a-zA-Z][\w-]*)", css_nc))
class P(html.parser.HTMLParser):
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for decl in (a.get("style") or "").split(";"):
            if ":" not in decl: continue
            prop = decl.split(":")[0].strip()
            if prop not in LAYOUT: V.append(("inline-style", tag, decl.strip()))
        for k in ("fill", "stroke"):
            v = a.get(k)
            if v and not (v in ("currentColor", "none") or v.startswith("url(")): V.append(("svg-colour", tag, f"{k}={v}"))
        for c in (a.get("class") or "").split():
            if c not in classes_css: V.append(("undefined-class", tag, c))
P().feed(body)
out = {"file": path.split("/")[-1], "violations": len(V), "items": [list(v) for v in V]}
import os; json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), out["file"] + ".consistency.json"), "w"), indent=1)
print(f"{out['file']}: {len(V)} violations")
for v in V[:60]: print("  ", *v)
