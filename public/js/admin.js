let originalState = null;

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const saveButton = document.getElementById("saveBtn");
const saveMessage = document.getElementById("saveMessage");
const logoutButton = document.getElementById("logoutBtn");

const countMonth = document.getElementById("countMonth");
const countDay = document.getElementById("countDay");
const countYear = document.getElementById("countYear");
const countTime = document.getElementById("countTime");
const infoTitle = document.getElementById("infoTitle");
const infoText = document.getElementById("infoText");
const rulesEditor = document.getElementById("rulesEditor");
const podiumEditor = document.getElementById("podiumEditor");
const leaderboardEditor = document.getElementById("leaderboardEditor");
const addRuleBtn = document.getElementById("addRuleBtn");
const addEntryBtn = document.getElementById("addEntryBtn");
const leaderboardHiddenInput = document.getElementById("leaderboardHidden");
const leaderboardHiddenMessageInput = document.getElementById("leaderboardHiddenMessage");

const fallbackData = {
  countdownDate: "2026-12-31T20:00:00",
  leaderboardHidden: false,
  leaderboardHiddenMessage: "The leaderboard is currently hidden. Check back soon for the official rankings.",
  guidelines: [
    { title: "Original Work", text: "All submitted games must be created during the jam period and must follow the official Unify Awards rules." },
    { title: "Team Size", text: "Teams may work solo or in groups. Every team member must be credited properly." },
    { title: "Submission Deadline", text: "Projects must be submitted before the countdown reaches zero. Late submissions may not be counted." },
    { title: "Respect", text: "All participants must be respectful. Harassment, stealing work, or breaking rules can lead to disqualification." }
  ],
  information: {
    title: "About UnifyAwards 2026",
    text: "Unify Awards is a polished game jam and awards event where developers create, submit, and showcase their games. Compete for placements, prizes, recognition, and a spot on the official leaderboard."
  },
  podium: [],
  leaderboard: []
};

document.addEventListener("DOMContentLoaded", async () => {
  setupLogin();
  setupLogout();
  setupAddButtons();
  setupSaveButton();
  setupDirtyTracking();
  await checkSession();
});

async function checkSession() {
  try {
    const res = await fetch("/api/admin/check", { cache: "no-store" });
    const data = await res.json();

    if (data.loggedIn) {
      showDashboard();
      await loadAdminData();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function setupLogin() {
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!data.success) {
        loginMessage.textContent = data.message || "Login failed.";
        return;
      }

      loginMessage.textContent = "";
      showDashboard();
      await loadAdminData();
    } catch {
      loginMessage.textContent = "Could not connect to the server.";
    }
  });
}

function setupLogout() {
  if (!logoutButton) return;

  logoutButton.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    showLogin();
  });
}

function setupAddButtons() {
  if (addRuleBtn) {
    addRuleBtn.addEventListener("click", () => {
      rulesEditor.appendChild(createRuleEditor({ title: "New Rule", text: "Rule description here." }));
      updateDirtyState();
    });
  }

  if (addEntryBtn) {
    addEntryBtn.addEventListener("click", () => {
      leaderboardEditor.appendChild(
        createLeaderboardEditor({
          rank: leaderboardEditor.children.length + 1,
          team: "New Team",
          project: "New Project",
          score: 0,
          status: "Pending",
          prize: "-"
        })
      );
      updateDirtyState();
    });
  }
}

function setupSaveButton() {
  setSaveButtonVisible(false);

  if (!saveButton) return;

  saveButton.addEventListener("click", async () => {
    const nextState = collectAdminState();

    try {
      const res = await fetch("/api/admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextState)
      });

      const data = await res.json();

      if (!data.success) {
        showStatus("Could not save changes.");
        return;
      }

      originalState = stableStringify(normaliseState(data.data || nextState));
      setSaveButtonVisible(false);
      showStatus("Changes saved successfully.");
    } catch {
      showStatus("Could not connect to the server.");
    }
  });
}

function setupDirtyTracking() {
  document.addEventListener("input", updateDirtyState);
  document.addEventListener("change", updateDirtyState);
  document.addEventListener("click", () => setTimeout(updateDirtyState, 0));
}

