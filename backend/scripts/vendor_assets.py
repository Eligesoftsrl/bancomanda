"""Scarica in locale Google Fonts e Font Awesome (GDPR: nessuna richiesta a server terzi dai visitatori)."""
import re
from pathlib import Path

import requests

OUT = Path(__file__).resolve().parent.parent / "static" / "landing"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
GOOGLE = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
FA = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0"


def fonts():
    css = requests.get(GOOGLE, headers=UA, timeout=30).text
    def fetch(m):
        url = m.group(1)
        name = "font-" + re.sub(r"[^a-zA-Z0-9.]", "-", url.split("/s/")[1])
        (OUT / name).write_bytes(requests.get(url, timeout=30).content)
        return f"url(/api/landing/assets/{name})"
    css = re.sub(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", fetch, css)
    (OUT / "fonts.css").write_text(css)


def font_awesome():
    css = requests.get(f"{FA}/css/all.min.css", timeout=30).text
    for name in sorted(set(re.findall(r"\.\./webfonts/([\w.-]+)", css))):
        (OUT / name).write_bytes(requests.get(f"{FA}/webfonts/{name}", timeout=30).content)
    (OUT / "fa.min.css").write_text(css.replace("../webfonts/", "/api/landing/assets/"))


if __name__ == "__main__":
    fonts()
    font_awesome()
    print("ok")
