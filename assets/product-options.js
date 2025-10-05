document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.product-option').forEach(input => {
    input.addEventListener('change', handleProductOptionChange);
  });
});

function handleProductOptionChange(e) {
  const form = e.target.closest('form') || document;
  const productId = e.target.dataset.productId;
  const selectedOptions = [];

  if (!window.productVariants || !window.productVariants[productId]) return;

  form.querySelectorAll(`.product-option[name^="option-"]`).forEach(el => {
    if (el.tagName === 'SELECT' || el.checked) {
      selectedOptions.push(el.value);
    }
  });

  const variants = window.productVariants[productId];
  const matchedVariant = variants.find(v =>
    v.options.every((opt, i) => opt === selectedOptions[i])
  );

  if (matchedVariant) {
    const priceEl = form.querySelector(`.product-price[data-product-id="${productId}"]`);
    if (priceEl) {
      priceEl.textContent = Shopify.formatMoney(matchedVariant.price, window.money_format);
    }

    const imageEl = form.querySelector(`.product-image[data-product-id="${productId}"]`);
    if (imageEl && matchedVariant.featured_image) {
      imageEl.src = matchedVariant.featured_image;
    }

    const variantInput = form.querySelector(`input[name="id"][data-product-id="${productId}"]`);
    if (variantInput) {
      variantInput.value = matchedVariant.id;
    }

    const atcBtn = form.querySelector(`#add-to-cart-${productId}`);
    if (atcBtn) {
      atcBtn.disabled = !matchedVariant.available;
      atcBtn.textContent = matchedVariant.available ? 'Ajouter au panier' : 'Indisponible';
      atcBtn.setAttribute('aria-disabled', !matchedVariant.available);
    }
  }
}