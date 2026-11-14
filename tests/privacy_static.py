"""Static integration/link/idempotence regressions, standard library only."""
import importlib.util
import re
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote
root = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
pages = [p for p in root.rglob('*.html') if p.parent != root / 'privacy']
count=0
for p in pages:
    text=p.read_text()
    if '</body>' not in text: continue  # Google verification token, not a visitor page.
    assert text.count('src="/privacy/controls.js"')==1, p
    for tag in re.findall(r'<(?:script|link)\b[^>]*>',text):
        assert not any(x in tag for x in ['fonts.googleapis.com','fonts.gstatic.com','gc.zgo.at','assets.mailerlite.com']), (p,tag)
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
assert "We don't run accounts, comment forms, newsletters" not in (root/'disclosure/index.html').read_text()
print(f'PASS: {len(pages)} pages, {count} internal asset/link targets, no automatic vendor scripts/fonts')

controls=(root/'privacy/controls.js').read_text()
assert 'window.confirm' not in controls
assert "removeAttribute('href')" not in controls
assert 'Amazon (paid link)' in (root/'search.js').read_text()
print('PASS: direct links retain hrefs, no confirmation, top disclosure retained, search disclosure present')
