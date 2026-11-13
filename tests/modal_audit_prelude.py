DET = """(ext) => { const dlg = [...document.querySelectorAll('[role="dialog"]')].pop(); if (!dlg) return {open:false}; const H = innerHeight; const isScroller = el => { const cs = getComputedStyle(el); return /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1; }; const unreachable = []; dlg.querySelectorAll(ext ? 'button, [role="button"], input, textarea, [tabindex="0"]' : 'button, [role="button"], input, textarea').forEach(el => { if (el===dlg) return; const r = el.getBoundingClientRect(); if (r.height === 0 || r.width === 0) return; if (r.bottom > H + 1 || r.top < -1) { let p = el.parentElement, ok = false; while (p && p !== dlg) { if (isScroller(p)) { ok = true; break; } p = p.parentElement; } if (!ok) unreachable.push((el.innerText || el.placeholder || el.getAttribute('data-testid') || el.tagName).slice(0, 40)); } }); const scrollers = [...dlg.querySelectorAll('*')].filter(isScroller).map(el => ({h: el.clientHeight, sh: el.scrollHeight, testid: el.getAttribute('data-testid')})); return {open: true, winH: H, unreachable, scrollers}; }"""
INV = """(s) => { const e=document.querySelector(s); if(!e) return 'missing'; const r=e.getBoundingClientRect(); const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return {top:r.top|0,bottom:r.bottom|0,H:innerHeight,visible:r.top>=0&&r.bottom<=innerHeight, hit: !!top && (e===top||e.contains(top))}; }"""
CLOSE = """() => { const d=[...document.querySelectorAll('[role=dialog]')].pop(); if(!d) return 'nodlg'; const all=[...d.querySelectorAll('[tabindex="0"],[role=button],button')].filter(e=>e!==d); let b=all.find(e=>/^[\\uE000-\\uF8FF]$/.test(e.innerText.trim())); if(!b) b=all.find(e=>/^(Annulla|Chiudi)$/i.test(e.innerText.trim())); if(!b) return 'noX'; b.click(); return 'closed'; }"""
WHEEL = """() => { const d=[...document.querySelectorAll('[role=dialog]')].pop(); const sc=[...d.querySelectorAll('*')].filter(el=>/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight>el.clientHeight+1); return sc.map(e=>({tid:e.getAttribute('data-testid'), st:Math.round(e.scrollTop), max:e.scrollHeight-e.clientHeight})); }"""
LASTVIS = """() => { const d=[...document.querySelectorAll('[role=dialog]')].pop(); const els=[...d.querySelectorAll('button,[role=button],input,textarea,[tabindex="0"]')].filter(e=>{if(e===d) return false; const r=e.getBoundingClientRect(); return r.width>0&&r.height>0;}); const l=els[els.length-1]; if(!l) return null; const r=l.getBoundingClientRect(); const t=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2); return {last:(l.innerText||l.placeholder||l.getAttribute('data-testid')||l.tagName).slice(0,30), top:r.top|0, bottom:r.bottom|0, H:innerHeight, hit: !!t&&(l===t||l.contains(t))}; }"""
CARD = """() => { const d=[...document.querySelectorAll('[role=dialog]')].pop(); if(!d) return null; const sc=[...d.querySelectorAll('*')].find(el=>/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight>el.clientHeight+1); const t=sc||d; const r=t.getBoundingClientRect(); return {x:r.left+r.width/2,y:Math.max(r.top,0)+Math.min(r.height/2,200)}; }"""
async def audit(name, primary=None):
    print(f"== {name}: std={await page.evaluate(DET, False)}")
    print(f"   ext-unreachable={(await page.evaluate(DET, True)).get('unreachable')}")
    if primary: print("   primary", primary, await page.evaluate(INV, primary))
    card = await page.evaluate(CARD)
    if card:
        await page.mouse.move(card["x"], card["y"]); await page.mouse.wheel(0, 3000); await page.wait_for_timeout(700)
        print("   after wheel", await page.evaluate(WHEEL), "last:", await page.evaluate(LASTVIS))
        if primary: print("   primary after wheel", await page.evaluate(INV, primary))
async def login():
    await page.wait_for_timeout(3500)
    await page.fill('[data-testid="login-email-input"]', "titolare@pizzeria-napoli.it")
    await page.fill('[data-testid="login-password-input"]', "Password123!")
    await page.click('[data-testid="login-submit-button"]')
    await page.wait_for_timeout(5000)
async def closedlg():
    r = await page.evaluate(CLOSE); await page.wait_for_timeout(900)
    n = await page.evaluate("() => document.querySelectorAll('[role=dialog]').length")
    if n: print("   !! dialog still open after close:", r, n)
    return n
