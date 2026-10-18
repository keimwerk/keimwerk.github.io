/* Keimwerk Flashbang Easter Egg – keinerlei Einfluss auf Rechner oder gespeicherte Daten. */
(() => {
  'use strict';
  // Only the visible top-level page gets a control. Embedded tools use the parent's control.
  if (window.self !== window.top) return;

  const init = () => {
    if (document.getElementById('kw-flashbang-button')) return;

    const trigger = document.createElement('button');
    trigger.id = 'kw-flashbang-button';
    trigger.className = 'kw-flashbang-button';
    trigger.type = 'button';
    trigger.textContent = '💥 FLASHBANG!';
    trigger.title = 'Easter Egg: Ein Klick macht den Bildschirm kurz sehr hell. Kein Stroboskop.';
    trigger.setAttribute('aria-label', 'Flashbang-Easter-Egg auslösen. Achtung: Der Bildschirm wird kurz sehr hell.');

    const veil = document.createElement('div');
    veil.id = 'kw-flashbang-overlay';
    veil.className = 'kw-flashbang-overlay';
    veil.hidden = true;
    veil.setAttribute('aria-hidden', 'true');
    veil.innerHTML = '<div class="kw-flashbang-message"><strong>DU WURDEST GEBLENDET!</strong><span>KEIMWERK TACTICAL EDITION · 💥</span></div>';

    const live = document.createElement('span');
    live.className = 'kw-flashbang-sr-only';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');

    document.body.append(trigger, veil, live);
    let fallback = null;
    let running = false;

    function endFlash() {
      if (!running) return;
      running = false;
      if (fallback !== null) { clearTimeout(fallback); fallback = null; }
      veil.classList.remove('kw-flashbang-active');
      veil.hidden = true;
      trigger.disabled = false;
      live.textContent = 'Flashbang vorbei.';
    }

    function flash() {
      if (running) return;
      running = true;
      trigger.disabled = true;
      veil.hidden = false;
      // Restart the CSS animation without repeatedly alternating light and dark.
      veil.classList.remove('kw-flashbang-active');
      void veil.offsetWidth;
      veil.classList.add('kw-flashbang-active');
      live.textContent = 'Flashbang ausgelöst. Escape bricht den Effekt ab.';
      fallback = setTimeout(endFlash, 3200);
    }

    trigger.addEventListener('click', flash);
    veil.addEventListener('animationend', endFlash);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && running) endFlash();
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
