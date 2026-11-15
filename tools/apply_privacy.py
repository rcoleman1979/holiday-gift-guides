"""Idempotent privacy pass for all generated pages. Run after every site build."""
from pathlib import Path
import re
import shutil

# Official GoatCounter tag plus a DNT/GPC skip. Same snippet as build_site.GC_TAG.
GC_TAG = (
    "<script>window.goatcounter=Object.assign(window.goatcounter||{},"
    "{no_onload:(navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true)});</script>\n"
    '<script data-goatcounter="https://pykkd.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>\n'
)

GSC_TAG = '<meta name="google-site-verification" content="j10a8RQAEEGiklV-BChue3CjUwvU1DCNEzhaOia3wDs" />'


def ensure_gsc_tag(text):
    if 'name="google-site-verification"' in text:
        return text
    if '<meta charset="utf-8">' in text:
        return text.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + GSC_TAG, 1)
    if '<head>' in text:
        return text.replace('<head>', '<head>\n' + GSC_TAG, 1)
    return text



def apply_privacy(out, assets=None):
    out = Path(out)
    assets = Path(assets) if assets else Path(__file__).resolve().parents[1] / 'privacy'
    policy = (assets / 'policy.html').read_text()
    signup = (assets / 'signup.html').read_text()
    newsletter = out / 'newsletter' / 'index.html'
    newsletter.parent.mkdir(exist_ok=True)
    newsletter.write_text('<!doctype html><html lang="en"><head><meta charset="utf-8">' + GSC_TAG + '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Newsletter | Pykkd</title></head><body><main><h1>The Pykkd newsletter</h1>' + signup + '</main><footer><nav aria-label="Footer"><a href="/">Home</a> <a href="/disclosure/">Disclosure &amp; Privacy</a></nav><p>As an Amazon Associate and Best Buy Creator, Pykkd earns from qualifying purchases.</p></footer></body></html>')
    pages = [p for p in out.rglob('*.html') if p.parent != out / 'privacy']
    for path in pages:
        text = ensure_gsc_tag(path.read_text())
        # Strip legacy automatic third-party integrations and newsletter prompt logic.
        # Keep the cookieless GoatCounter tag so visits are counted by default.
        text = re.sub(r'<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>', '', text)
        text = re.sub(r'<script\b[^>]*>.*?</script>', lambda m: '' if any(k in m[0] for k in ('assets.mailerlite.com', "pk_pop_seen")) else m[0], text, flags=re.S)
        text = re.sub(r'<!-- (?:End )?MailerLite Universal -->', '', text)
        text = re.sub(r'<div class="ml-embedded"[^>]*></div>', lambda _: signup, text)
        text = re.sub(r'<form class="pk-newsletter-form".*?</form>\s*', lambda _: signup, text, flags=re.S)
        if path == out / 'disclosure' / 'index.html':
            text = re.sub(r'(<div class="prose">).*?(</div>\s*</main>)', lambda m: m[1] + '\n' + policy + m[2], text, count=1, flags=re.S)
        text = re.sub(r'<!-- Pykkd privacy -->.*?<!-- /Pykkd privacy -->\s*', '', text, flags=re.S)
        text = re.sub(r'<button type="button" data-pk-settings>Privacy settings</button>\s*', '', text)
        if 'data-goatcounter="https://pykkd.goatcounter.com/count"' not in text:
            text = text.replace('</body>', GC_TAG + '</body>')
        text = text.replace('</body>', '<!-- Pykkd privacy -->\n<link rel="stylesheet" href="/privacy/controls.css">\n<script src="/privacy/controls.js" defer></script>\n<noscript><p><a href="/newsletter/">Newsletter signup</a>. Affiliate links may use referral tracking after you follow them. <a href="/disclosure/">Privacy details</a>.</p></noscript>\n<!-- /Pykkd privacy -->\n</body>')
        path.write_text(text)
    dest = out / 'privacy'
    dest.mkdir(exist_ok=True)
    for name in ('controls.js', 'controls.css', 'policy.html', 'signup.html'):
        src = assets / name
        if src.resolve() != (dest / name).resolve(): shutil.copy2(src, dest / name)
    return len(pages)

if __name__ == '__main__':
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('output')
    p.add_argument('--assets')
    a = p.parse_args()
    print('Privacy pass:', apply_privacy(a.output, a.assets), 'pages')
