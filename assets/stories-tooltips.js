/**
 * stories-tooltips.js
 * - Desktop: hover => affiche le tooltip, mouseout => cache
 * - Mobile (pointer: coarse): 1er tap => affiche, 2e tap => navigue
 * - Auto-hide après 2.2s
 * - Ré-init sur shopify:section:load
 */
(function () {
  const SELECTOR_CONTAINER = ".stories-bar-sticky, .stories-bar-sticky-dynamic";
  const SELECTOR_ITEM = ".story-icon";
  const SELECTOR_TOOLTIP = ".tooltip-bubble";
  const ATTR_ACTIVE = "data-tooltip-active";
  const HIDE_DELAY = 2200; // 2.2s

  // Eviter les doublons d'écouteurs si le fichier est chargé plusieurs fois
  // on marque la racine document quand le bind global est fait.
  const BIND_MARK = "__tps_tooltips_bound__";

  // Timers par tooltip
  const hideTimers = new WeakMap();

  function isTouch() {
    return window.matchMedia("(pointer: coarse)").matches;
  }

  function getTooltip(el) {
    return el ? el.querySelector(SELECTOR_TOOLTIP) : null;
  }

  function showTooltip(item) {
    const tip = getTooltip(item);
    if (!tip) return;
    tip.setAttribute("aria-hidden", "false");
    item.setAttribute(ATTR_ACTIVE, "true");
    if (hideTimers.has(tip)) clearTimeout(hideTimers.get(tip));
    hideTimers.set(
      tip,
      setTimeout(() => hideTooltip(item), HIDE_DELAY)
    );
  }

  function hideTooltip(item) {
    const tip = getTooltip(item);
    if (!tip) return;
    tip.setAttribute("aria-hidden", "true");
    item.removeAttribute(ATTR_ACTIVE);
    if (hideTimers.has(tip)) {
      clearTimeout(hideTimers.get(tip));
      hideTimers.delete(tip);
    }
  }

  function bindHover(container) {
    // Desktop seulement
    container.addEventListener("mouseover", (e) => {
      if (isTouch()) return;
      const item = e.target.closest(SELECTOR_ITEM);
      if (!item || !container.contains(item)) return;
      showTooltip(item);
    });
    container.addEventListener("mouseout", (e) => {
      if (isTouch()) return;
      const item = e.target.closest(SELECTOR_ITEM);
      if (!item || !container.contains(item)) return;
      hideTooltip(item);
    });
  }

  function bindTap(container) {
    // Mobile seulement
    container.addEventListener("click", (e) => {
      if (!isTouch()) return;
      const item = e.target.closest(SELECTOR_ITEM);
      if (!item || !container.contains(item)) return;

      // On cherche un lien/cliquable à l'intérieur de l'item
      const link = e.target.closest("a, button");
      if (!link) return; // ne gère que le cas 'tap pour aller quelque part'

      const active = item.hasAttribute(ATTR_ACTIVE);
      if (!active) {
        // 1er tap: afficher le tooltip, bloquer la nav
        e.preventDefault();
        showTooltip(item);
      } else {
        // 2e tap: laisser naviguer (aucun preventDefault)
      }
    });
  }

  function bindOutsideToHide() {
    // Cacher si on tape/click en dehors (mobile)
    document.addEventListener("click", (e) => {
      if (!isTouch()) return;
      const inside = e.target.closest(SELECTOR_ITEM);
      if (inside) return;
      document
        .querySelectorAll(`${SELECTOR_ITEM}[${ATTR_ACTIVE}]`)
        .forEach((el) => hideTooltip(el));
    });
  }

  function initInRoot(root = document) {
    const containers = root.querySelectorAll(SELECTOR_CONTAINER);
    containers.forEach((c) => {
      // Pour éviter double-bind si la section se recharge et que le conteneur persiste
      if (c.__tps_bound) return;
      c.__tps_bound = true;
      bindHover(c);
      bindTap(c);
    });
  }

  function bindGlobal() {
    if (document[BIND_MARK]) return;
    document[BIND_MARK] = true;
    bindOutsideToHide();

    // Init au chargement
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => initInRoot(document));
    } else {
      initInRoot(document);
    }

    // Ré-init lors de reload d'une section Shopify
    document.addEventListener("shopify:section:load", (ev) => {
      initInRoot(ev.target);
    });
  }

  bindGlobal();
})();
(() => {
  const SELECTOR_ITEM = ".story-icon";
  const SELECTOR_TOOLTIP = ".tooltip-bubble";
  const ATTR_ACTIVE = "data-tooltip-active";
  const HIDE_DELAY = 2200; // 2.2s

  let hideTimers = new WeakMap();

  function showTooltip(el) {
    const tip = el.querySelector(SELECTOR_TOOLTIP);
    if (!tip) return;
    tip.setAttribute("aria-hidden", "false");
    el.setAttribute(ATTR_ACTIVE, "true");

    // reset timer
    if (hideTimers.has(tip)) clearTimeout(hideTimers.get(tip));
    const t = setTimeout(() => hideTooltip(el), HIDE_DELAY);
    hideTimers.set(tip, t);
  }

  function hideTooltip(el) {
    const tip = el.querySelector(SELECTOR_TOOLTIP);
    if (!tip) return;
    tip.setAttribute("aria-hidden", "true");
    el.removeAttribute(ATTR_ACTIVE);
    if (hideTimers.has(tip)) {
      clearTimeout(hideTimers.get(tip));
      hideTimers.delete(tip);
    }
  }

  function isTouch() {
    return window.matchMedia("(pointer: coarse)").matches;
  }

  // Desktop: hover
  function bindHover(container) {
    container.addEventListener("mouseover", (e) => {
      const item = e.target.closest(SELECTOR_ITEM);
      if (!item || isTouch()) return;
      showTooltip(item);
    });
    container.addEventListener("mouseout", (e) => {
      const item = e.target.closest(SELECTOR_ITEM);
      if (!item || isTouch()) return;
      hideTooltip(item);
    });
  }

  // Mobile: 1er tap = tooltip, 2e tap = navigation
  function bindTap(container) {
    container.addEventListener("click", (e) => {
      if (!isTouch()) return; // ne gêne pas desktop
      const link = e.target.closest(`${SELECTOR_ITEM} a, ${SELECTOR_ITEM} button`);
      const item = e.target.closest(SELECTOR_ITEM);
      if (!item || !link) return;

      const active = item.hasAttribute(ATTR_ACTIVE);
      if (!active) {
        e.preventDefault(); // premier tap → afficher seulement
        showTooltip(item);
      } else {
        // laisser naviguer au 2e tap (pas de preventDefault)
      }
    });

    // cacher si on tape ailleurs
    document.addEventListener("click", (e) => {
      if (!isTouch()) return;
      const inside = e.target.closest(SELECTOR_ITEM);
      if (!inside) {
        document.querySelectorAll(`${SELECTOR_ITEM}[${ATTR_ACTIVE}]`).forEach(hideTooltip);
      }
    });
  }

  function init(root = document) {
    const containers = root.querySelectorAll(".stories-bar-sticky, .stories-bar-sticky-dynamic");
    containers.forEach((c) => {
      bindHover(c);
      bindTap(c);
    });
  }

  // Ré-init après render dynamique Shopify
  document.addEventListener("shopify:section:load", (e) => init(e.target));
  document.addEventListener("DOMContentLoaded", () => init());
})();