async function loadAdminData() {
  const res = await fetch("/api/data", { cache: "no-store" });
  const data = normaliseState(await res.json());

  renderCountdownEditor(data.countdownDate);
  renderInformationEditor(data.information);
  renderGuidelinesEditor(data.guidelines);
  renderPodiumEditor(data.podium);
  renderLeaderboardEditor(data.leaderboard);
  renderLeaderboardVisibility(data);

  originalState = stableStringify(collectAdminState());
  setSaveButtonVisible(false);
}

function normaliseState(data) {
  return {
    ...fallbackData,
    ...data,
    guidelines: Array.isArray(data?.guidelines) ? data.guidelines : fallbackData.guidelines,
    information: data?.information && typeof data.information === "object" ? data.information : fallbackData.information,
    podium: Array.isArray(data?.podium) ? data.podium : fallbackData.podium,
    leaderboard: Array.isArray(data?.leaderboard) ? data.leaderboard : fallbackData.leaderboard,
    leaderboardHidden: Boolean(data?.leaderboardHidden),
    leaderboardHiddenMessage: data?.leaderboardHiddenMessage || fallbackData.leaderboardHiddenMessage
  };
}

function showLogin() {
  if (loginView) loginView.classList.remove("hidden");
  if (dashboardView) dashboardView.classList.add("hidden");
}

function showDashboard() {
  if (loginView) loginView.classList.add("hidden");
  if (dashboardView) dashboardView.classList.remove("hidden");
}

function renderCountdownEditor(dateValue) {
  const date = new Date(dateValue);

  countYear.value = date.getFullYear();
  countMonth.value = date.getMonth() + 1;
  countDay.value = date.getDate();
  countTime.value = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function renderInformationEditor(info) {
  infoTitle.value = info.title || "";
  infoText.value = info.text || "";
}

function renderGuidelinesEditor(guidelines) {
  rulesEditor.innerHTML = "";
  guidelines.forEach((rule) => rulesEditor.appendChild(createRuleEditor(rule)));
}

function createRuleEditor(rule) {
  const item = document.createElement("div");
  item.className = "editor-item rule-editor-item";

  item.innerHTML = `
    <input class="rule-title" type="text" value="${escapeAttribute(rule.title)}" placeholder="Rule title">
    <textarea class="rule-text" rows="4" placeholder="Rule text">${escapeHTML(rule.text)}</textarea>
    <button class="danger-button" type="button">Delete</button>
  `;

  item.querySelector("button").addEventListener("click", () => {
    item.remove();
    updateDirtyState();
  });

  return item;
}

function renderPodiumEditor(podium) {
  podiumEditor.innerHTML = "";

  const safePodium = [
    podium[0] || fallbackData.podium[0],
    podium[1] || fallbackData.podium[1],
    podium[2] || fallbackData.podium[2]
  ];

  safePodium.forEach((item, index) => podiumEditor.appendChild(createPodiumEditor(item, index)));
}

function createPodiumEditor(item, index) {
  const card = document.createElement("div");
  card.className = "editor-item podium-admin-item";

  card.innerHTML = `
    <h3>Podium Slot ${index + 1}</h3>
    <label>Placement<input class="podium-placement" type="text" value="${escapeAttribute(item.placement)}"></label>
    <label>Game Name<input class="podium-game" type="text" value="${escapeAttribute(item.gameName)}"></label>
    <label>Image URL<input class="podium-image" type="text" value="${escapeAttribute(item.image || "")}" placeholder="Paste image URL or upload below"></label>
    <label>Upload Image<input class="podium-upload" type="file" accept="image/*"></label>
    <label>Prize<input class="podium-prize" type="text" value="${escapeAttribute(item.prize)}"></label>
  `;

  const upload = card.querySelector(".podium-upload");
  const imageInput = card.querySelector(".podium-image");

  upload.addEventListener("change", async () => {
    if (!upload.files || !upload.files[0]) return;

    const formData = new FormData();
    formData.append("image", upload.files[0]);

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        imageInput.value = data.url;
        updateDirtyState();
        showStatus("Image uploaded. Save changes to apply it.");
      } else {
        showStatus(data.message || "Image upload failed.");
      }
    } catch {
      showStatus("Image upload failed.");
    }
  });

  return card;
}

