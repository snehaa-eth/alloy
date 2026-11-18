"""Alloy component system v3: tokens + component CSS + Python render helpers.
Single source for components-v3.html, cards-v3.html and wireframes-v3.html (see build_v3.py).
Rule: every colour, font size and radius used by a component comes from a :root token below.
Page-documentation scaffolding uses the `p-` prefix and is exempt from the product rules.
"""
import json, os, math, html as H
HERE = os.path.dirname(os.path.abspath(__file__))

TOKENS_CSS = r"""
:root{
  /* surfaces + text (TOKENS v0.3, dark default) */
  --bg:#0A0A0A; --s1:#141416; --s2:#1C1C1F; --sheet:#0F0F10; --bd:#26262A; --bdi:#6B6B70;
  --tx:#F2F0ED; --tx2:#9A9894; --tx3:#C9C7C3; --on-pri:#0A0A0A; --scrim:rgba(0,0,0,.6);
  /* brand + accents (burgundy <=10%, gold <=3%) */
  --brand:#6D001A; --acc:#C41A42; --tint:#2A000A; --gold:#C9A96E; --gold6:#A07D3E; --gold2:#E3CC9C;
  /* signal */
  --gain:#3DBE8B; --loss:#FF6A3D; --warn:#F2B33D; --warnbg:#1F1806; --warnbd:#5A4410; --test:#3E6FB8;
  /* jewel tones: deep (cover base) + mid (art/dots only, never text) */
  --j-sapp:#3E6FB8; --j-sapp-d:#10223F; --j-emer:#2E8B6A; --j-emer-d:#0F2E24; --j-burg:#B5304F; --j-burg-d:#3A0010;
  --j-amb:#C98A2E;  --j-amb-d:#3A2A08;  --j-plum:#8E5BA6; --j-plum-d:#2A1433;
  /* stock logo placeholders (production: Coinbase API icon_url) */
  --l-nvda:#76B900; --l-msft:#00A4EF; --l-googl:#4285F4; --l-amzn:#FF9900; --l-meta:#0866FF; --l-tsla:#E31937; --l-aapl:#8E8E93; --l-mstr:#F7931A; --l-usdc:#2775CA;
  /* type: 3 sizes only */
  --fs-hero:32px; --fs-body:15px; --fs-small:12px;
  --ui:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif; --mono:'JetBrains Mono',ui-monospace,Menlo,monospace; --display:'Anton',Impact,'Arial Narrow',sans-serif;
  /* spacing (4-pt) + radii */
  --s1x:4px; --s2x:8px; --s3x:12px; --s4x:16px; --s5x:20px; --s6x:24px; --s8x:32px;
  --r-md:12px; --r-lg:20px; --r-pill:999px;
  --hair:1px solid var(--bd);
  /* doc scaffolding only (p- classes) */
  --p-page:#E9E8E5; --p-ink:#0A0A0A; --p-ink2:#55534F; --p-card:#FFFFFF; --p-line:#D4D3CF; --p-bezel:#232326;
  --p-fs-h1:48px; --p-fs-h2:28px; --p-r-phone:34px;
}
"""

