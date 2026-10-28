"""Builds evolens.app's pages from _src/ into the site root. Run: python3 -I build.py <contact email>

The home page is Figma 223KnKRHY9zoEcaprJbIGR node 2395:6769 (_src/home.html, assets/home.css); the legal and support
pages share assets/site.css.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# The App Store page, once evolens is live there. Empty: the badge says "Coming soon" and links nowhere.
APP_STORE_URL = ""
# evolens' profiles. A name with no address is shown as plain text, never as a dead link.
SOCIAL = {"Instagram": "", "TikTok": "", "Youtube": ""}

PAGES = {"privacy": ("Privacy Policy · evolens", "/privacy/"),
         "support": ("Support · evolens", "/support/"), "terms": ("Terms of Use · evolens", "/terms/")}
MARK = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" '
        'd="M8.1 1h7.8L23 8.1v7.8L15.9 23H8.1L1 15.9V8.1zM12 6.2l-2.9 5.8 2.9 5.8 2.9-5.8z"/></svg>')

email = sys.argv[1] if len(sys.argv) > 1 else ""
if "@" not in email:
    sys.exit("usage: python3 -I build.py <contact email>")

badge_img = '<img src="/assets/home/app-store-badge.png" width="146" height="48" alt="Download on the App Store">'
if APP_STORE_URL:
    badge = f'<a class="badge" href="{APP_STORE_URL}">{badge_img}</a>'
else:
    badge = ('<div class="badge badge--soon"><img src="/assets/home/app-store-badge.png" width="146" height="48" '
             'alt="App Store"><span class="badge__note">Coming soon</span></div>')
social = "".join(f'<li><a href="{url}">{name}</a></li>' if url else f"<li>{name}</li>" for name, url in SOCIAL.items())
home = ((ROOT / "_src" / "home.html").read_text().replace("{{BADGE}}", badge).replace("{{SOCIAL}}", social)
        .replace("{{DOWNLOAD_HREF}}", APP_STORE_URL or "#download"))
(ROOT / "index.html").write_text(f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f9fafb">
<title>evolens: scan your entire Pokémon collection</title>
<meta name="description" content="evolens recognizes your Pokémon cards with your iPhone’s camera, keeps your collection organized, and shows what it’s worth.">
<link rel="canonical" href="https://evolens.app/">
<link rel="preload" href="/assets/instrument-sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/home.css">
</head>
<body>
{home}</body>
</html>
""")
print("index.html")

for name, (title, path) in PAGES.items():
    body = (ROOT / "_src" / f"{name}.html").read_text().replace("{{EMAIL}}", email)
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#1b1b1b">
<title>{title}</title>
<link rel="canonical" href="https://evolens.app{path}">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<main>
<a class="brand" href="/">{MARK}evolens</a>
{body}</main>
<footer>
<nav><a href="/support/">Support</a><a href="/privacy/">Privacy Policy</a><a href="/terms/">Terms of Use</a></nav>
© 2026 evolens
</footer>
</body>
</html>
"""
    out = ROOT / ("index.html" if name == "index" else f"{name}/index.html")
    out.parent.mkdir(exist_ok=True)
    out.write_text(html)
    print(out.relative_to(ROOT))
