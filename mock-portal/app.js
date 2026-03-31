const credentials = {
  username: "chef",
  password: "smartops",
};

const catalogItems = [
  { name: "Wings", unit: "kg" },
  { name: "Dry Tomato", unit: "kg" },
  { name: "Halloumi", unit: "kg" },
  { name: "Bacon", unit: "kg" },
  { name: "Potato", unit: "kg" },
  { name: "Salsa", unit: "kg" },
  { name: "Tomato", unit: "kg" },
  { name: "Red Onion", unit: "kg" },
  { name: "Fries", unit: "unit" },
  { name: "Tender", unit: "kg" },
  { name: "Chicken Breast", unit: "kg" },
  { name: "Tender Prep", unit: "kg" },
];

const loginPage = document.querySelector("#login-page");
const orderPage = document.querySelector("#order-page");
const reviewPage = document.querySelector("#review-page");
const goodsReceivedPage = document.querySelector("#goods-received-page");
const goodsReceivedReviewPage = document.querySelector("#goods-received-review-page");

const usernameInput = document.querySelector("#username-input");
const passwordInput = document.querySelector("#password-input");
const loginButton = document.querySelector("#login-button");
const loginError = document.querySelector("#login-error");

const itemSearchInput = document.querySelector("#item-search-input");
const itemSearchResults = document.querySelector("#item-search-results");
const selectedItemPill = document.querySelector("#selected-item-pill");
const quantityInput = document.querySelector("#quantity-input");
const addItemButton = document.querySelector("#add-item-button");
const orderItemsBody = document.querySelector("#order-items-body");

const goReviewButton = document.querySelector("#go-review-button");
const reviewItemsBody = document.querySelector("#review-items-body");
const backToOrderButton = document.querySelector("#back-to-order-button");
const openGoodsReceivedButton = document.querySelector("#open-goods-received-button");
const reviewOpenGoodsReceivedButton = document.querySelector(
  "#review-open-goods-received-button"
);
const submitPlaceholderButton = document.querySelector("#submit-placeholder-button");

const goodsInvoiceNumberInput = document.querySelector("#goods-received-invoice-number");
const goodsInvoiceDateInput = document.querySelector("#goods-received-invoice-date");
const goodsSearchInput = document.querySelector("#goods-received-search-input");
const goodsSearchResults = document.querySelector("#goods-received-results");
const goodsSelectedItemPill = document.querySelector(
  "#goods-received-selected-item-pill"
);
const goodsQuantityInput = document.querySelector("#goods-received-quantity-input");
const goodsUnitPriceInput = document.querySelector("#goods-received-unit-price-input");
const goodsAddItemButton = document.querySelector("#goods-received-add-item-button");
const goodsItemsBody = document.querySelector("#goods-received-items-body");
const goodsReviewButton = document.querySelector("#goods-received-review-button");
const goodsBackToOrderButton = document.querySelector(
  "#goods-received-back-to-order-button"
);
const goodsReviewItemsBody = document.querySelector(
  "#goods-received-review-items-body"
);
const goodsReviewMeta = document.querySelector("#goods-received-review-meta");
const goodsSaveState = document.querySelector("#goods-received-save-state");
const goodsReviewBackButton = document.querySelector("#goods-received-review-back-button");
const goodsSaveButton = document.querySelector("#goods-received-save-button");

let selectedItem = null;
let orderItems = [];
let goodsSelectedItem = null;
let goodsReceivedItems = [];

function showPage(page) {
  loginPage.classList.add("hidden");
  orderPage.classList.add("hidden");
  reviewPage.classList.add("hidden");
  goodsReceivedPage.classList.add("hidden");
  goodsReceivedReviewPage.classList.add("hidden");
  page.classList.remove("hidden");
}

function normalizeQuantity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(numeric, 0);
}

function normalizeMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(numeric, 0);
}

