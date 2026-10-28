"""Builds evolens.app's pages from _src/ into the site root. Run: python3 -I build.py <contact email>"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAGES = {"index": ("evolens", "/"), "privacy": ("Privacy Policy · evolens", "/privacy/"),
         "support": ("Support · evolens", "/support/"), "terms": ("Terms of Use · evolens", "/terms/")}
MARK = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" '
        'd="M8.1 1h7.8L23 8.1v7.8L15.9 23H8.1L1 15.9V8.1zM12 6.2l-2.9 5.8 2.9 5.8 2.9-5.8z"/></svg>')

email = sys.argv[1] if len(sys.argv) > 1 else ""
if "@" not in email:
    sys.exit("usage: python3 -I build.py <contact email>")

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
