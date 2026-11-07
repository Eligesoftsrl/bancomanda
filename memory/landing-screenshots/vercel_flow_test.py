import asyncio
from playwright.async_api import async_playwright

BASE = "http://127.0.0.1:8095"


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width": 1366, "height": 1024})
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)[:200]))
        await pg.goto(BASE + "/", wait_until="networkidle")
        print("1 landing title:", await pg.title())
        await pg.click('[data-testid="header-login-button"]')
        await pg.wait_for_selector('[data-testid="login-screen"]', timeout=20000)
        print("2 after Accedi url:", pg.url)
        await pg.fill('[data-testid="login-email-input"]', "titolare@pizzeria-napoli.it")
        await pg.fill('[data-testid="login-password-input"]', "Password123!")
        await pg.click('[data-testid="login-submit-button"]')
        await pg.wait_for_selector('[data-testid="sync-indicator"]', timeout=20000)
        print("3 logged in url:", pg.url)
        await pg.reload(wait_until="networkidle")
        await pg.wait_for_selector('[data-testid="sync-indicator"]', timeout=20000)
        print("4 reload stays in app:", pg.url)
        await pg.get_by_text("Menu", exact=True).last.click()
        await pg.wait_for_timeout(2000)
        print("5 menu tab url:", pg.url)
        await pg.screenshot(path="/tmp/vsim_menu.png")
        await pg.goto(BASE + "/app/menu", wait_until="networkidle")
        await pg.wait_for_timeout(2000)
        print("6 deep link /app/menu ok:", "Menu" in await pg.inner_text("body"))
        await pg.get_by_text("Report", exact=True).last.click()
        await pg.wait_for_selector('[data-testid="logout-button"]', timeout=10000)
        await pg.click('[data-testid="logout-button"]')
        await pg.click('[data-testid="logout-button"]')
        await pg.wait_for_selector('[data-testid="login-screen"]', timeout=10000)
        print("7 logout url:", pg.url)
        await pg.goto(BASE + "/", wait_until="networkidle")
        print("8 root still landing:", await pg.title())
        print("page errors:", errors)
        await b.close()

asyncio.run(main())
