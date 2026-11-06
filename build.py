"""Builds evolens.app's pages from _src/ into the site root. Run: python3 -I build.py <contact email>

The home page is Figma 223KnKRHY9zoEcaprJbIGR node 2647:6349 (_src/home.html, assets/home.css, assets/hero.js); the legal
and support pages use assets/site.css. All of them share the nav, badge and footer below, styled by assets/base.css.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# evolens' App Store page. Empty: every badge links nowhere.
APP_STORE_URL = "https://apps.apple.com/us/app/evolens-tcg-card-scanner/id6827268329"
# Apple's provider token (pt=), shown in App Store Connect › Analytics › Acquisition › Campaigns once a campaign link is
# made there. With it, badges are campaign links: campaign "web", or "web-<source>" for a visitor who arrived from a
# short link below (Apple reports downloads per campaign). Empty: plain App Store links.
APP_STORE_PT = ""
# evolens' profiles. A name with no address is shown as plain text, never as a dead link.
SOCIAL = {"Instagram": "", "TikTok": "", "YouTube": ""}
# Short links for profiles: evolens.app/<source>/ opens the home page tagged utm_source=<source>, utm_medium=social,
# utm_campaign=bio. Only these sources become App Store campaigns, so stray tags can't make new ones.
CAMPAIGN_SOURCES = ("tiktok", "instagram", "youtube")

# Website analytics: Umami Cloud's free Hobby plan (no cookies; 100K events a month, 6 months kept). Empty: none.
# Pageviews, plus one event, app_store_click with its placement (2 events). /no-track/ stops counting a browser.
UMAMI_WEBSITE_ID = "ea72774c-73b4-46a5-b9c8-33fcbb3296d9"

PAGES = {"privacy": ("Privacy Policy · evolens", "/privacy/", "What the evolens app keeps on your iPhone, what it sends, and to whom."),
         "support": ("Support · evolens", "/support/", "Get help with evolens: subscriptions, scanning, and your data."),
         "terms": ("Terms of Use · evolens", "/terms/", "The terms that apply to the evolens iPhone app and evolens Pro.")}

# The hero's scripted scans, in order: name, value in cents, art, edge light, screen color (top, bottom; None: neutral).
# Values are TCGplayer's market price for each exact printing's holofoil, read on 2026-11-02 (product ids, as bound in
# evolens' pricing: 704873, 676100, 717605, 633031, 535085, 560382). They're fixed here, so they age until updated.
DEMO_CARDS = [
    ("Mega Darkrai ex", 13765, "mega-darkrai-ex", "#c6cf9f", None),
    ("Fezandipiti ex", 3770, "fezandipiti-ex", "#d9a6c8", ("#551b50", "#371539")),
    ("Mew ex", 6512, "mew-ex", "#cfc4a6", ("#403419", "#392e15")),
    ("Team Rocket’s Mewtwo ex", 32347, "team-rockets-mewtwo-ex", "#d39aa8", ("#4a1826", "#2f111c")),
    ("Gardevoir ex", 16067, "gardevoir-ex", "#a3d4d2", ("#123f44", "#0e2e33")),
    ("Cresselia", 2487, "cresselia", "#b4d0e2", None),
]

BADGE_IMG = '<img src="/assets/home/app-store-badge.svg" width="144" height="48" alt="{alt}">'


def badge(placement):
    """Apple's badge. Before launch it links nowhere. placement (nav, hero or footer) is reported with each tap."""
    if APP_STORE_URL:
        href = f"{APP_STORE_URL}?pt={APP_STORE_PT}&amp;ct=web&amp;mt=8" if APP_STORE_PT else APP_STORE_URL
        return (f'<a class="badge" href="{href}" data-placement="{placement}">'
                f'{BADGE_IMG.format(alt="Download on the App Store")}</a>')
    return f'<span class="badge">{BADGE_IMG.format(alt="Coming soon to the App Store")}</span>'


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
      {badge("footer")}
    </div>
    <div class="foot__links">
      <ul aria-label="Follow us"><li class="foot__head">Follow Us</li>{social}</ul>
      <ul aria-label="Info"><li class="foot__head foot__head--info">Info</li><li><a href="/terms/">Terms</a></li><li><a href="/privacy/">Privacy</a></li><li><a href="/support/">Contact</a></li></ul>
    </div>
  </div>
  <p class="foot__legal">© 2026 evolens</p>
</footer>"""


def money(cents):
    return f"${cents / 100:.2f}"


def demo_parts():
    """The hero's per-card pieces. hero.js reads their order and values from here."""
    tints, cards, edges, results = [], [], [], []
    for i, (name, cents, art, light, tint) in enumerate(DEMO_CARDS):
        if tint:
            tints.append(f'<div class="demo__tint" data-tint="{i}" style="background:linear-gradient({tint[0]},{tint[1]})"></div>')
        later = " demo__card--later" if i else ""
        priority = "high" if i == 0 else "low"
        cards.append(f'          <div class="demo__card{later}" data-card><img src="/assets/home/cards/{art}.webp" alt="" '
                     f'width="660" height="922" fetchpriority="{priority}"></div>')
        edges.append(f'<div class="demo__edge" data-edge="{i}" style="--light:{light}"></div>')
        results.append(f'        <div class="demo__result" data-result data-cents="{cents}"><p class="demo__name">{name}</p>'
                       f'<p class="demo__price">{money(cents)}</p></div>')
    last = DEMO_CARDS[-1]
    return {"{{DEMO_SCREEN}}": "".join(tints + edges), "{{DEMO_CARDS}}": "\n".join(cards), "{{DEMO_RESULTS}}": "\n".join(results),
            "{{DEMO_FIRST_VALUE}}": money(DEMO_CARDS[0][1]), "{{TILE_NAME}}": last[0], "{{TILE_VALUE}}": money(last[1]),
            "{{TILE_TOTAL}}": money(sum(c[1] for c in DEMO_CARDS))}