COMPONENT_CSS = r"""
*{box-sizing:border-box} p{margin:0}
/* ---------- base surface (dark product UI) ---------- */
.ui{background:var(--bg);color:var(--tx);font:400 var(--fs-body)/1.4 var(--ui);font-feature-settings:"tnum" 1,"cv11" 1}
.t-body{font-size:var(--fs-body)} .t-small{font-size:var(--fs-small)} .t-hero{font:600 var(--fs-hero)/1.05 var(--ui);letter-spacing:-.5px}
.t-display{font:400 var(--fs-hero)/1 var(--display);text-transform:uppercase;letter-spacing:.5px}
.t-mono{font-family:var(--mono);font-size:var(--fs-small);letter-spacing:.02em}
.t-label{font-family:var(--mono);font-size:var(--fs-small);text-transform:uppercase;letter-spacing:.08em}
.t-strong{font-weight:600} .c2{color:var(--tx2)} .c3{color:var(--tx3)}
.up{color:var(--gain)} .down{color:var(--loss)} .warn{color:var(--warn)} .gold{color:var(--gold)}
.stack{display:flex;flex-direction:column;gap:var(--s3x)} .stack-2{display:flex;flex-direction:column;gap:var(--s2x)}
.row{display:flex;align-items:center;gap:var(--s2x)} .spread{display:flex;align-items:center;justify-content:space-between;gap:var(--s2x)}
.grow{flex:1} .center{text-align:center;justify-content:center}
.ico{width:16px;height:16px;flex:none;stroke:currentColor;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
.ico-lg{width:24px;height:24px}
/* ---------- buttons: primary pill / secondary outline / quiet link / icon / confirm ---------- */
.c-btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--s2x);height:48px;padding:0 var(--s5x);border-radius:var(--r-pill);font:600 var(--fs-body) var(--ui);border:1.5px solid transparent;white-space:nowrap;cursor:pointer;width:100%}
.c-btn--primary{background:var(--tx);color:var(--on-pri)}
.c-btn--secondary{background:transparent;color:var(--tx);border-color:var(--bdi)}
.c-btn--quiet{height:44px;background:transparent;color:var(--tx2);font:500 var(--fs-small) var(--ui);width:auto;padding:0 var(--s2x)}
.c-btn--icon{width:44px;height:44px;padding:0;background:var(--s2);color:var(--tx)}
.c-btn.is-hover.c-btn--primary{background:var(--tx3)} .c-btn.is-hover.c-btn--secondary{border-color:var(--tx)}
.c-btn.is-pressed{transform:scale(.98)}
.c-btn.is-focus{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--acc)}
.c-btn.is-disabled{background:var(--s2);color:var(--tx2);border-color:transparent}
.c-btn.is-loading{color:transparent;position:relative}
.c-btn.is-loading::after{content:"";position:absolute;width:18px;height:18px;border-radius:50%;border:2px solid var(--bdi);border-top-color:var(--on-pri)}
.c-actions{display:flex;flex-direction:column;align-items:center;gap:var(--s1x)}
.c-actions--pair{flex-direction:row}
/* ---------- tag chips + status pills ---------- */
.c-tag{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 var(--s2x);border-radius:var(--r-pill);background:var(--s2);color:var(--tx3);font-family:var(--mono);font-size:var(--fs-small);text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
.c-tag .ico{width:12px;height:12px}
.c-tag--accent{background:var(--tint);color:var(--tx)} .c-tag--accent .ico{color:var(--acc)}
.c-tag--warn{background:var(--warnbg);color:var(--warn)}
.c-tag--gold{background:transparent;color:var(--gold);box-shadow:inset 0 0 0 1px var(--gold6)}
.c-tag--up{color:var(--gain)} .c-tag--down{color:var(--loss)}
.c-pill{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 var(--s3x);border-radius:var(--r-pill);border:1px solid var(--bdi);font-size:var(--fs-small);color:var(--tx)}
.c-pill.is-on{background:var(--tx);color:var(--on-pri);border-color:var(--tx)}
.c-pill .dot{width:6px;height:6px;border-radius:50%;background:currentColor}
/* ---------- amount input + presets ---------- */
.c-amount{text-align:center;display:flex;flex-direction:column;gap:var(--s1x)}
.c-presets{display:flex;gap:var(--s2x);justify-content:center}
.c-keypad{display:grid;grid-template-columns:repeat(3,1fr);text-align:center;font:600 var(--fs-body) var(--ui)}
.c-keypad span{height:44px;display:flex;align-items:center;justify-content:center}
/* ---------- form fields ---------- */
.c-field{display:flex;flex-direction:column;gap:6px}
.c-field__box{height:48px;display:flex;align-items:center;padding:0 var(--s4x);border-radius:var(--r-md);border:1.5px solid var(--bdi);background:transparent;font-size:var(--fs-body);color:var(--tx)}
.c-field__box.is-ph{color:var(--tx2)}
.c-field.is-focus .c-field__box{border-color:var(--tx);box-shadow:0 0 0 3px var(--tint)}
.c-field.is-error .c-field__box{border-color:var(--loss)} .c-field.is-error .c-field__help{color:var(--loss)}
.c-field.is-disabled .c-field__box{background:var(--s2);border-color:var(--s2);color:var(--tx2)}
.c-field__help{font-size:var(--fs-small);color:var(--tx2)}
.c-otp{display:grid;grid-template-columns:repeat(6,1fr);gap:var(--s2x)}
.c-otp span{height:48px;border-radius:var(--r-md);border:1.5px solid var(--bdi);display:flex;align-items:center;justify-content:center;font:600 var(--fs-body) var(--mono)}
/* ---------- fact rows ---------- */
.c-facts{display:flex;flex-direction:column}
.c-fact{display:flex;justify-content:space-between;align-items:center;gap:var(--s3x);min-height:40px;border-top:var(--hair);font-size:var(--fs-small)}
.c-fact__k{color:var(--tx2)} .c-fact__v{font-family:var(--mono);color:var(--tx);display:inline-flex;align-items:center;gap:6px;text-align:right}
/* ---------- list rows ---------- */
.c-list{display:flex;flex-direction:column}
.c-row{display:flex;align-items:center;gap:var(--s3x);min-height:56px;border-top:var(--hair)}
.c-list > .c-row:first-child{border-top:0}
.c-row__main{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.c-row__title{font-size:var(--fs-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c-row__meta{font-family:var(--mono);font-size:var(--fs-small);color:var(--tx2)}
.c-row__end{text-align:right;display:flex;flex-direction:column;gap:2px;align-items:flex-end;font-family:var(--mono);font-size:var(--fs-small)}
.c-row__end .t-body{font-family:var(--ui);font-weight:600}
/* ---------- tabs + bottom nav ---------- */
.c-seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;background:var(--s2);border-radius:var(--r-pill);padding:3px}
.c-seg span{height:38px;display:flex;align-items:center;justify-content:center;border-radius:var(--r-pill);font:600 var(--fs-small) var(--ui);color:var(--tx2)}
.c-seg span.is-on{background:var(--tx);color:var(--on-pri)}
.c-nav{display:flex;justify-content:space-around;border-top:var(--hair);padding:var(--s2x) 0 var(--s5x);background:var(--bg);margin-top:auto}
.c-nav span{display:flex;flex-direction:column;align-items:center;gap:var(--s1x);font-size:var(--fs-small);color:var(--tx2);min-width:64px;min-height:44px}
.c-nav span.is-on{color:var(--tx)}
.c-nav span.is-on::after{content:"";width:16px;height:2px;border-radius:var(--r-pill);background:var(--acc)}
/* ---------- top bar + status strip ---------- */
.c-top{display:flex;align-items:center;justify-content:space-between;gap:var(--s2x);min-height:52px}
.c-strip{display:flex;align-items:center;gap:var(--s2x);min-height:36px;padding:0 var(--s4x);font-size:var(--fs-small);border-bottom:var(--hair)}
.c-strip .ico{width:14px;height:14px}
.c-strip__act{margin-left:auto;text-decoration:underline;text-underline-offset:3px}
.c-strip--change{background:var(--tint)} .c-strip--change .ico{color:var(--acc)}
.c-strip--closed{background:var(--warnbg);color:var(--warn)}
.c-strip--held{background:var(--s2)} .c-strip--held .ico{color:var(--gold)}
.c-strip--test{background:var(--s1);color:var(--tx2)} .c-strip--test .ico{color:var(--test)}
.c-inapp{display:flex;align-items:center;gap:var(--s2x);min-height:40px;padding:0 var(--s4x);background:var(--bg);border-bottom:var(--hair);font-size:var(--fs-small);color:var(--tx2)}
.c-inapp b{margin-left:auto;color:var(--tx)}
/* ---------- sheets ---------- */
.c-scrim{flex:1;display:flex;flex-direction:column;justify-content:flex-end;background:var(--scrim)}
.c-sheet{background:var(--sheet);border-top:var(--hair);border-radius:var(--r-lg) var(--r-lg) 0 0;padding:var(--s2x) var(--s4x) var(--s6x);display:flex;flex-direction:column;gap:var(--s4x)}
.c-grab{width:36px;height:4px;border-radius:var(--r-pill);background:var(--bdi);margin:0 auto}
/* ---------- toasts + banners ---------- */
.c-toast{display:flex;align-items:center;gap:var(--s3x);min-height:48px;padding:0 var(--s4x);border-radius:var(--r-pill);background:var(--s2);border:var(--hair);font-size:var(--fs-small)}
.c-toast .ico{color:var(--gain)} .c-toast--error .ico{color:var(--loss)}
.c-banner{display:flex;gap:var(--s3x);align-items:flex-start;padding:var(--s3x) var(--s4x);border-radius:var(--r-md);border:var(--hair);font-size:var(--fs-small)}
.c-banner--notice{background:var(--tint);border-color:var(--brand)} .c-banner--notice .ico{color:var(--acc)}
.c-banner--closed{background:var(--warnbg);border-color:var(--warnbd);color:var(--warn)}
.c-banner--test{background:var(--s1);color:var(--tx2)} .c-banner--test .ico{color:var(--test)}
/* ---------- badges, avatars, logos ---------- */
.c-badge{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 var(--s2x);border-radius:var(--r-pill);font:600 var(--fs-small) var(--ui);color:var(--gold);box-shadow:inset 0 0 0 1px var(--gold6)}
.c-badge::before{content:"";width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,var(--gold2),var(--gold) 45%,var(--gold6))}
.c-badge--creator{color:var(--tx);box-shadow:inset 0 0 0 1px var(--bdi)} .c-badge--creator::before{background:var(--gold)}
.c-avatar{width:32px;height:32px;border-radius:50%;flex:none;background:linear-gradient(135deg,var(--j-sapp),var(--j-plum))}
.c-avatar--creator{box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px var(--gold)}
.c-avatar--sm{width:20px;height:20px}
.c-logo{width:24px;height:24px;border-radius:50%;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--tx);font:700 var(--fs-small)/1 var(--ui);box-shadow:0 0 0 2px var(--bg)}
.c-logo--lg{width:32px;height:32px}
.c-tile{width:32px;height:32px;border-radius:var(--r-md);flex:none;border:1px solid currentColor}
.c-tile.t-sapp{background:var(--j-sapp-d)}.c-tile.t-emer{background:var(--j-emer-d)}.c-tile.t-burg{background:var(--j-burg-d)}.c-tile.t-amb{background:var(--j-amb-d)}.c-tile.t-plum{background:var(--j-plum-d)}
.c-stack{display:inline-flex} .c-stack .c-logo+.c-logo{margin-left:-6px}
.l-nvda{background:var(--l-nvda)}.l-msft{background:var(--l-msft)}.l-googl{background:var(--l-googl)}.l-amzn{background:var(--l-amzn)}.l-meta{background:var(--l-meta)}.l-tsla{background:var(--l-tsla)}.l-aapl{background:var(--l-aapl)}.l-mstr{background:var(--l-mstr)}.l-usdc{background:var(--l-usdc)}
/* ---------- bars, donut, countdown ---------- */
.c-bar{height:4px;border-radius:var(--r-pill);background:var(--s2);overflow:hidden}
.c-bar i{display:block;height:100%;background:var(--acc);border-radius:var(--r-pill)}
.c-wbar{display:flex;gap:2px;height:8px;border-radius:var(--r-pill);overflow:hidden}
.c-wbar i{display:block;height:100%}
.c-donut{width:96px;height:96px;transform:rotate(-90deg)}
.c-countdown{font-family:var(--mono);font-size:var(--fs-small);color:var(--tx)}
/* ---------- charts ---------- */
.c-dots{display:block;width:100%;height:88px}
.t-sapp{color:var(--j-sapp)}.t-emer{color:var(--j-emer)}.t-burg{color:var(--j-burg)}.t-amb{color:var(--j-amb)}.t-plum{color:var(--j-plum)}
.c-chart{display:block;width:100%}
.c-chart__line{fill:none;stroke:var(--tx);stroke-width:2}
.c-chart__creator{fill:none;stroke:var(--tx2);stroke-width:1.5;stroke-dasharray:4 3}
.c-chart__tick{stroke:var(--acc);stroke-dasharray:2 4}
.c-chart__scrub{stroke:var(--tx);stroke-opacity:.5}
.c-chart__dim{fill:var(--bg);fill-opacity:.7}
.c-chart__dot{fill:var(--tx)}
.c-legend{display:flex;gap:var(--s4x);font-family:var(--mono);font-size:var(--fs-small);color:var(--tx2)}
/* ---------- skeleton, empty, error ---------- */
.c-skel{border-radius:var(--r-md);background:linear-gradient(90deg,var(--s1),var(--s2),var(--s1))}
.c-empty,.c-error{display:flex;flex-direction:column;align-items:center;text-align:center;gap:var(--s3x);padding:var(--s6x) var(--s4x)}
.c-empty .ico-lg{color:var(--tx2)} .c-error .ico-lg{color:var(--loss)}
.c-hr{height:1px;background:var(--bd);border:0;margin:0}
/* ---------- CARD (composition of the components above) ---------- */
.c-card{color:var(--tx);background:var(--s1);border:var(--hair);border-radius:var(--r-lg);overflow:hidden;display:flex;flex-direction:column}
.c-card--flat{border:0;background:transparent}
.c-card--flat .c-card__body{padding-left:0;padding-right:0}
.c-card__art{position:relative;height:88px;background:var(--bg)}
.c-card__mark{position:absolute;left:var(--s3x);top:var(--s3x)}
.c-card__wm{position:absolute;right:var(--s3x);top:var(--s3x)}
.c-card__body{padding:var(--s3x) var(--s4x) var(--s4x);display:flex;flex-direction:column;gap:var(--s2x)}
.c-card__tagrow{display:flex;justify-content:space-between;align-items:center;gap:var(--s2x)}
.c-card__context{font-size:var(--fs-small);color:var(--tx2);margin-top:var(--s1x)}
.c-card__number{display:flex;align-items:baseline;gap:var(--s2x)}
.c-card__facts{margin-top:var(--s1x)}
.c-card__actions{margin-top:var(--s2x)}
/* ---------- basket cover (ONLY on the basket page hero) ---------- */
.c-cover{position:relative;height:160px;overflow:hidden;background:var(--j-emer-d)}
.c-cover img{width:100%;height:100%;object-fit:cover;display:block}
.c-cover__scrim{position:absolute;inset:0;background:linear-gradient(to top,var(--bg),transparent 70%)}
.c-cover__title{position:absolute;left:var(--s4x);right:var(--s4x);bottom:var(--s3x)}
"""

