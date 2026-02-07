const CART_KEY = "maisonAuroreCart";
const LAST_ADDED_KEY = "maisonAuroreLastAdded";
const CHECKOUT_API_URL = "https://YOUR-RENDER-URL.onrender.com/create-checkout-session";
const PRODUCT_URLS = {
  "watch-007": "product-001.html",
  "watch-001": "shop.html",
  "watch-002": "shop.html",
  "watch-003": "shop.html",
  "watch-004": "shop.html",
  "watch-005": "shop.html",
  "watch-006": "shop.html",
  "jewel-001": "shop.html",
  "jewel-002": "shop.html",
};

function readCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function formatPrice(value) {
  return `${value.toFixed(2).replace(".", ",")}€`;
}

function updateCartCount() {
  const countEl = document.getElementById("cart-count");
  if (!countEl) return;
  const total = readCart().reduce((sum, item) => sum + item.qty, 0);
  countEl.textContent = total;
}

function buildOptionsFromPage() {
  const size = document.getElementById("size");
  const dial = document.getElementById("dial");
  const initial = document.getElementById("initial");
  const color = document.getElementById("color");
  const gift = document.getElementById("gift");
  const giftMessage = document.getElementById("gift-message");
  const giftText = document.getElementById("gift-text");

  const options = [];
  if (size) options.push(`Taille: ${size.value}`);
  if (dial) options.push(`Cadran: ${dial.value}`);
  if (initial) options.push(`Initiale: ${initial.value}`);
  if (color) options.push(`Couleur: ${color.value}`);
  if (gift) options.push(`Emballage cadeau: ${gift.value}`);
  if (giftMessage && gift.value === "oui") options.push(`Message: ${giftMessage.value}`);
  if (giftText && giftMessage && giftMessage.value === "oui" && giftText.value.trim()) {
    options.push(`Texte: ${giftText.value.trim()}`);
  }

  return options.join(" | ");
}

function addToCart(item) {
  const items = readCart();
  const existing = items.find(
    (current) => current.sku === item.sku && current.options === item.options
  );
  if (existing) {
    existing.qty += item.qty;
  } else {
    items.push(item);
  }
  writeCart(items);
  updateCartCount();
  sessionStorage.setItem(
    LAST_ADDED_KEY,
    JSON.stringify({ sku: item.sku, options: item.options })
  );
}

function isInCart(sku) {
  return readCart().some((item) => item.sku === sku);
}

function updateAddButtons() {
  const buttons = document.querySelectorAll("[data-add-to-cart]");
  if (!buttons.length) return;
  buttons.forEach((button) => {
    const sku = button.getAttribute("data-sku");
    if (!sku) return;
    if (isInCart(sku)) {
      button.textContent = "Aller au panier";
      button.classList.remove("button-primary");
      button.classList.add("button-secondary");
      button.setAttribute("data-go-cart", "true");
    } else {
      button.textContent = "Ajouter au panier";
      if (button.getAttribute("data-compact") === "true") {
        button.textContent = "Ajouter";
      }
      button.classList.add("button-primary");
      button.classList.remove("button-secondary");
      button.removeAttribute("data-go-cart");
    }
  });
}

function bindAddToCartButtons() {
  const buttons = document.querySelectorAll("[data-add-to-cart]");
  if (!buttons.length) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const sku = button.getAttribute("data-sku");
      const name = button.getAttribute("data-name");
      const price = Number(button.getAttribute("data-price"));
      const image = button.getAttribute("data-image") || "";
      const url = button.getAttribute("data-url") || "";
      const qtyInputId = button.getAttribute("data-qty-input");
      const qtyInput = qtyInputId ? document.getElementById(qtyInputId) : null;
      const qty = qtyInput ? Math.max(1, Number(qtyInput.value || 1)) : 1;
      const options = buildOptionsFromPage();

      if (button.hasAttribute("data-go-cart")) {
        sessionStorage.setItem(
          LAST_ADDED_KEY,
          JSON.stringify({ sku, options })
        );
        window.location.href = "cart.html";
        return;
      }

      addToCart({ sku, name, price, image, qty, options, url });
      updateAddButtons();
    });
  });
}

