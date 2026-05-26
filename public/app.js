export const THEME_STORAGE_KEY = "atsundown-theme";
export const DEFAULT_THEME = "light";

const hasDocument = typeof document !== "undefined";
const messagesEl = hasDocument ? document.querySelector("#messages") : null;
const chatForm = hasDocument ? document.querySelector("#chatForm") : null;
const chatInput = hasDocument ? document.querySelector("#chatInput") : null;
const orderForm = hasDocument ? document.querySelector("#orderForm") : null;
const orderStatus = hasDocument ? document.querySelector("#orderStatus") : null;
const scriptSelect = hasDocument ? document.querySelector("#script") : null;
const priceBox = hasDocument ? document.querySelector("#priceBox") : null;
const featureList = hasDocument ? document.querySelector("#featureList") : null;
const serverStatus = hasDocument ? document.querySelector("#serverStatus") : null;
const themeButtons = hasDocument
  ? document.querySelectorAll("[data-theme-option]")
  : [];

let scripts = [];

export function normalizeTheme(value) {
  return value === "dark" ? "dark" : DEFAULT_THEME;
}

export function getStoredTheme(storage = globalThis.localStorage) {
  try {
    return normalizeTheme(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(
  theme,
  root = hasDocument ? document.documentElement : { dataset: {} },
  storage = globalThis.localStorage,
) {
  const normalized = normalizeTheme(theme);
  root.dataset.theme = normalized;
  try {
    storage.setItem(THEME_STORAGE_KEY, normalized);
  } catch {
    // Theme persistence is best-effort only.
  }
  return normalized;
}

function syncThemeButtons(theme) {
  for (const button of themeButtons) {
    button.classList.toggle("active", button.dataset.themeOption === theme);
    button.setAttribute("aria-pressed", String(button.dataset.themeOption === theme));
  }
}

function setTheme(theme) {
  syncThemeButtons(applyTheme(theme));
}

function formatPrice(price) {
  return `${Number(price).toLocaleString("th-TH")} บาท`;
}

function addMessage(role, content) {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  message.textContent = content;
  messagesEl.append(message);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setOrderStatus(message, type = "") {
  orderStatus.textContent = message;
  orderStatus.className = `form-status ${type}`.trim();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload;
}

async function loadHealth() {
  try {
    await requestJson("/health");
    serverStatus.textContent = "Online";
    serverStatus.classList.add("ok");
  } catch {
    serverStatus.textContent = "Offline";
    serverStatus.classList.add("error");
  }
}

async function loadScripts() {
  const payload = await requestJson("/api/scripts");
  scripts = payload.scripts || [];
  scriptSelect.replaceChildren(
    ...scripts.map((script) => {
      const option = document.createElement("option");
      option.value = script.name;
      option.textContent = `${script.name} - ${script.description} - ${formatPrice(script.price)}`;
      return option;
    }),
  );
  updateProductPreview();
}

function updateProductPreview() {
  const selected = scripts.find((script) => script.name === scriptSelect.value);
  priceBox.textContent = selected ? `ราคา: ${formatPrice(selected.price)}` : "ราคา: -";
  featureList.replaceChildren(
    ...((selected?.features || []).map((feature) => {
      const item = document.createElement("li");
      item.textContent = feature;
      return item;
    })),
  );
}

if (hasDocument) {
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) {
    return;
  }

  addMessage("user", message);
  chatInput.value = "";
  chatInput.disabled = true;
  const submitButton = chatForm.querySelector("button");
  submitButton.disabled = true;

  try {
    addMessage("system", "กำลังค้นข้อมูลและเรียบเรียงคำตอบ...");
    const loadingMessage = messagesEl.lastElementChild;
    const payload = await requestJson("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    loadingMessage.remove();
    addMessage("assistant", payload.answer);
  } catch (error) {
    addMessage("system", error.message);
  } finally {
    chatInput.disabled = false;
    submitButton.disabled = false;
    chatInput.focus();
  }
});

scriptSelect.addEventListener("change", updateProductPreview);

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setOrderStatus("กำลังส่งออเดอร์...");
  const submitButton = orderForm.querySelector("button");
  submitButton.disabled = true;

  try {
    const formData = new FormData(orderForm);
    const payload = await requestJson("/api/orders", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData)),
    });

    orderForm.reset();
    updateProductPreview();
    setOrderStatus(
      `ส่งออเดอร์สำเร็จแล้ว เวลา ${payload.timestamp} แอดมินจะติดต่อกลับทาง Discord`,
      "success",
    );
  } catch (error) {
    setOrderStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

for (const button of themeButtons) {
  button.addEventListener("click", () => setTheme(button.dataset.themeOption));
}

setTheme(getStoredTheme());
addMessage(
  "assistant",
  "สวัสดีครับ ถามข้อมูลสินค้า FiveM หรือส่งออเดอร์ผ่านฟอร์มด้านข้างได้เลยครับ",
);

await Promise.all([loadHealth(), loadScripts()]);
}