PAGE_CSS = r"""
/* ---------- p- = documentation scaffolding (not product UI) ---------- */
body.p-page{margin:0;background:var(--p-page);color:var(--p-ink);font:400 var(--fs-body)/1.5 var(--ui)}
.p-wrap{max-width:1360px;margin:0 auto;padding:0 var(--s4x)}
.p-head{background:var(--bg);color:var(--tx);padding:var(--s8x) 0 var(--s6x)}
.p-h1{font:400 var(--p-fs-h1)/.95 var(--display);text-transform:uppercase;margin:0 0 var(--s3x)}
.p-h2{font:400 var(--p-fs-h2)/1 var(--display);text-transform:uppercase;margin:0 0 var(--s1x)}
.p-lede{color:var(--p-ink2);max-width:860px;margin:0 0 var(--s5x)}
.p-head .p-lede{color:var(--tx3)}
.p-idx{display:flex;flex-wrap:wrap;gap:var(--s2x);list-style:none;margin:0;padding:0}
.p-idx a{display:inline-block;padding:6px var(--s3x);border:1px solid var(--bdi);border-radius:var(--r-pill);color:var(--tx);text-decoration:none;font-size:var(--fs-small)}
.p-sec{padding:var(--s8x) 0 var(--s5x);border-bottom:1px solid var(--p-line)}
.p-grid{display:flex;flex-wrap:wrap;gap:var(--s6x);align-items:flex-start}
.p-cap{font:600 var(--fs-small) var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--p-ink2);margin:0 0 var(--s2x)}
.p-cap b{color:var(--p-ink)}
.p-note{font-size:var(--fs-small);color:var(--p-ink2);max-width:320px;margin-top:var(--s2x)}
.p-panel{background:var(--bg);border-radius:var(--r-lg);padding:var(--s5x);display:flex;flex-wrap:wrap;gap:var(--s4x);align-items:center}
.p-spec{background:var(--p-card);border:1px solid var(--p-line);border-radius:var(--r-md);padding:var(--s3x) var(--s4x);font-size:var(--fs-small);max-width:420px}
.p-spec table{border-collapse:collapse;width:100%} .p-spec td{padding:3px 0;vertical-align:top} .p-spec td:first-child{color:var(--p-ink2);padding-right:var(--s3x);white-space:nowrap}
.p-do{color:var(--gain)} .p-dont{color:var(--loss)}
.p-dd{font-size:var(--fs-small);margin-top:var(--s2x)}
.p-state{display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.p-state .t-mono{color:var(--tx2)}
.p-phone{width:390px;max-width:100%;min-height:800px;border:8px solid var(--p-bezel);border-radius:var(--p-r-phone);overflow:hidden;display:flex;flex-direction:column;position:relative}
.p-phone.is-short{min-height:0}
.p-desk{width:1200px;border:6px solid var(--p-bezel);border-radius:var(--r-lg);overflow:hidden}
.p-scrollx{max-width:100%;overflow-x:auto;padding-bottom:var(--s2x)}
.p-sb{height:34px;display:flex;justify-content:space-between;align-items:center;padding:0 22px;font:600 var(--fs-small) var(--ui)}
.p-notes{max-width:360px;background:var(--p-card);border:1px solid var(--p-line);border-radius:var(--r-md);padding:var(--s3x) var(--s4x);font-size:var(--fs-small)}
.p-notes ol{margin:0;padding-left:var(--s5x)} .p-notes li{margin:0 0 6px}
.p-checks table{border-collapse:collapse;background:var(--p-card);font-size:var(--fs-small)}
.p-checks td,.p-checks th{padding:4px var(--s3x);border-bottom:1px solid var(--p-line);text-align:left}
.p-ok{color:var(--gain);font-weight:700} .p-bad{color:var(--loss);font-weight:700}
.p-swatch{width:120px;border-radius:var(--r-md);overflow:hidden;background:var(--p-card);border:1px solid var(--p-line);font-size:var(--fs-small)}
.p-swatch i{display:block;height:44px} .p-swatch p{padding:6px var(--s2x)}
"""

FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">'

def page(title, body):
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title}</title>{FONTS}<style>{TOKENS_CSS}{COMPONENT_CSS}{PAGE_CSS}</style></head><body class="p-page">{body}</body></html>'

# ---------- icons (Lucide geometry, ISC licence; production uses lucide-react) ----------
ICONS = {
 'arrow-up-right':'<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
 'arrow-down-left':'<path d="M17 7 7 17"/><path d="M17 17H7V7"/>',
 'arrow-left':'<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
 'check':'<path d="M20 6 9 17l-5-5"/>',
 'x':'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
 'chevron-right':'<path d="m9 18 6-6-6-6"/>',
 'info':'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
 'alert':'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
 'moon':'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
 'clock':'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 'scissors':'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88"/><path d="M14.47 14.48 20 20"/><path d="M8.12 8.12 12 12"/>',
 'download':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
 'pencil':'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
 'refresh':'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
 'award':'<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
 'calendar':'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
 'lock':'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
 'search':'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 'compass':'<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/>',
 'pie':'<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
 'activity':'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
 'user':'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
 'share':'<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
 'plus':'<path d="M5 12h14"/><path d="M12 5v14"/>',
 'layers':'<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
 'shield':'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
 'dot':'<circle cx="12" cy="12" r="4"/>',
 'flask':'<path d="M9 3h6"/><path d="M10 9V3h4v6l5 9a2 2 0 0 1-1.8 3H6.8A2 2 0 0 1 5 18z"/>',
}
def ico(name, cls='ico', label=None):
    a = f' role="img" aria-label="{label}"' if label else ' aria-hidden="true"'
    return f'<svg class="{cls}" viewBox="0 0 24 24"{a}>{ICONS[name]}</svg>'