function renderLeaderboardVisibility(data) {
  if (leaderboardHiddenInput) leaderboardHiddenInput.checked = Boolean(data.leaderboardHidden);
  if (leaderboardHiddenMessageInput) leaderboardHiddenMessageInput.value = data.leaderboardHiddenMessage || fallbackData.leaderboardHiddenMessage;
}

function renderLeaderboardEditor(entries) {
  leaderboardEditor.innerHTML = "";
  entries.forEach((entry) => leaderboardEditor.appendChild(createLeaderboardEditor(entry)));
}

function createLeaderboardEditor(entry) {
  const item = document.createElement("div");
  item.className = "editor-item leaderboard-admin-item";

  item.innerHTML = `
    <input class="entry-rank" type="number" value="${escapeAttribute(entry.rank)}" placeholder="Rank">
    <input class="entry-team" type="text" value="${escapeAttribute(entry.team)}" placeholder="Team / Developer">
    <input class="entry-project" type="text" value="${escapeAttribute(entry.project)}" placeholder="Project name">
    <input class="entry-score" type="number" value="${escapeAttribute(entry.score)}" placeholder="Score">
    <input class="entry-status" type="text" value="${escapeAttribute(entry.status)}" placeholder="Status">
    <input class="entry-prize" type="text" value="${escapeAttribute(entry.prize)}" placeholder="Prize">
    <button class="danger-button" type="button">Delete</button>
  `;

  item.querySelector("button").addEventListener("click", () => {
    item.remove();
    updateDirtyState();
  });

  return item;
}

function collectAdminState() {
  const year = Number(countYear.value || 2026);
  const month = Number(countMonth.value || 1);
  const day = Number(countDay.value || 1);
  const [hour, minute] = (countTime.value || "00:00").split(":").map(Number);

  const countdownDate = new Date(year, month - 1, day, hour || 0, minute || 0).toISOString();

  const guidelines = [...rulesEditor.querySelectorAll(".rule-editor-item")].map((item) => ({
    title: item.querySelector(".rule-title").value.trim(),
    text: item.querySelector(".rule-text").value.trim()
  }));

  const podium = [...podiumEditor.querySelectorAll(".podium-admin-item")].map((item) => ({
    placement: item.querySelector(".podium-placement").value.trim(),
    gameName: item.querySelector(".podium-game").value.trim(),
    image: item.querySelector(".podium-image").value.trim(),
    prize: item.querySelector(".podium-prize").value.trim()
  }));

  const leaderboard = [...leaderboardEditor.querySelectorAll(".leaderboard-admin-item")].map((item) => ({
    rank: Number(item.querySelector(".entry-rank").value || 0),
    team: item.querySelector(".entry-team").value.trim(),
    project: item.querySelector(".entry-project").value.trim(),
    score: Number(item.querySelector(".entry-score").value || 0),
    status: item.querySelector(".entry-status").value.trim(),
    prize: item.querySelector(".entry-prize").value.trim()
  }));

  return {
    countdownDate,
    leaderboardHidden: Boolean(leaderboardHiddenInput?.checked),
    leaderboardHiddenMessage: leaderboardHiddenMessageInput?.value.trim() || fallbackData.leaderboardHiddenMessage,
    information: {
      title: infoTitle.value.trim(),
      text: infoText.value.trim()
    },
    guidelines,
    podium,
    leaderboard
  };
}

function updateDirtyState() {
  if (!originalState) return;
  setSaveButtonVisible(stableStringify(collectAdminState()) !== originalState);
}

function setSaveButtonVisible(visible) {
  if (!saveButton) return;
  saveButton.classList.toggle("visible", visible);
  saveButton.disabled = !visible;

  const saveBar = saveButton.closest(".save-bar");
  if (saveBar) saveBar.classList.toggle("visible", visible);

  if (saveMessage) {
    saveMessage.textContent = visible ? "You have unsaved changes." : "No unsaved changes.";
  }
}

function stableStringify(value) {
  return JSON.stringify(sortObject(value));
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;

  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = sortObject(value[key]);
      return result;
    }, {});
}

function showStatus(message) {
  if (saveMessage) saveMessage.textContent = message;

  let toast = document.querySelector(".admin-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "admin-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}