def analytics():
    """The tracker, counting only on evolens.app, and once the App Store is linked, the badges' taps and campaign."""
    if not UMAMI_WEBSITE_ID:
        return "", ""
    head = (f'<script defer src="https://cloud.umami.is/script.js" data-website-id="{UMAMI_WEBSITE_ID}" '
            'data-domains="evolens.app" data-do-not-track="true"></script>\n')
    if not APP_STORE_URL:
        return head, ""
    campaign = (f"const source = new URLSearchParams(location.search).get('utm_source')?.toLowerCase(), "
                f"ct = {list(CAMPAIGN_SOURCES)}.includes(source) && `web-${{source}}`;" if APP_STORE_PT else "const ct = false;")
    return head, f"""<script>{{ {campaign}
for (const a of document.querySelectorAll('a.badge')) {{
  if (ct) {{ const url = new URL(a.href); url.searchParams.set('ct', ct); a.href = url; }}
  a.addEventListener('click', () => window.umami?.track('app_store_click', {{ placement: a.dataset.placement }}));
}} }}</script>
"""


def page(title, path, head, body, description="", counted=True):
    meta = f'<meta name="description" content="{description}">\n' if description else ""
    tracker, taps = analytics() if counted else ("", "")
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
{tracker}{head}
</head>
<body>
{body}
{taps}<script>new IntersectionObserver(([e]) => {{ document.documentElement.classList.toggle('at-foot', e.isIntersecting); document.querySelector('meta[name=theme-color]').content = e.isIntersecting ? '#191919' : '#ffffff'; }}).observe(document.querySelector('.foot'))</script>
</body>
</html>
"""


email = sys.argv[1] if len(sys.argv) > 1 else ""
if "@" not in email:
    sys.exit("usage: python3 -I build.py <contact email>")

home = (ROOT / "_src" / "home.html").read_text().replace("{{BADGE}}", badge("hero"))
for marker, html in demo_parts().items():
    home = home.replace(marker, html)
(ROOT / "index.html").write_text(page(
    "evolens: scan, track, and value your Pokémon cards", "/",
    """<link rel="preload" href="/assets/geist.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/home.css">
<script src="/assets/hero.js" defer></script>""",
    f"{nav(badge('nav'))}\n{home}{footer()}",
    "evolens recognizes your Pokémon cards with your iPhone’s camera, keeps your collection organized, and shows what it’s worth."))
print("index.html")

for name, (title, path, description) in PAGES.items():
    body = (ROOT / "_src" / f"{name}.html").read_text().replace("{{EMAIL}}", email)
    out = ROOT / f"{name}/index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page(title, path, '<link rel="stylesheet" href="/assets/site.css">',
                        f'{nav("""<a class="nav__home" href="/">← Home</a>""")}\n<main class="doc">\n{body}</main>\n{footer()}', description))
    print(out.relative_to(ROOT))

# Turns website analytics off (or back on) in this browser: Umami skips any browser with umami.disabled stored.
out = ROOT / "no-track/index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(page("Analytics · evolens", "/no-track/", """<link rel="stylesheet" href="/assets/site.css">
<meta name="robots" content="noindex">""", f"""{nav('<a class="nav__home" href="/">← Home</a>')}
<main class="doc">
<h1>Website analytics</h1>
<p data-state></p>
<p>Other browsers, including the ones built into apps like TikTok and Instagram, keep their own setting.</p>
<p><button type="button" data-switch></button></p>
</main>
{footer()}
<script>{{
const state = document.querySelector('[data-state]'), button = document.querySelector('[data-switch]');
const show = () => {{
  const off = localStorage.getItem('umami.disabled');
  state.textContent = off ? 'Visits from this browser aren’t counted.' : 'Visits from this browser are counted.';
  button.textContent = off ? 'Count this browser again' : 'Stop counting this browser';
}};
button.onclick = () => {{
  localStorage.getItem('umami.disabled') ? localStorage.removeItem('umami.disabled') : localStorage.setItem('umami.disabled', 1);
  show();
}};
localStorage.setItem('umami.disabled', 1);
show();
}}</script>""", counted=False))
print(out.relative_to(ROOT))

# Profile short links: no tracker here, so the tagged home page is the one visit counted.
for source in CAMPAIGN_SOURCES:
    target = f"/?utm_source={source}&amp;utm_medium=social&amp;utm_campaign=bio"
    out = ROOT / f"{source}/index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>evolens</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="https://evolens.app/">
<meta http-equiv="refresh" content="0; url={target}">
<script>location.replace('{target.replace("&amp;", "&")}')</script>
</head>
<body><a href="{target}">evolens</a></body>
</html>
""")
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