# ---------- data ----------
def load_baskets():
    d = json.load(open(os.path.join(HERE, 'baskets.json')))
    return {b['name']: b for b in d['baskets']}

def dots(series, tone, w=320, h=88, cols=48, rows=12, label=None):
    """Dot-matrix area chart of a REAL price series (3-day smoothed), jewel tone via currentColor.
    Crest dots are bright, depth fades and thins with a 4x4 ordered dither; empty cells are a faint grid."""
    raw = [v for _, v in series]
    vals = [sum(raw[max(0, i - 1):i + 2]) / len(raw[max(0, i - 1):i + 2]) for i in range(len(raw))]
    lo, hi = min(vals), max(vals); span = (hi - lo) or 1
    bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    dx, dy = w / cols, h / rows
    out = []
    for c in range(cols):
        t = c / (cols - 1) * (len(vals) - 1); i = int(t); f = t - i
        v = vals[i] if i + 1 >= len(vals) else vals[i] * (1 - f) + vals[i + 1] * f
        filled = max(2, round((0.25 + 0.7 * (v - lo) / span) * rows))
        for r in range(rows):
            cx, cy = c * dx + dx / 2, h - (r * dy + dy / 2)
            if r < filled:
                depth = (filled - 1 - r) / max(filled - 1, 1)
                if depth > .5 and bayer[c % 4][r % 4] / 16 < (depth - .5) * 1.6: op = .06
                else: op = 1 - .75 * depth
            else:
                op = .06
            out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="1.6" fill="currentColor" opacity="{op:.2f}"/>')
    lab = f' role="img" aria-label="{H.escape(label)}"' if label else ' aria-hidden="true"'
    return f'<svg class="c-dots t-{tone}" viewBox="0 0 {w} {h}" preserveAspectRatio="none"{lab}>{"".join(out)}</svg>'

