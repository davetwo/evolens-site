"""Builds evolens.app's pages from _src/ into the site root. Run: python3 -I build.py <contact email>

The home page is Figma 223KnKRHY9zoEcaprJbIGR node 2647:6349 (_src/home.html, assets/home.css, assets/hero.js); the legal
and support pages use assets/site.css. All of them share the nav, badge and footer below, styled by assets/base.css.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# The App Store page, once evolens is live there: https://apps.apple.com/app/id6827268329 (a 404 on 2026-11-02).
# Empty: every badge says "Coming soon" and links nowhere.
APP_STORE_URL = ""
# evolens' profiles. A name with no address is shown as plain text, never as a dead link.
SOCIAL = {"Instagram": "", "TikTok": "", "YouTube": ""}

PAGES = {"privacy": ("Privacy Policy · evolens", "/privacy/", "What the evolens app keeps on your iPhone, what it sends, and to whom."),
         "support": ("Support · evolens", "/support/", "Get help with evolens: subscriptions, scanning, and your data."),
         "terms": ("Terms of Use · evolens", "/terms/", "The terms that apply to the evolens iPhone app and evolens Pro.")}

BADGE_IMG = '<img src="/assets/home/app-store-badge.svg" width="144" height="48" alt="{alt}">'


def badge(note=False):
    """Apple's badge. Before launch it links nowhere; `note` adds the visible caption where there's room for one."""
    if APP_STORE_URL:
        return f'<a class="badge" href="{APP_STORE_URL}">{BADGE_IMG.format(alt="Download on the App Store")}</a>'
    caption = '<span class="badge__note" aria-hidden="true">Coming soon</span>' if note else ""
    return f'<span class="badge" title="Coming soon">{BADGE_IMG.format(alt="Coming soon to the App Store")}{caption}</span>'


def nav(right):
    return (f'<header class="nav"><a class="brand" href="/"><img class="brand__mark" src="/assets/home/mark-black.svg" '
            f'width="26" height="26" alt=""><span class="brand__word" translate="no">evolens</span></a>{right}</header>')


def footer():
    social = "".join(f'<li><a href="{url}">{name}</a></li>' if url else f"<li>{name}</li>"
                     for name, url in SOCIAL.items())
    return f"""<footer class="foot">
  <hr class="foot__rule">
  <div class="foot__row">
    <div class="foot__lead">
      <a class="foot__brand" href="/"><img src="/assets/home/mark-white.svg" width="48" height="48" alt=""><span translate="no">evolens</span></a>
      <p class="foot__tagline">Made for the cards you love.</p>
      {badge(note=True)}
    </div>
    <div class="foot__links">
      <ul aria-label="Follow us"><li class="foot__head">Follow Us</li>{social}</ul>
      <ul aria-label="Info"><li class="foot__head foot__head--info">Info</li><li><a href="/terms/">Terms</a></li><li><a href="/privacy/">Privacy</a></li><li><a href="/support/">Contact</a></li></ul>
    </div>
  </div>
  <p class="foot__legal">© 2026 evolens</p>
</footer>"""


def page(title, path, head, body, description=""):
    meta = f'<meta name="description" content="{description}">\n' if description else ""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#ffffff">
<title>{title}</title>
{meta}<link rel="canonical" href="https://evolens.app{path}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/instrument-sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/base.css">
{head}
</head>
<body>
{body}
</body>
</html>
"""


email = sys.argv[1] if len(sys.argv) > 1 else ""
if "@" not in email:
    sys.exit("usage: python3 -I build.py <contact email>")

home = (ROOT / "_src" / "home.html").read_text().replace("{{BADGE_NOTED}}", badge(note=True))
(ROOT / "index.html").write_text(page(
    "evolens: scan, track, and value your Pokémon cards", "/",
    """<link rel="preload" href="/assets/geist.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/home.css">
<script src="/assets/hero.js" defer></script>""",
    f"{nav(badge())}\n{home}{footer()}",
    "evolens recognizes your Pokémon cards with your iPhone’s camera, keeps your collection organized, and shows what it’s worth."))
print("index.html")

for name, (title, path, description) in PAGES.items():
    body = (ROOT / "_src" / f"{name}.html").read_text().replace("{{EMAIL}}", email)
    out = ROOT / f"{name}/index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page(title, path, '<link rel="stylesheet" href="/assets/site.css">',
                        f'{nav("""<a class="nav__home" href="/">← Home</a>""")}\n<main class="doc">\n{body}</main>\n{footer()}', description))
    print(out.relative_to(ROOT))

# The footer calls Support "Contact", so that address should work too.
out = ROOT / "contact/index.html"
out.parent.mkdir(exist_ok=True)
out.write_text("""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Contact · evolens</title>
<link rel="canonical" href="https://evolens.app/support/">
<meta http-equiv="refresh" content="0; url=/support/">
</head>
<body><a href="/support/">Contact evolens</a></body>
</html>
""")
print(out.relative_to(ROOT))
