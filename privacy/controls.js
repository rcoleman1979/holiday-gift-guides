/* Newsletter panel only. GoatCounter is loaded from the page tag and skips DNT/GPC on its own. */
(function () {
  'use strict';
  try { localStorage.removeItem('pk_pop_seen'); localStorage.removeItem('pk_pop_done'); } catch (_) {}

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
}());
