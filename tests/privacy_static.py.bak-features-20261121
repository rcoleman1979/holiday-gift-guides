"""Static integration/link/idempotence regressions, standard library only."""
import re
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote
root = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
pages = [p for p in root.rglob('*.html') if p.parent != root / 'privacy']
count=0
GC_ATTR = 'data-goatcounter="https://pykkd.goatcounter.com/count"'
for p in pages:
    text=p.read_text()
    if '</body>' not in text: continue  # Google verification token, not a visitor page.
    assert text.count('src="/privacy/controls.js"')==1, p
    assert GC_ATTR in text, p
    assert 'gc.zgo.at/count.js' in text, p
    assert 'data-pk-settings' not in text, p
    assert 'id="pk-privacy"' not in text and 'pk-privacy-box' not in text, p
    for tag in re.findall(r'<(?:script|link)\b[^>]*>',text):
        assert not any(x in tag for x in ['fonts.googleapis.com','fonts.gstatic.com','assets.mailerlite.com']), (p,tag)
    assert 'pk_pop_seen' not in text or p == root/'disclosure/index.html', p
    assert 'As an Amazon Associate and Best Buy Creator, Pykkd earns from qualifying purchases.' in text, p
    if '<p class="disc">' in text:
        assert '<p class="disc">As an Amazon Associate and Best Buy Creator, Pykkd earns from qualifying purchases.</p>' in text, p
    for href in re.findall(r'(?:href|src)="([^"#]+)"',text):
        url=urlparse(href.replace('&amp;','&'))
        if url.scheme or url.netloc: continue
        target=root/unquote(url.path).lstrip('/') if url.path.startswith('/') else p.parent/unquote(url.path)
        if target.is_dir(): target=target/'index.html'
        assert target.exists(), (p,href)
        count+=1
policy=(root/'disclosure/index.html').read_text()
assert "We don't run accounts, comment forms, newsletters" not in policy
assert 'Pykkd sets no cookies' in policy
assert 'never sold' in policy
assert 'GoatCounter counts visits automatically without cookies' in policy
assert 'Do Not Track' in policy
assert 'Third parties such as Amazon, Best Buy, and MailerLite may set cookies on their own sites.' in policy
home=(root/'index.html').read_text()
news=(root/'newsletter/index.html').read_text()
for label,page in (('home',home),('newsletter',news)):
    assert 'Get our best finds in your inbox' in page, label
    assert 'Tick the daily deals box on the next page if you want that too.' in page, label
    assert 'Sign up free' in page, label
    assert 'preview.mailerlite.io/forms/2744558/202421660617278565/share' in page, label
    assert 'Continue to newsletter signup' not in page, label
    assert 'Nothing is submitted just by opening the form' not in page, label
    assert 'Newsletter signup is hosted by MailerLite. Continuing opens its form' not in page, label
assert 'Last updated November 15, 2026' in policy
assert 'Privacy settings' not in policy
assert 'unless you enable it' not in policy
print(f'PASS: {len(pages)} pages, {count} internal asset/link targets, GoatCounter present by default, no consent toggle, no automatic vendor fonts/MailerLite')

controls=(root/'privacy/controls.js').read_text()
assert 'window.confirm' not in controls
assert "removeAttribute('href')" not in controls
assert 'gc.zgo.at' not in controls
assert 'data-pk-settings' not in controls
assert 'Amazon (paid link)' in (root/'search.js').read_text()
print('PASS: direct links retain hrefs, no confirmation, top disclosure retained, search disclosure present, controls.js has no analytics consent UI')
