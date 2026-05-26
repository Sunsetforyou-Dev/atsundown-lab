const messagesEl = document.querySelector("#messages");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const orderForm = document.querySelector("#orderForm");
const orderStatus = document.querySelector("#orderStatus");
const scriptSelect = document.querySelector("#script");
const priceBox = document.querySelector("#priceBox");
const serverStatus = document.querySelector("#serverStatus");

let scripts = [];

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
      option.textContent = `${script.name} - ${formatPrice(script.price)}`;
      return option;
    }),
  );
  updatePrice();
}

function updatePrice() {
  const selected = scripts.find((script) => script.name === scriptSelect.value);
  priceBox.textContent = selected ? `ราคา: ${formatPrice(selected.price)}` : "ราคา: -";
}

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

scriptSelect.addEventListener("change", updatePrice);

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
    updatePrice();
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

addMessage(
  "assistant",
  "สวัสดีครับ ถามข้อมูลสคริปต์ FiveM หรือส่งออเดอร์ผ่านฟอร์มด้านข้างได้เลยครับ",
);

await Promise.all([loadHealth(), loadScripts()]);
