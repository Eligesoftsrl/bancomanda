import asyncio
from playwright.async_api import async_playwright
RENAME = "document.querySelectorAll('div,span').forEach(e=>{if(e.childNodes.length===1&&e.childNodes[0].nodeType===3&&e.textContent.trim()==='Bancó')e.textContent='Bancomanda'})"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width":1366,"height":1024}, device_scale_factor=2, locale="it-IT", timezone_id="Europe/Rome")
        pg.on("pageerror", lambda e: print("PAGEERR", str(e)[:300]))
        await pg.goto("http://127.0.0.1:8090/", wait_until="networkidle")
        await pg.wait_for_timeout(3000)
        await pg.evaluate(RENAME)
        await pg.screenshot(path="/tmp/s_orders.png")
        await pg.get_by_text("Menu", exact=True).last.click()
        await pg.wait_for_timeout(3000)
        await pg.evaluate(RENAME)
        await pg.screenshot(path="/tmp/s_menu.png")
        await b.close()
asyncio.run(main())
