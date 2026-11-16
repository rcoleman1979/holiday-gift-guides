"""Content rules for the built site (stdlib only). Usage: python3 content_rules.py <public_dir>
- no prices: no "$<digits>" in visible text, JSON-LD or the search index, except budget themes ("under $50", "over $200") and non-Amazon prices on /daily-deals/
- Amazon links are direct one-click: https://www.amazon.com/dp/<ASIN>?tag=killagorillab-20, no onclick/interstitial
- buttons read "View on Amazon" / "View on Best Buy"
- guide pages carry: updated date, quick picks, comparison table, trust box, a who-it's-for line per pick
- retired guide URLs are redirect pages (meta refresh + canonical), absent from sitemap/search
- no owner name on public pages, the AERLANG massage gun is never called heated, search uses no cookies/storage
"""
import json, re, sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
AMZ_OK = re.compile(r"^https://www\.amazon\.com/(dp/[A-Z0-9]{10}|prime|hz/audible/[a-z-]+)\?tag=killagorillab-20$")  # direct, no redirect hops
PRICE = re.compile(r"(.{0,12})\$\s?\d")
BUDGET_OK = re.compile(r"(?i)(under|over)[\s-]*$")
REDIRECTS = {"korean-skincare-k-beauty": "k-beauty-skincare-favorites"}
errors = []


def visible(html):
    html = re.sub(r"(?is)<(style|script)\b[^>]*>.*?</\1>", " ", html)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))


def check_prices(text, where, allow_non_amazon=False):
    for m in PRICE.finditer(text):
        if BUDGET_OK.search(m.group(1)):
            continue
        if allow_non_amazon:
            ctx = text[max(0, m.start() - 80): m.end() + 80]
            # Amazon (and Amazon-owned Woot) prices stay banned, even on /daily-deals/.
            if not re.search(r"(?i)amazon|amzn\.|\bwoot\b", ctx):
                continue
        errors.append(f"price-like text on {where}: {m.group(0)!r}")


sitemap = (root / "sitemap.xml").read_text()
guides = n_amz = n_bb = 0
for p in sorted(root.rglob("*.html")):
    rel = p.relative_to(root)
    html = p.read_text()
    if "</body>" not in html:
        continue
    vis = visible(html)
    allow_non_amazon = rel.parts[:1] == ("daily-deals",)
    check_prices(vis, rel, allow_non_amazon=allow_non_amazon)
    for ld in re.findall(r'(?is)<script type="application/ld\+json">(.*?)</script>', html):
        check_prices(ld, f"{rel} (JSON-LD)", allow_non_amazon=allow_non_amazon)
    for tag in re.findall(r"<a\b[^>]*>", html):
        m = re.search(r'href="([^"]+)"', tag)
        if not m:
            continue
        href = m.group(1).replace("&amp;", "&")
        if "amazon." in href or "amzn." in href:
            n_amz += 1
            if not AMZ_OK.match(href):
                errors.append(f"non-direct Amazon link on {rel}: {href}")
            if "onclick" in tag.lower():
                errors.append(f"onclick on Amazon link on {rel}")
        if "bestbuycreators" in href:
            n_bb += 1
    for bad in ("Buy at Best Buy", "Check price on Amazon"):
        if bad in vis:
            errors.append(f"old button text {bad!r} on {rel}")
    for b in re.findall(r'<a class="btn( bestbuy)?" href="(?:https://www\.amazon\.com/|https://bestbuycreators)[^"]*"[^>]*>([^<]*)</a>', html):
        want = "View on Best Buy" if b[0] else "View on Amazon"
        if b[1].strip() != want:
            errors.append(f"button text {b[1]!r} on {rel} (want {want!r})")
    if re.search(r"\bRoger\b|rcoleman|r\.coleman", vis, re.I):
        errors.append(f"owner name visible on {rel}")
    for m in re.finditer(r"AERLANG", vis):
        if re.search(r"(?i)heat", vis[max(0, m.start() - 80): m.end() + 80]):
            errors.append(f"AERLANG near 'heat' on {rel}: {vis[max(0, m.start() - 80): m.end() + 80]!r}")
    slug = rel.parts[0] if len(rel.parts) == 2 else None
    if slug in REDIRECTS:
        tgt = REDIRECTS[slug]
        if not re.search(rf'<meta http-equiv="refresh" content="0; url=[^"]*/{tgt}/">', html):
            errors.append(f"{rel}: missing meta refresh to {tgt}")
        if not re.search(rf'<link rel="canonical" href="[^"]*/{tgt}/">', html):
            errors.append(f"{rel}: missing canonical to {tgt}")
        if f"/{slug}/" in sitemap:
            errors.append(f"{slug} still in sitemap")
        continue
    if 'class="ghead"' in html:  # guide page
        guides += 1
        cards = len(re.findall(r'<li class="card" id="pick-', html))
        whos = html.count('<p class="who">')
        for need in ('class="upd"', 'class="sumbox"', 'class="cmp"', 'class="trust"', "Why trust Pykkd"):
            if need not in html:
                errors.append(f"{rel}: missing {need}")
        if cards == 0 or whos != cards:
            errors.append(f"{rel}: {whos} who-it's-for lines for {cards} picks")
        if "Updated" not in vis:
            errors.append(f"{rel}: no Updated date")

idx = json.loads((root / "search-index.json").read_text())
check_prices(json.dumps(idx["items"], ensure_ascii=False), "search-index.json")
for it in idx["items"]:
    if it.get("amazon") and not AMZ_OK.match(it["amazon"]):
        errors.append(f"search index Amazon link not direct: {it['amazon']}")
    for s in REDIRECTS:
        if it.get("url", "").startswith(f"{s}/"):
            errors.append(f"retired guide {s} in search index")
js = (root / "search.js").read_text()
for bad in ("localStorage", "sessionStorage", "document.cookie", "http://", "https://"):
    if bad in js:
        errors.append(f"search.js uses {bad}")

if errors:
    print("\n".join(errors[:80]))
    print(f"FAIL: {len(errors)} problem(s)")
    sys.exit(1)
print(f"PASS: content rules, {guides} guide pages, {n_amz} direct Amazon links, {n_bb} Best Buy links, no Amazon prices, redirects OK")