function renderTableRows(target, rows) {
  target.innerHTML = "";

  if (rows.length === 0) {
    const empty = document.createElement("div");
    empty.className = "table-row";
    empty.innerHTML = "<span>No items yet.</span><span>-</span><span>-</span>";
    target.appendChild(empty);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <span>${item.name}</span>
      <span>${item.quantity}</span>
      <span>${item.unit}</span>
    `;
    target.appendChild(row);
  });
}

function renderOrderItems() {
  renderTableRows(orderItemsBody, orderItems);
}

function renderReviewItems() {
  renderTableRows(reviewItemsBody, orderItems);
}

function renderSearchResults(searchTerm) {
  const normalizedSearch = String(searchTerm || "").trim().toLowerCase();
  itemSearchResults.innerHTML = "";

  if (!normalizedSearch) return;

  const matches = catalogItems.filter((item) =>
    item.name.toLowerCase().includes(normalizedSearch)
  );

  matches.forEach((item) => {
    const option = document.createElement("li");
    option.textContent = `${item.name} (${item.unit})`;
    option.dataset.itemName = item.name;
    option.dataset.itemUnit = item.unit;
    option.addEventListener("click", () => {
      selectedItem = {
        name: item.name,
        unit: item.unit,
      };

      selectedItemPill.textContent = `Selected: ${item.name}`;
      itemSearchInput.value = item.name;
      itemSearchResults.innerHTML = "";
    });
    itemSearchResults.appendChild(option);
  });
}

function addItemToOrder() {
  if (!selectedItem) {
    window.alert("Select an item from search results first.");
    return;
  }

  const quantity = normalizeQuantity(quantityInput.value);
  if (!(quantity > 0)) {
    window.alert("Quantity must be greater than zero.");
    return;
  }

  const existing = orderItems.find((item) => item.name === selectedItem.name);

  if (existing) {
    existing.quantity += quantity;
  } else {
    orderItems.push({
      name: selectedItem.name,
      unit: selectedItem.unit,
      quantity,
    });
  }

  renderOrderItems();
}

function renderGoodsRows(target, rows) {
  target.innerHTML = "";

  if (rows.length === 0) {
    const empty = document.createElement("div");
    empty.className = "table-row table-wide-row";
    empty.innerHTML =
      "<span>No items yet.</span><span>-</span><span>-</span><span>-</span><span>-</span>";
    target.appendChild(empty);
    return;
  }

  rows.forEach((item) => {
    const lineTotal = Number(item.quantity * item.unitPrice).toFixed(2);
    const row = document.createElement("div");
    row.className = "table-row table-wide-row";
    row.innerHTML = `
      <span>${item.name}</span>
      <span>${item.quantity}</span>
      <span>${item.unit}</span>
      <span>${Number(item.unitPrice).toFixed(2)}</span>
      <span>${lineTotal}</span>
    `;
    target.appendChild(row);
  });
}

function renderGoodsReceivedItems() {
  renderGoodsRows(goodsItemsBody, goodsReceivedItems);
}

function renderGoodsReceivedReview() {
  renderGoodsRows(goodsReviewItemsBody, goodsReceivedItems);
}

function renderGoodsReviewMeta() {
  const invoiceNumber = String(goodsInvoiceNumberInput.value || "").trim() || "-";
  const invoiceDate = String(goodsInvoiceDateInput.value || "").trim() || "-";
  goodsReviewMeta.textContent = `Invoice Number: ${invoiceNumber} | Invoice Date: ${invoiceDate}`;
}

function renderGoodsSearchResults(searchTerm) {
  const normalizedSearch = String(searchTerm || "").trim().toLowerCase();
  goodsSearchResults.innerHTML = "";

  if (!normalizedSearch) return;

  const matches = catalogItems.filter((item) =>
    item.name.toLowerCase().includes(normalizedSearch)
  );

  matches.forEach((item) => {
    const option = document.createElement("li");
    option.textContent = `${item.name} (${item.unit})`;
    option.dataset.itemName = item.name;
    option.dataset.itemUnit = item.unit;
    option.addEventListener("click", () => {
      goodsSelectedItem = {
        name: item.name,
        unit: item.unit,
      };

      goodsSelectedItemPill.textContent = `Selected: ${item.name}`;
      goodsSearchInput.value = item.name;
      goodsSearchResults.innerHTML = "";
    });
    goodsSearchResults.appendChild(option);
  });
}

function addItemToGoodsReceived() {
  if (!goodsSelectedItem) {
    window.alert("Select an item from goods received search results first.");
    return;
  }

  const quantity = normalizeQuantity(goodsQuantityInput.value);
  const unitPrice = normalizeMoney(goodsUnitPriceInput.value);

  if (!(quantity > 0)) {
    window.alert("Received quantity must be greater than zero.");
    return;
  }

  const existing = goodsReceivedItems.find(
    (item) => item.name === goodsSelectedItem.name
  );

  if (existing) {
    existing.quantity += quantity;
    existing.unitPrice = unitPrice;
  } else {
    goodsReceivedItems.push({
      name: goodsSelectedItem.name,
      unit: goodsSelectedItem.unit,
      quantity,
      unitPrice,
    });
  }

  renderGoodsReceivedItems();
}

loginButton.addEventListener("click", () => {
  const username = String(usernameInput.value || "").trim();
  const password = String(passwordInput.value || "").trim();

  if (username !== credentials.username || password !== credentials.password) {
    loginError.classList.remove("hidden");
    return;
  }

  loginError.classList.add("hidden");
  showPage(orderPage);
});

itemSearchInput.addEventListener("input", (event) => {
  renderSearchResults(event.target.value);
});

addItemButton.addEventListener("click", addItemToOrder);
openGoodsReceivedButton.addEventListener("click", () => {
  showPage(goodsReceivedPage);
});
reviewOpenGoodsReceivedButton.addEventListener("click", () => {
  showPage(goodsReceivedPage);
});

goReviewButton.addEventListener("click", () => {
  renderReviewItems();
  showPage(reviewPage);
});

backToOrderButton.addEventListener("click", () => {
  showPage(orderPage);
});

submitPlaceholderButton.addEventListener("click", () => {
  window.alert("Submit remains manual in this mock portal.");
});

goodsSearchInput.addEventListener("input", (event) => {
  renderGoodsSearchResults(event.target.value);
});

goodsAddItemButton.addEventListener("click", addItemToGoodsReceived);
goodsBackToOrderButton.addEventListener("click", () => {
  showPage(orderPage);
});
goodsReviewButton.addEventListener("click", () => {
  renderGoodsReviewMeta();
  renderGoodsReceivedReview();
  goodsSaveState.classList.add("hidden");
  showPage(goodsReceivedReviewPage);
});
goodsReviewBackButton.addEventListener("click", () => {
  showPage(goodsReceivedPage);
});
goodsSaveButton.addEventListener("click", () => {
  goodsSaveState.classList.remove("hidden");
});

showPage(loginPage);
renderOrderItems();
renderGoodsReceivedItems();
renderGoodsReceivedReview();
