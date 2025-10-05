document.addEventListener("DOMContentLoaded", function () {
  const wishlistKey = "wishlistItems";

  function getWishlist() {
    return JSON.parse(localStorage.getItem(wishlistKey)) || [];
  }

  function saveWishlist(wishlist) {
    localStorage.setItem(wishlistKey, JSON.stringify(wishlist));
  }

  function isInWishlist(productId) {
    return getWishlist().some((item) => item.id === Number(productId));
  }

  function updateWishlistBadge() {
    const count = getWishlist().length;
    document.querySelectorAll(".wishlist-count-badge").forEach((badge) => {
      if (count > 0) {
        badge.textContent = count;
        badge.removeAttribute("hidden");
      } else {
        badge.setAttribute("hidden", true);
      }
    });
  }

  function addToWishlist(product) {
    const wishlist = getWishlist();
    if (!isInWishlist(product.id)) {
      wishlist.push(product);
      saveWishlist(wishlist);
    }
  }

  function removeFromWishlist(productId) {
    const id = Number(productId);
    const wishlist = getWishlist().filter((item) => item.id !== id);
    saveWishlist(wishlist);
  }

  function renderWishlist() {
    const list = document.getElementById("offcanvas-wishlist-product-listing");
    const emptyState = document.getElementById("offcanvas-wishlist-empty");
    const wishlist = getWishlist();

    if (!list || !emptyState) return;

    list.innerHTML = "";

    if (wishlist.length === 0) {
      list.setAttribute("hidden", true);
      emptyState.removeAttribute("hidden");
      return;
    }

    list.removeAttribute("hidden");
    emptyState.setAttribute("hidden", true);

    wishlist.forEach((item) => {
      const li = document.createElement("li");
      li.className = "mb-4";
      li.innerHTML = `
        <div class="d-flex align-items-start">
          <img src="${item.image || '/placeholder.png'}" width="80" height="80" alt="${item.title}" class="me-3" style="object-fit: cover;">
          <div class="flex-grow-1">
            <h6 class="mb-1">${item.title}</h6>
            <p class="mb-2">${item.price}</p>
            <button class="btn btn-sm btn-outline-secondary remove-from-wishlist" data-id="${item.id}">
              Retirer
            </button>
          </div>
        </div>
      `;
      list.appendChild(li);
    });

    document.querySelectorAll(".remove-from-wishlist").forEach((btn) => {
      btn.addEventListener("click", function () {
        removeFromWishlist(this.getAttribute("data-id"));
        renderWishlist();
        updateWishlistBadge();
        updateToggleStates();
      });
    });
  }

  function updateToggleStates() {
    document.querySelectorAll("[data-wishlist-button]").forEach((button) => {
      const productId = button.dataset.id;
      if (isInWishlist(productId)) {
        button.classList.add("active");
        button.textContent = button.dataset.removeLabel || "Remove from wishlist";
      } else {
        button.classList.remove("active");
        button.textContent = button.dataset.addLabel || "Add to wishlist";
      }
    });
  }

  window.removeOrAddFromWishlist = function (el) {
    const product = {
      id: Number(el.dataset.id),
      title: el.dataset.title,
      image: el.dataset.image,
      price: el.dataset.price,
      url: el.dataset.url,
    };

    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }

    updateWishlistBadge();
    renderWishlist();
    updateToggleStates();
  };

  updateWishlistBadge();
  renderWishlist();
  updateToggleStates();
});