def nav_chart(series, w=358, h=120, creator=True, ticks=(), scrub=None, gid='g'):
    vals = [v for _, v in series]; lo, hi = min(vals), max(vals); span = (hi - lo) or 1
    P = [(i / (len(vals) - 1) * w, h - 8 - (v - lo) / span * (h - 16)) for i, v in enumerate(vals)]
    pts = ' '.join(f'{x:.1f},{y:.1f}' for x, y in P)
    cr = ''
    if creator:  # illustrative creator line: same shape, joined earlier at a lower price
        C = [(x, y - 6 - x / w * 6) for x, y in P]
        cr = f'<polyline class="c-chart__creator" points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in C)}"/>'
    tk = ''.join(f'<line class="c-chart__tick" x1="{t*w:.0f}" x2="{t*w:.0f}" y1="0" y2="{h}"/>' for t in ticks)
    sc = ''
    if scrub is not None:
        x, y = P[int(scrub * (len(P) - 1))]
        sc = f'<rect class="c-chart__dim" x="{x:.1f}" y="0" width="{w-x:.1f}" height="{h}"/><line class="c-chart__scrub" x1="{x:.1f}" x2="{x:.1f}" y1="0" y2="{h}"/><circle class="c-chart__dot" cx="{x:.1f}" cy="{y:.1f}" r="4"/>'
    return f'<svg class="c-chart" viewBox="0 0 {w} {h}" height="{h}" aria-label="Value chart">{tk}{cr}<polyline class="c-chart__line" points="{pts}"/>{sc}</svg>'

