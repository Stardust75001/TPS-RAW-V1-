/* theme-custom.js – interactions pour ton CSS */

(() => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  // ---------- Offcanvas (cart, wishlist, générique) ----------
  // Compatible BS5 si présent; sinon, on gère la classe .show + overflow body
  const bodyLock = (lock) => document.documentElement.classList.toggle('offcanvas-open', !!lock);
  const toggleOffcanvas = (targetSel, show) => {
    const panel = $(targetSel);
    if (!panel) return;
    if (show) panel.classList.add('show'); else panel.classList.remove('show');
    bodyLock(show);
    if (show) {
      // focus trap simple
      const focusables = $$('a, button, input, [tabindex]:not([tabindex="-1"])', panel);
      focusables[0]?.focus();
      const trap = (e) => {
        if (!panel.classList.contains('show')) { document.removeEventListener('keydown', trap); return; }
        if (e.key !== 'Tab' || focusables.length === 0) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      };
      document.addEventListener('keydown', trap);
    }
  };

  // Triggers: <button data-toggle="offcanvas" data-target="#offcanvas-cart">
  $$('[data-toggle="offcanvas"][data-target]').forEach(btn => {
    on(btn, 'click', (e) => {
      e.preventDefault();
      const sel = btn.getAttribute('data-target');
      toggleOffcanvas(sel, true);
    });
  });
  // Close buttons: <button data-dismiss="offcanvas" data-target="#offcanvas-cart">
  $$('[data-dismiss="offcanvas"][data-target]').forEach(btn => {
    on(btn, 'click', (e) => {
      e.preventDefault();
      toggleOffcanvas(btn.getAttribute('data-target'), false);
    });
  });
  // Échap pour fermer
  on(document, 'keydown', (e) => {
    if (e.key === 'Escape') {
      $$('.offcanvas.show').forEach(p => p.classList.remove('show'));
      bodyLock(false);
    }
  });

  // ---------- Stories: hover/tap zoom + tooltip ----------
  $$('.animated-stories-link').forEach(item => {
    const img = $('img', item);
    const tip = item.querySelector('.tooltip-bubble');
    // Mobile tap-zoom
    on(item, 'click', () => item.classList.toggle('tap-zoom'));
    // Tooltip hover/focus (si .tooltip-bubble présent)
    const showTip = () => tip && tip.classList.add('visible','hover-visible');
    const hideTip = () => tip && tip.classList.remove('visible','hover-visible','tap-visible');
    on(item, 'mouseenter', showTip);
    on(item, 'mouseleave', hideTip);
    on(item, 'focusin', showTip);
    on(item, 'focusout', hideTip);
    // Tap tooltip (2e tap)
    on(item, 'touchend', () => tip && tip.classList.toggle('tap-visible'), {passive:true});
    // Empêche le drag image sélection
    img && (img.draggable = false);
  });

  // ---------- Dropdown langue minimal ----------
  // Markup attendu : .language-dropdown avec un bouton .flag-link et une liste .dropdown-menu
  $$('.language-dropdown').forEach(drop => {
    const btn = $('.flag-link', drop);
    const menu = $('.dropdown-menu', drop) || drop.querySelector('ul,div');
    if (!btn || !menu) return;
    on(btn, 'click', (e) => {
      e.preventDefault();
      drop.classList.toggle('open');
      menu.hidden = !drop.classList.contains('open');
    });
    on(document, 'click', (e) => {
      if (!drop.contains(e.target)) {
        drop.classList.remove('open');
        if (menu) menu.hidden = true;
      }
    });
  });

  // ---------- Wishlist share: copie lien + feedback ----------
  // Boutons dans #wishlist-share-dropdown avec data-share-copy="[texte ou url]"
  const feedback = $('.share-feedback');
  const showFeedback = (ok=true, msgOk='Lien copié !', msgErr='Erreur de copie') => {
    if (!feedback) return;
    feedback.textContent = ok ? msgOk : msgErr;
    feedback.classList.toggle('error', !ok);
    feedback.classList.add('show');
    setTimeout(() => feedback.classList.remove('show'), 1800);
  };
  $$('#wishlist-share-dropdown [data-share-copy]').forEach(item => {
    on(item, 'click', async (e) => {
      e.preventDefault();
      item.classList.add('loading');
      try {
        const text = item.getAttribute('data-share-copy') || window.location.href;
        await navigator.clipboard.writeText(text);
        item.classList.remove('loading');
        item.classList.add('btn-success');
        showFeedback(true);
        setTimeout(() => item.classList.remove('btn-success'), 800);
      } catch (err) {
        item.classList.remove('loading');
        item.classList.add('btn-danger');
        showFeedback(false);
        setTimeout(() => item.classList.remove('btn-danger'), 900);
      }
    });
  });

  // ---------- Swatches couleurs & tailles (inputs + labels) ----------
  // Markup attendu: <input type="radio" class="js-swatch" id="opt-1"><label for="opt-1" class="swatch">...
  const enhanceSwatches = (wrapSel, inputSel='input[type="radio"],input[type="checkbox"]', labelSel='label') => {
    $$(wrapSel).forEach(wrap => {
      const inputs = $$(inputSel, wrap);
      inputs.forEach(input => {
        const lab = input.id && $(`label[for="${input.id}"]`);
        if (!lab) return;
        // état checked visuel
        const update = () => {
          $$(labelSel, wrap).forEach(l => l.classList.remove('is-checked'));
          if (input.checked) lab.classList.add('is-checked');
        };
        on(input, 'change', update);
        on(lab, 'keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
        });
        update();
      });
      // Navigation clavier (flèches)
      on(wrap, 'keydown', (e) => {
        const radios = $$(inputSel, wrap).filter(i => !i.disabled);
        const idx = radios.findIndex(r => r.checked);
        if (['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(e.key) && radios.length) {
          e.preventDefault();
          let next = idx;
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx > 0 ? idx - 1 : radios.length - 1);
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % radios.length;
          radios[next].click();
          radios[next].focus();
        }
      });
    });
  };
  enhanceSwatches('.color-swatches');
  enhanceSwatches('.size-buttons');

  // ---------- Tooltips génériques (éléments avec .tooltip-bubble seule) ----------
  $$('.tooltip-bubble').forEach(tip => {
    const host = tip.parentElement;
    if (!host) return;
    on(host, 'mouseenter', () => tip.classList.add('visible','hover-visible'));
    on(host, 'mouseleave', () => tip.classList.remove('visible','hover-visible','tap-visible'));
    on(host, 'click', () => tip.classList.toggle('tap-visible'));
  });

  // ---------- Newsletter (placeholder – brancher AJAX si besoin) ----------
  // Markup attendu: .newsletter-form
  const nlForm = $('.newsletter-form');
  if (nlForm) {
    on(nlForm, 'submit', async (e) => {
      e.preventDefault();
      const data = new FormData(nlForm);
      // TODO: POST vers ton endpoint Klaviyo/Shopify si besoin
      // await fetch('/apps/newsletter', { method:'POST', body:data });
      nlForm.reset();
      showFeedback(true, 'Merci, c’est noté !');
    });
  }

  // ---------- Améliorations d’accessibilité ----------
  // Focus visible sur éléments cliquables quand navigation clavier détectée
  let byKeyboard = false;
  on(document, 'keydown', (e) => { if (e.key === 'Tab') byKeyboard = true; });
  on(document, 'mousedown', () => byKeyboard = false);
  document.body.classList.toggle('using-keyboard', byKeyboard);

  // ---------- Petite protection: évite double padding-top si thèmes injectent plusieurs <main> ----------
  const mains = $$('main');
  if (mains.length > 1) {
    mains.slice(1).forEach(m => m.style.paddingTop = '0');
  }
})();