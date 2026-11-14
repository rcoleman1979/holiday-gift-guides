"""Idempotent privacy pass for all generated pages. Run after every site build."""
from pathlib import Path
import re
import shutil


def apply_privacy(out, assets=None):
    out = Path(out)
    assets = Path(assets) if assets else Path(__file__).resolve().parents[1] / 'privacy'
    policy = (assets / 'policy.html').read_text()
    signup = (assets / 'signup.html').read_text()
    newsletter = out / 'newsletter' / 'index.html'
    newsletter.parent.mkdir(exist_ok=True)
    newsletter.write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Newsletter | Pykkd</title></head><body><main><h1>The Pykkd newsletter</h1>' + signup + '</main><footer><nav aria-label="Footer"><a href="/">Home</a> <a href="/disclosure/">Disclosure &amp; Privacy</a></nav><p>As an Amazon Associate and Best Buy Creator, Pykkd earns from qualifying purchases.</p></footer></body></html>')
    pages = [p for p in out.rglob('*.html') if p.parent != out / 'privacy']
    for path in pages:
        text = path.read_text()
        # Strip legacy automatic third-party integrations and newsletter prompt logic.
        text = re.sub(r'<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>', '', text)
        text = re.sub(r'<script\b[^>]*>.*?</script>', lambda m: '' if any(k in m[0] for k in ('goatcounter', 'assets.mailerlite.com', "pk_pop_seen")) else m[0], text, flags=re.S)
        text = re.sub(r'<!-- (?:End )?MailerLite Universal -->', '', text)
        text = re.sub(r'<div class="ml-embedded"[^>]*></div>', lambda _: signup, text)
        text = re.sub(r'<form class="pk-newsletter-form".*?</form>\s*', lambda _: signup, text, flags=re.S)
        if path == out / 'disclosure' / 'index.html':
            text = re.sub(r'(<div class="prose">).*?(</div>\s*</main>)', lambda m: m[1] + '\n' + policy + m[2], text, count=1, flags=re.S)
        text = re.sub(r'<!-- Pykkd privacy -->.*?<!-- /Pykkd privacy -->\s*', '', text, flags=re.S)
        text = re.sub(r'<button type="button" data-pk-settings>Privacy settings</button>\s*(?=</nav>)', '', text)
        text = re.sub(r'(<nav aria-label="Footer">.*?)(</nav>)', r'\1<button type="button" data-pk-settings>Privacy settings</button>\2', text, count=1, flags=re.S)
        text = text.replace('</body>', '<!-- Pykkd privacy -->\n<link rel="stylesheet" href="/privacy/controls.css">\n<script src="/privacy/controls.js" defer></script>\n<noscript><p>Analytics is off. <a href="/newsletter/">Newsletter signup</a>. Affiliate links may use referral tracking after you follow them. <a href="/disclosure/">Privacy details</a>.</p></noscript>\n<!-- /Pykkd privacy -->\n</body>')
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