function renderCartPage() {
  const list = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  if (!list || !totalEl) return;

  const items = readCart();
  let updatedPrices = false;
  items.forEach((item) => {
    if (item.sku === "watch-007" && item.price !== 64.99) {
      item.price = 64.99;
      updatedPrices = true;
    }
  });
  if (updatedPrices) {
    writeCart(items);
  }
  list.innerHTML = "";

  if (!items.length) {
    list.innerHTML = "<p>Votre panier est vide.</p>";
    totalEl.textContent = formatPrice(0);
    return;
  }

  let total = 0;
  items.forEach((item, index) => {
    total += item.price * item.qty;
    const url = item.url || PRODUCT_URLS[item.sku] || "shop.html";
    const linkStart = `<a href="${url}">`;
    const linkEnd = "</a>";
    const el = document.createElement("div");
    el.className = "cart-item";
    el.setAttribute("data-sku", item.sku);
    if (item.options) {
      el.setAttribute("data-options", item.options);
    }
    el.innerHTML = `
      ${linkStart}<img src="${item.image}" alt="${item.name}">${linkEnd}
      <div>
        <h4>${linkStart}${item.name}${linkEnd}</h4>
        <p>${item.options || ""}</p>
        <div class="cart-actions-row">
          <label>
            Qté
            <input class="qty-input" type="number" min="1" value="${item.qty}" data-index="${index}">
          </label>
          <span class="price">${formatPrice(item.price)}</span>
          <button class="button button-secondary" type="button" data-remove="${index}">Retirer</button>
        </div>
      </div>
    `;
    list.appendChild(el);
  });

  totalEl.textContent = formatPrice(total);

  const lastAddedRaw = sessionStorage.getItem(LAST_ADDED_KEY);
  if (lastAddedRaw) {
    try {
      const lastAdded = JSON.parse(lastAddedRaw);
      const selectorParts = [
        `.cart-item[data-sku="${lastAdded.sku}"]`,
      ];
      if (lastAdded.options) {
        selectorParts.push(`[data-options="${CSS.escape(lastAdded.options)}"]`);
      }
      const selector = selectorParts.join("");
      const target = list.querySelector(selector) || list.querySelector(`[data-sku="${lastAdded.sku}"]`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("is-highlight");
        setTimeout(() => {
          target.classList.remove("is-highlight");
          sessionStorage.removeItem(LAST_ADDED_KEY);
        }, 2000);
      }
    } catch {
      sessionStorage.removeItem(LAST_ADDED_KEY);
    }
  }

  list.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-remove"));
      const updated = readCart().filter((_, i) => i !== idx);
      writeCart(updated);
      renderCartPage();
      updateCartCount();
    });
  });

  list.querySelectorAll(".qty-input").forEach((input) => {
    input.addEventListener("change", () => {
      const idx = Number(input.getAttribute("data-index"));
      const value = Math.max(1, Number(input.value || 1));
      const updated = readCart();
      if (updated[idx]) updated[idx].qty = value;
      writeCart(updated);
      renderCartPage();
      updateCartCount();
    });
  });
}

updateCartCount();
updateAddButtons();
bindAddToCartButtons();
renderCartPage();

const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.getElementById("site-nav");
const navOverlay = document.getElementById("nav-overlay");

function closeNav() {
  if (!navMenu || !navToggle) return;
  navMenu.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  if (navOverlay) navOverlay.classList.remove("is-open");
}

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    if (navOverlay) navOverlay.classList.toggle("is-open", isOpen);
  });
}

if (navOverlay) {
  navOverlay.addEventListener("click", closeNav);
}

if (navMenu) {
  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });
}

document.querySelectorAll(".thumbs").forEach((thumbs) => {
  const thumbsCount = thumbs.querySelectorAll(".thumb").length;
  if (thumbsCount <= 1) {
    thumbs.classList.add("hide-mobile");
  }
});

document.querySelectorAll(".gallery").forEach((gallery) => {
  if (gallery.dataset.galleryInit === "true") return;
  gallery.dataset.galleryInit = "true";
  const mainImage = gallery.querySelector(".gallery-main img");
  const thumbs = Array.from(gallery.querySelectorAll(".thumb"));
  if (!mainImage || thumbs.length <= 1) return;

  const sources = thumbs.map((thumb) => thumb.getAttribute("data-src"));
  let currentIndex = thumbs.findIndex((thumb) => thumb.classList.contains("is-active"));
  if (currentIndex < 0) currentIndex = 0;

  function setActive(index) {
    const nextSrc = sources[index];
    mainImage.classList.add("is-switch");
    setTimeout(() => {
      mainImage.src = nextSrc;
      mainImage.classList.remove("is-switch");
    }, 120);
    thumbs.forEach((t) => t.classList.remove("is-active"));
    thumbs[index].classList.add("is-active");
    currentIndex = index;
  }

  thumbs.forEach((thumb, index) => {
    thumb.addEventListener("click", () => setActive(index));
  });

  let startX = 0;
  let isSwiping = false;
  const mainArea = gallery.querySelector(".gallery-main");
  if (mainArea) {
    mainArea.addEventListener("touchstart", (event) => {
      if (!event.touches || event.touches.length === 0) return;
      startX = event.touches[0].clientX;
      isSwiping = true;
    });

    mainArea.addEventListener("touchend", (event) => {
      if (!isSwiping) return;
      const endX = event.changedTouches[0].clientX;
      const diff = endX - startX;
      const threshold = 40;
      if (Math.abs(diff) > threshold) {
        if (diff < 0) {
          const nextIndex = (currentIndex + 1) % sources.length;
          setActive(nextIndex);
        } else {
          const prevIndex = (currentIndex - 1 + sources.length) % sources.length;
          setActive(prevIndex);
        }
      }
      isSwiping = false;
    });
  }
});

const checkoutButton = document.getElementById("checkout-button");
if (checkoutButton) {
  checkoutButton.addEventListener("click", async () => {
    const items = readCart();
    if (!items.length) return;
    checkoutButton.disabled = true;
    checkoutButton.textContent = "Redirection...";
    try {
      const response = await fetch(CHECKOUT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        checkoutButton.textContent = "Erreur";
        checkoutButton.disabled = false;
      }
    } catch {
      checkoutButton.textContent = "Erreur";
      checkoutButton.disabled = false;
    }
  });
}
