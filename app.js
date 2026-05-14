const categories = [
  "Furniture",
  "Home Decor",
  "Electronic",
  "Clothing",
  "Kitchen/Cooking",
  "Skincare/Makeup",
];

let items = normalizeItems(window.MOVING_SALE_ITEMS);
let activeCategory = "All";
let searchTerm = "";
let activeDetailItem = null;
let activePhotoIndex = 0;
let cardPhotoIndexes = {};

const elements = {
  categoryTabs: document.querySelector("#categoryTabs"),
  inventoryGrid: document.querySelector("#inventoryGrid"),
  currentCategoryTitle: document.querySelector("#currentCategoryTitle"),
  itemCount: document.querySelector("#itemCount"),
  emptyState: document.querySelector("#emptyState"),
  searchInput: document.querySelector("#searchInput"),
  emptyStateMessage: document.querySelector("#emptyStateMessage"),
  detailDialog: document.querySelector("#detailDialog"),
  closeDetailButton: document.querySelector("#closeDetailButton"),
  carouselStage: document.querySelector("#carouselStage"),
  previousPhotoButton: document.querySelector("#previousPhotoButton"),
  nextPhotoButton: document.querySelector("#nextPhotoButton"),
  carouselCount: document.querySelector("#carouselCount"),
  detailThumbnails: document.querySelector("#detailThumbnails"),
  detailCategory: document.querySelector("#detailCategory"),
  detailName: document.querySelector("#detailName"),
  detailPrice: document.querySelector("#detailPrice"),
  detailStatus: document.querySelector("#detailStatus"),
  detailSizeBlock: document.querySelector("#detailSizeBlock"),
  detailSize: document.querySelector("#detailSize"),
  detailProductLinkBlock: document.querySelector("#detailProductLinkBlock"),
  detailProductLink: document.querySelector("#detailProductLink"),
  detailDescription: document.querySelector("#detailDescription"),
};

elements.closeDetailButton.addEventListener("click", closeDetailDialog);
elements.previousPhotoButton.addEventListener("click", () => moveCarousel(-1));
elements.nextPhotoButton.addEventListener("click", () => moveCarousel(1));
elements.searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  renderInventory();
});

renderCategoryControls();
renderInventory();

function normalizeItems(rawItems) {
  return (Array.isArray(rawItems) ? rawItems : []).map((item) => ({
    ...item,
    status: ["available", "hold", "sold"].includes(item.status) ? item.status : "available",
    photos: Array.isArray(item.photos) ? item.photos : [],
  }));
}

function renderCategoryControls() {
  const allCategories = ["All", ...categories];
  elements.categoryTabs.innerHTML = allCategories
    .map(
      (category) => `
        <button class="tab-button ${category === activeCategory ? "active" : ""}" type="button" data-category="${category}">
          ${category}
        </button>
      `
    )
    .join("");

  elements.categoryTabs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      renderCategoryControls();
      renderInventory();
    });
  });
}

function renderInventory() {
  const visibleItems = items.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const searchable = `${item.name} ${item.description} ${item.size || ""}`.toLowerCase();
    return matchesCategory && searchable.includes(searchTerm);
  });

  elements.currentCategoryTitle.textContent = activeCategory === "All" ? "All items" : activeCategory;
  const availableCount = visibleItems.filter((item) => item.status !== "sold").length;
  const countLabel = `${visibleItems.length} ${visibleItems.length === 1 ? "item" : "items"}`;
  elements.itemCount.textContent =
    visibleItems.length === availableCount ? `${countLabel} available` : `${countLabel}, ${availableCount} available`;
  elements.emptyStateMessage.textContent = "Choose a different category or search to keep browsing.";
  elements.emptyState.classList.toggle("hidden", visibleItems.length > 0);
  elements.inventoryGrid.classList.toggle("hidden", visibleItems.length === 0);

  elements.inventoryGrid.innerHTML = visibleItems.map(renderItemCard).join("");
  elements.inventoryGrid.querySelectorAll("[data-card-photo]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      moveCardPhoto(button.dataset.cardPhoto, Number(button.dataset.direction));
    });
  });
  elements.inventoryGrid.querySelectorAll("[data-view-id]").forEach((card) => {
    card.addEventListener("click", () => openDetailDialog(card.dataset.viewId));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetailDialog(card.dataset.viewId);
      }
    });
  });
}

