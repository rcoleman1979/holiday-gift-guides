/* No optional network request is made until an explicit choice. */
(function () {
  'use strict';
  var KEY = 'pk_privacy_v1', MAX_AGE = 180 * 864e5;
  function gpc() { return navigator.globalPrivacyControl === true; }
  function read() {
    try {
      var p = JSON.parse(localStorage.getItem(KEY));
      if (p && p.version === 1 && typeof p.analytics === 'boolean' &&
          p.at <= Date.now() && Date.now() - p.at < MAX_AGE) return p;
      localStorage.removeItem(KEY); return null;
    } catch (_) { return null; }
  }
  function save(allow) {
    try { localStorage.setItem(KEY, JSON.stringify({version:1, analytics:allow && !gpc(), at:Date.now()})); } catch (_) {}
  }
  try { localStorage.removeItem('pk_pop_seen'); localStorage.removeItem('pk_pop_done'); } catch (_) {}
  var choice = read(), loaded = false, lastFocus;
  var box = document.createElement('section');
  box.className = 'pk-privacy-box'; box.id = 'pk-privacy';
  box.setAttribute('aria-labelledby', 'pk-privacy-heading');
  box.innerHTML = '<h2 id="pk-privacy-heading">Your privacy choices</h2><p>Reading Pykkd needs no optional analytics. GoatCounter stays off unless you allow it. Newsletter signup is separate.</p><p id="pk-gpc-note"></p><p><a href="/disclosure/">Privacy policy &amp; affiliate disclosure</a></p><button type="button" data-choice="no">Reject analytics</button><button type="button" data-choice="yes">Allow analytics</button><button type="button" data-choice="close">Close</button>';
  document.body.appendChild(box);
  function show() {
    lastFocus = document.activeElement; box.hidden = false;
    box.querySelector('#pk-gpc-note').textContent = gpc() ? 'Global Privacy Control is on. Analytics and affiliate navigation are blocked.' : '';
    box.querySelector('[data-choice="yes"]').disabled = gpc();
    box.querySelector('[data-choice="no"]').focus();
  }
  function hide() { box.hidden = true; if (lastFocus && lastFocus.isConnected) lastFocus.focus(); }
  function start() {
    if (loaded || gpc()) return;
    loaded = true;
    var s = document.createElement('script'); s.async = true;
    s.dataset.goatcounter = 'https://pykkd.goatcounter.com/count';
    s.src = 'https://gc.zgo.at/count.js'; document.head.appendChild(s);
  }
  box.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-choice]'); if (!b) return;
    if (b.dataset.choice === 'close') { hide(); return; }
    var allow = b.dataset.choice === 'yes' && !gpc(); save(allow); hide();
    if (!allow && loaded) { window.location.reload(); return; }
    if (allow) start();
  });
  box.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') hide(); });
  document.addEventListener('click', function (ev) {
    if (ev.target.closest('[data-pk-settings]')) { ev.preventDefault(); show(); }
  });
  window.addEventListener('storage', function (ev) { if (ev.key === KEY) window.location.reload(); });
  if (gpc()) { save(false); box.hidden = true; }
  else if (!choice) show();
  else { box.hidden = true; if (choice.analytics) start(); }

  // Local newsletter panel: no vendor JavaScript or automatic popup/storage.
  var modal = document.getElementById('pk-pop'), previous;
  function closeSignup() { if (modal) modal.hidden = true; if (previous) previous.focus(); }
  window.pkOpenSignup = function () {
    if (!modal) return; previous = document.activeElement; modal.hidden = false;
    modal.querySelector('.pk-pop-x').focus();
  };
  document.addEventListener('click', function (ev) {
    if (ev.target.closest('[data-pk-open]')) { ev.preventDefault(); window.pkOpenSignup(); }
    if (modal && modal.contains(ev.target) && ev.target.hasAttribute('data-close')) closeSignup();
  });
  document.addEventListener('keydown', function (ev) {
    if (!modal || modal.hidden) return;
    if (ev.key === 'Escape') closeSignup();
    if (ev.key === 'Tab') {
      var nodes = modal.querySelectorAll('button,a[href],input:not([type=hidden])');
      var first = nodes[0], end = nodes[nodes.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); end.focus(); }
      else if (!ev.shiftKey && document.activeElement === end) { ev.preventDefault(); first.focus(); }
    }
  });
  function affiliate(a) {
    if (!a || !(a.href || a.dataset.pkAffiliateHref)) return false;
    var u = new URL(a.href || a.dataset.pkAffiliateHref);
    return /(^|\.)amazon\.[a-z.]+$/.test(u.hostname) && u.searchParams.has('tag') ||
      /(^|\.)(linksynergy\.com|rakutenadvertising\.com)$/.test(u.hostname) ||
      /(^|\.)(amzn\.to|rstyle\.me|go\.skimresources\.com)$/.test(u.hostname) ||
      (a.rel || '').split(/\s+/).indexOf('sponsored') !== -1;
  }
  if (gpc()) document.querySelectorAll('a[href]').forEach(function (a) {
    if (affiliate(a)) {
      a.dataset.pkAffiliateHref = a.href; a.removeAttribute('href');
      a.setAttribute('role', 'link'); a.setAttribute('aria-disabled', 'true'); a.tabIndex = 0;
    }
  });
  function beforeAffiliate(ev) {
    var a = ev.target.closest('a[href],a[data-pk-affiliate-href]'); if (!affiliate(a)) return;
    if (gpc()) {
      ev.preventDefault(); ev.stopImmediatePropagation();
      window.alert('Global Privacy Control is on, so this affiliate visit is blocked. You can find this product independently at the retailer.'); return;
    }
    if (!window.confirm('This is an affiliate link. The retailer or network will receive referral and connection information and may use tracking cookies to attribute purchases. Continue to the retailer?')) {
      ev.preventDefault(); ev.stopImmediatePropagation();
    }
  }
  document.addEventListener('click', beforeAffiliate, true);
  document.addEventListener('auxclick', beforeAffiliate, true);
  document.addEventListener('keydown', function (ev) { if (gpc() && ev.key === 'Enter') beforeAffiliate(ev); }, true);
}());
