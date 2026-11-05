"""Screenshot dell'app (export web locale + backend demo porta 8002) e smoke test UI login/allergeni.
Prerequisiti: /tmp/webdist esportato con EXPO_PUBLIC_BACKEND_URL=http://localhost:8002 e servito su 127.0.0.1:8090."""
import asyncio
from playwright.async_api import async_playwright

OUT = "/tmp"
URL = "http://127.0.0.1:8090/"


def tid(x):
    return f'[data-testid="{x}"]'


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width": 1366, "height": 1024}, device_scale_factor=2, locale="it-IT", timezone_id="Europe/Rome")
        pg.on("pageerror", lambda e: print("PAGEERR", str(e)[:300]))
        await pg.goto(URL, wait_until="networkidle")
        await pg.wait_for_selector(tid("login-screen"), timeout=15000)
        await pg.screenshot(path=f"{OUT}/s_login.png")
        print("OK login screen shown, url:", pg.url)

        await pg.fill(tid("login-email-input"), "demo@bancomanda.it")
        await pg.fill(tid("login-password-input"), "sbagliata123")
        await pg.click(tid("login-submit-button"))
        await pg.wait_for_selector(tid("login-error"), timeout=10000)
        print("OK wrong password error:", await pg.inner_text(tid("login-error")))

        await pg.fill(tid("login-password-input"), "DemoBancomanda1")
        await pg.click(tid("login-submit-button"))
        await pg.wait_for_selector(tid("sync-indicator"), timeout=15000)
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path=f"{OUT}/s_orders.png")
        print("OK orders after login")

        await pg.reload(wait_until="networkidle")
        await pg.wait_for_selector(tid("sync-indicator"), timeout=15000)
        print("OK session persisted after reload")
        await pg.wait_for_timeout(2000)

        await pg.get_by_text("Menu", exact=True).last.click()
        await pg.wait_for_timeout(3000)
        await pg.screenshot(path=f"{OUT}/s_menu.png")
        print("OK menu")

        await pg.get_by_text("Piatti", exact=True).last.click()
        await pg.wait_for_timeout(3000)
        await pg.screenshot(path=f"{OUT}/s_dishes.png")
        await pg.locator('[data-testid^="dish-edit-"]').first.click()
        await pg.wait_for_selector(tid("dish-labels-picker"), timeout=5000)
        await pg.click(tid("allergen-chip-sesamo"))
        await pg.fill(tid("custom-tag-input"), "Km zero")
        await pg.click(tid("custom-tag-add-button"))
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=f"{OUT}/s_dish_modal.png")
        await pg.click(tid("dish-save-button"))
        await pg.wait_for_timeout(2000)
        print("OK dish saved")

        await pg.get_by_text("Report", exact=True).last.click()
        await pg.wait_for_selector(tid("kitchen-section"), timeout=10000)
        await pg.wait_for_timeout(2500)
        await pg.locator(tid("kitchen-section")).scroll_into_view_if_needed()
        await pg.evaluate("document.querySelector('[data-testid=\"kitchen-section\"]').scrollIntoView({block:'start'})")
        await pg.wait_for_timeout(1000)
        await pg.screenshot(path=f"{OUT}/s_kitchen.png")
        print("OK kitchen")

        await pg.click(tid("logout-button"))
        await pg.click(tid("logout-button"))
        await pg.wait_for_selector(tid("login-screen"), timeout=10000)
        print("OK logout back to login")
        await b.close()

asyncio.run(main())