LOGO_CH = {'NVDA':'N','MSFT':'M','GOOGL':'G','AMZN':'a','META':'M','TSLA':'T','AAPL':'','MSTR':'M','USDC':'$'}
def logo(t, lg=False): return f'<span class="c-logo l-{t.lower()}{" c-logo--lg" if lg else ""}" role="img" aria-label="{t}">{LOGO_CH.get(t,"")}</span>'
def stack(ts): return '<span class="c-stack">' + ''.join(logo(t) for t in ts) + '</span>'
def tag(text, icon=None, mod=''): return f'<span class="c-tag{" c-tag--"+mod if mod else ""}">{ico(icon) if icon else ""}{text}</span>'
def fact(k, v): return f'<div class="c-fact"><span class="c-fact__k">{k}</span><span class="c-fact__v">{v}</span></div>'
def btn(text, kind='primary', state='', icon=None):
    return f'<span class="c-btn c-btn--{kind}{" "+state if state else ""}">{ico(icon) if icon else ""}{text}</span>'
def quiet(text): return f'<span class="c-btn c-btn--quiet">{text} {ico("chevron-right")}</span>'
def signed(pct, unit='%'):
    cls = 'up' if pct >= 0 else 'down'
    return f'<span class="{cls}">{"▲ +" if pct >= 0 else "▼ −"}{abs(pct):.1f}{unit}</span>'

def card(art, tagrow, context, number, facts=(), primary=None, secondary=None, link=None, mark='', wm='', hero=False, budget=16, unit=''):
    num_cls = 't-display' if hero else 't-hero'
    acts = ''
    if primary or secondary or link:
        b = (btn(primary) if primary else '') + (btn(secondary, 'secondary') if secondary else '')
        acts = f'<div class="c-card__actions c-actions">{b}{quiet(link) if link else ""}</div>'
    f = f'<div class="c-facts c-card__facts">{"".join(fact(k, v) for k, v in facts)}</div>' if facts else ''
    return f'''<div class="c-card" data-budget="{budget}" data-kind="Card"><div class="c-card__art">{art}<span class="c-card__mark">{mark}</span><span class="c-card__wm">{wm}</span></div>
<div class="c-card__body"><div class="c-card__tagrow">{tagrow}</div><p class="c-card__context">{context}</p><div class="c-card__number"><span class="{num_cls}">{number}</span>{f'<span class="t-small c2">{unit}</span>' if unit else ""}</div>{f}{acts}</div></div>'''
