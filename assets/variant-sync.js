/* assets/variant-sync.js
   Sync variantes ↔ swatches ↔ selects ↔ prix ↔ image ↔ ATC
   Hooks attendus (cf. single-product.liquid) :
   - .js-product-json (JSON des variants)
   - .js-option[data-position] (selects)
   - .js-swatch-group / .js-swatch (swatches radio)
   - .js-option-selected[data-option-position] (petite étiquette valeur)
   - .js-variant-id (hidden name="id")
   - .price / .compare-price
   - .js-atc (bouton submit)
   - .product-gallery .main-image img & .js-thumb (vignettes)
   - [data-variant-status] (aria-live, messages)
*/
(() => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  // ---- Contexte (la section) ------------------------------------------------
  const root = document.currentScript?.closest('.single-product-section') || $('.single-product-section');
  if (!root) return;

  // ---- Données variants -----------------------------------------------------
  let variants = [];
  try {
    variants = JSON.parse($('.js-product-json', root)?.textContent || '[]');
  } catch { variants = []; }
  if (!variants.length) return;

  // ---- Sélecteurs principaux ------------------------------------------------
  const selects   = $$('.js-option', root);
  const swGroups  = $$('.js-swatch-group', root);
  const varIdInp  = $('.js-variant-id', root);
  const priceEl   = $('.price', root);
  const compareEl = $('.compare-price', root);
  const atcBtn    = $('.js-atc', root);
  const statusEl  = root.querySelector('[data-variant-status]');
  const mainImg   = $('.product-gallery .main-image img', root);

  // ---- Utils ----------------------------------------------------------------
  const moneyFormat = (cents) => {
    // Shopify renvoie des prix en centimes → str formatée
    const fmt = (typeof window.shopMoneyFormat === 'string' && window.shopMoneyFormat) || '{{amount}} €';
    const amount = (Math.round(cents) / 100).toFixed(2);
    // remplace les placeholders communs
    return fmt
      .replace('{{amount_no_decimals}}', Math.round(cents/100).toString())
      .replace('{{amount}}', amount)
      .replace('{{amount_with_comma_separator}}', amount.replace('.', ','))
      .replace('{{amount_no_decimals_with_comma_separator}}', Math.round(cents/100).toString().replace('.', ','));
  };

  const getCurrentOptions = () => {
    // on lit d’abord les selects (source de vérité), sinon swatches cochés
    const byPos = {};
    selects.forEach(sel => {
      const pos = parseInt(sel.getAttribute('data-position'), 10);
      byPos[pos] = sel.value;
    });
    // si un select est masqué (swatches), on s’assure d’avoir la valeur du radio
    swGroups.forEach(g => {
      const pos = parseInt(g.getAttribute('data-position'), 10);
      const checked = g.querySelector('.js-swatch:checked');
      if (checked) byPos[pos] = checked.value;
    });
    return [byPos[1] || null, byPos[2] || null, byPos[3] || null];
  };

  const findVariant = (opt1, opt2, opt3) =>
    variants.find(v =>
      (v.option1 ?? null) === (opt1 ?? null) &&
      (v.option2 ?? null) === (opt2 ?? null) &&
      (v.option3 ?? null) === (opt3 ?? null)
    ) || null;

  const firstAvailableVariantFor = (partial) => {
    // partial: [o1?, o2?, o3?] → retourne la 1ère variante dispo qui matche le plus possible
    const rank = (v) => {
      let r = 0;
      if (partial[1] && v.option2 === partial[1]) r++;
      if (partial[2] && v.option3 === partial[2]) r++;
      if (partial[0] && v.option1 === partial[0]) r++;
      return r;
    };
    const cands = variants.filter(v =>
      (!partial[0] || v.option1 === partial[0]) &&
      (!partial[1] || v.option2 === partial[1]) &&
      (!partial[2] || v.option3 === partial[2]) &&
      v.available
    );
    if (!cands.length) return variants.find(v => v.available) || variants[0];
    return cands.sort((a,b) => rank(b) - rank(a))[0];
  };

  const setMainImage = (src) => {
    if (!mainImg || !src) return;
    // garde width/height/alt actuels
    mainImg.src = src;
  };

  const updateThumbActive = (src) => {
    $$('.js-thumb', root).forEach(t => {
      const full = t.getAttribute('data-full');
      t.classList.toggle('active', !!full && src && full === src);
    });
  };

  const updateSelectsAndSwatches = (variant) => {
    // Selects
    [['option1',1],['option2',2],['option3',3]].forEach(([key,pos]) => {
      const sel = selects.find(s => parseInt(s.getAttribute('data-position'),10) === pos);
      if (sel && variant[key] != null) {
        sel.value = variant[key];
        // met à jour le petit libellé "valeur sélectionnée"
        const chip = root.querySelector(`.js-option-selected[data-option-position="${pos}"]`);
        if (chip) chip.textContent = variant[key];
      }
      // Swatches
      const group = swGroups.find(g => parseInt(g.getAttribute('data-position'),10) === pos);
      if (group) {
        const radios = $$('.js-swatch', group);
        radios.forEach(r => {
          r.checked = (r.value === variant[key]);
          // état visuel "is-checked" si ton CSS le prévoit
          const lab = r.id && group.querySelector(`label[for="${r.id}"]`);
          if (lab) lab.classList.toggle('is-checked', r.checked);
        });
      }
    });
  };

  const setATCState = (available) => {
    if (!atcBtn) return;
    atcBtn.disabled = !available;
    atcBtn.setAttribute('aria-disabled', String(!available));
    if (!available) {
      atcBtn.textContent = (window.theme?.strings?.soldOut || 'Sold out');
    } else {
      // remet la traduction par défaut du thème si dispo
      atcBtn.textContent =
        (window.theme?.strings?.addToCart) ||
        (document.documentElement.lang === 'fr' ? 'Ajouter au panier' : 'Add to cart');
    }
  };

  const updateURL = (variantId) => {
    if (!variantId || !history.replaceState) return;
    const url = new URL(window.location.href);
    url.searchParams.set('variant', variantId);
    history.replaceState({}, '', url.toString());
  };

  const speak = (msg) => {
    if (!statusEl || !msg) return;
    statusEl.textContent = msg;
  };

  const renderPrice = (variant) => {
    if (!priceEl) return;
    priceEl.textContent = moneyFormat(variant.price);
    if (compareEl) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        compareEl.style.display = '';
        compareEl.textContent = moneyFormat(variant.compare_at_price);
      } else {
        compareEl.style.display = 'none';
        compareEl.textContent = '';
      }
    }
  };

  const renderImageForVariant = (variant) => {
    // 1) image variante si fournie par Shopify
    const vImg = variant.featured_image?.src || variant.featured_image;
    if (vImg) {
      setMainImage(vImg);
      updateThumbActive(vImg);
      return;
    }
    // 2) sinon, on laisse l’image actuelle (ou la 1re vignette si main vide)
    const firstThumb = $('.js-thumb', root);
    if (firstThumb && firstThumb.dataset.full) {
      setMainImage(firstThumb.dataset.full);
      updateThumbActive(firstThumb.dataset.full);
    }
  };

  const applyVariant = (variant, announce = true) => {
    if (!variant) return;
    // MAJ ID
    if (varIdInp) varIdInp.value = variant.id;
    // MAJ prix
    renderPrice(variant);
    // MAJ image
    renderImageForVariant(variant);
    // MAJ ATC
    setATCState(!!variant.available);
    // URL
    updateURL(variant.id);
    // annonce ARIA
    if (announce) {
      const msg = variant.available
        ? (document.documentElement.lang === 'fr' ? 'Variante disponible sélectionnée.' : 'Variant selected and available.')
        : (document.documentElement.lang === 'fr' ? 'Variante indisponible. Choix ajusté.' : 'Variant unavailable. Options adjusted.');
      speak(msg);
    }
  };

  // ---- Initialisation (depuis l’URL si ?variant=) ---------------------------
  const initFromURL = () => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('variant');
    const v = q && variants.find(x => String(x.id) === String(q));
    if (v) {
      updateSelectsAndSwatches(v);
      applyVariant(v, false);
      return;
    }
    // sinon, on lit les selects et on corrige si combo invalide
    const [o1,o2,o3] = getCurrentOptions();
    const exact = findVariant(o1,o2,o3);
    if (exact) {
      applyVariant(exact, false);
      return;
    }
    const fixed = firstAvailableVariantFor([o1,o2,o3]);
    updateSelectsAndSwatches(fixed);
    applyVariant(fixed, false);
  };

  // ---- Réactions aux changements (selects + swatches) -----------------------
  const handleChange = () => {
    const [o1,o2,o3] = getCurrentOptions();
    let v = findVariant(o1,o2,o3);
    if (!v) {
      const before = [o1,o2,o3];
      v = firstAvailableVariantFor(before);
      if (v) {
        // on ajuste l’UI pour refléter la variante réellement disponible
        updateSelectsAndSwatches(v);
        speak(document.documentElement.lang === 'fr'
          ? 'Combinaison indisponible, options ajustées.'
          : 'Unavailable combination, options adjusted.');
      }
    }
    if (v) applyVariant(v);
  };

  selects.forEach(sel => on(sel, 'change', handleChange));
  swGroups.forEach(g => {
    $$('.js-swatch', g).forEach(radio => on(radio, 'change', handleChange));
  });

  // ---- Vignettes galerie ----------------------------------------------------
  $$('.js-thumb', root).forEach(thumb => {
    on(thumb, 'click', (e) => {
      e.preventDefault();
      const full = thumb.getAttribute('data-full');
      if (full) {
        setMainImage(full);
        updateThumbActive(full);
      }
    });
  });

  // ---- Go! ------------------------------------------------------------------
  initFromURL();
<<<<<<< HEAD
})();
=======
})();
>>>>>>> d0c988f (Add variant-sync.js for product variant sync logic)