function renderItemCard(item) {
  const currentPhotoIndex = Math.min(cardPhotoIndexes[item.id] || 0, Math.max(item.photos.length - 1, 0));
  const image = item.photos[currentPhotoIndex]
    ? `<img src="${item.photos[currentPhotoIndex]}" alt="${escapeHtml(item.name)} photo ${currentPhotoIndex + 1}" />`
    : `<div class="photo-placeholder" aria-label="No photo">Photo soon</div>`;
  const cardCarouselControls =
    item.photos.length > 1
      ? `
        <button class="card-photo-button previous" type="button" data-card-photo="${item.id}" data-direction="-1" aria-label="Previous ${escapeHtml(item.name)} photo">
          &#8249;
        </button>
        <button class="card-photo-button next" type="button" data-card-photo="${item.id}" data-direction="1" aria-label="Next ${escapeHtml(item.name)} photo">
          &#8250;
        </button>
        <span class="card-photo-count">${currentPhotoIndex + 1} / ${item.photos.length}</span>
      `
      : "";
  const size = item.size
    ? `<p class="item-size"><strong>Size:</strong> ${escapeHtml(item.size)}</p>`
    : "";

  return `
    <article class="item-card ${item.status === "sold" ? "is-sold" : ""}" data-view-id="${item.id}" role="button" tabindex="0" aria-label="View ${escapeHtml(item.name)} details">
      <div class="card-photo-frame">
        ${image}
        ${cardCarouselControls}
        ${renderStatusBadge(item.status)}
      </div>
      <div class="item-body">
        <span class="category-label">${escapeHtml(item.category)}</span>
        <div class="item-meta">
          <h3>${escapeHtml(item.name)}</h3>
          <span class="price">${formatPrice(item.price)}</span>
        </div>
        ${size}
        <p class="item-description-preview">${escapeHtml(item.description)}</p>
      </div>
    </article>
  `;
}

function renderStatusBadge(status) {
  if (status === "sold") {
    return `<span class="status-badge sold">Sold</span>`;
  }

  if (status === "hold") {
    return `<span class="status-badge hold">On hold</span>`;
  }

  return `<span class="status-badge available">Available</span>`;
}

function moveCardPhoto(itemId, direction) {
  const item = items.find((entry) => entry.id === itemId);
  if (!item || item.photos.length < 2) {
    return;
  }

  const currentIndex = cardPhotoIndexes[itemId] || 0;
  cardPhotoIndexes = {
    ...cardPhotoIndexes,
    [itemId]: (currentIndex + direction + item.photos.length) % item.photos.length,
  };
  renderInventory();
}

function openDetailDialog(itemId) {
  const item = items.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }

  activeDetailItem = item;
  activePhotoIndex = 0;
  elements.detailCategory.textContent = item.category;
  elements.detailName.textContent = item.name;
  elements.detailPrice.textContent = formatPrice(item.price);
  elements.detailStatus.innerHTML = renderStatusBadge(item.status);
  elements.detailDescription.textContent = item.description;
  elements.detailSize.textContent = item.size || "";
  elements.detailSizeBlock.classList.toggle("hidden", !item.size);
  renderProductLink(item.productLink);
  renderDetailCarousel();
  elements.detailDialog.showModal();
}

function renderProductLink(productLink) {
  const safeUrl = getSafeUrl(productLink);
  elements.detailProductLinkBlock.classList.toggle("hidden", !safeUrl);
  elements.detailProductLink.textContent = safeUrl || "";

  if (safeUrl) {
    elements.detailProductLink.href = safeUrl;
  } else {
    elements.detailProductLink.removeAttribute("href");
  }
}

function closeDetailDialog() {
  if (elements.detailDialog.open) {
    elements.detailDialog.close();
  }
}

function moveCarousel(direction) {
  if (!activeDetailItem || activeDetailItem.photos.length < 2) {
    return;
  }

  activePhotoIndex =
    (activePhotoIndex + direction + activeDetailItem.photos.length) % activeDetailItem.photos.length;
  renderDetailCarousel();
}

function renderDetailCarousel() {
  const photos = activeDetailItem?.photos || [];
  const hasPhotos = photos.length > 0;
  const hasMultiplePhotos = photos.length > 1;

  elements.carouselStage.innerHTML = hasPhotos
    ? `<img src="${photos[activePhotoIndex]}" alt="${escapeHtml(activeDetailItem.name)} photo ${activePhotoIndex + 1}" />`
    : `<div class="photo-placeholder large-placeholder">Photo soon</div>`;
  elements.carouselCount.textContent = hasPhotos ? `${activePhotoIndex + 1} / ${photos.length}` : "0 / 0";
  elements.previousPhotoButton.classList.toggle("hidden", !hasMultiplePhotos);
  elements.nextPhotoButton.classList.toggle("hidden", !hasMultiplePhotos);
  elements.carouselCount.classList.toggle("hidden", !hasMultiplePhotos);
  elements.detailThumbnails.classList.toggle("hidden", !hasMultiplePhotos);
  elements.detailThumbnails.innerHTML = photos
    .map(
      (photo, index) => `
        <button class="detail-thumbnail ${index === activePhotoIndex ? "active" : ""}" type="button" data-photo-index="${index}" aria-label="Show photo ${index + 1}">
          <img src="${photo}" alt="" />
        </button>
      `
    )
    .join("");

  elements.detailThumbnails.querySelectorAll("[data-photo-index]").forEach((button) => {
    button.addEventListener("click", () => {
      activePhotoIndex = Number(button.dataset.photoIndex);
      renderDetailCarousel();
    });
  });
}

function getSafeUrl(value) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
