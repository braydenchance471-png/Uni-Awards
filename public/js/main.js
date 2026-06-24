const API_URL = "/api/data";

let siteData = null;
let countdownInterval = null;

const fallbackData = {
  countdownDate: "2026-12-31T20:00:00",
  leaderboardHidden: false,
  leaderboardHiddenMessage: "The leaderboard is currently hidden. Check back soon for the official rankings.",
  guidelines: [
    {
      title: "Original Work",
      text: "All submitted games must be created during the jam period and must follow the official Unify Awards rules."
    },
    {
      title: "Team Size",
      text: "Teams may work solo or in groups. Every team member must be credited properly."
    },
    {
      title: "Submission Deadline",
      text: "Projects must be submitted before the countdown reaches zero. Late submissions may not be counted."
    },
    {
      title: "Respect",
      text: "All participants must be respectful. Harassment, stealing work, or breaking rules can lead to disqualification."
    }
  ],
  information: {
    title: "About UnifyAwards 2026",
    text: "Unify Awards is a polished game jam and awards event where developers create, submit, and showcase their games. Compete for placements, prizes, recognition, and a spot on the official leaderboard."
  },
  podium: [],
  leaderboard: []
};

document.addEventListener("DOMContentLoaded", async () => {
  setupMobileNav();
  setupPageTransitions();
  setupAnimatedBackground();

  siteData = await fetchSiteData();

  if (document.querySelector("[data-countdown]")) {
    setupCountdown(siteData.countdownDate);
  }

  renderGuidelines(siteData.guidelines);
  renderInformation(siteData.information);
  renderPodium(siteData.podium, siteData);
  renderLeaderboard(siteData.leaderboard, siteData);
});

async function fetchSiteData() {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Bad API response");

    const data = await res.json();

    return {
      ...fallbackData,
      ...data,
      guidelines: Array.isArray(data.guidelines) && data.guidelines.length ? data.guidelines : fallbackData.guidelines,
      information: data.information && typeof data.information === "object" ? data.information : fallbackData.information,
      podium: Array.isArray(data.podium) && data.podium.length ? data.podium : fallbackData.podium,
      leaderboard: Array.isArray(data.leaderboard) && data.leaderboard.length ? data.leaderboard : fallbackData.leaderboard,
      leaderboardHidden: Boolean(data.leaderboardHidden),
      leaderboardHiddenMessage: data.leaderboardHiddenMessage || fallbackData.leaderboardHiddenMessage
    };
  } catch (err) {
    console.error("Failed to load site data:", err);
    return fallbackData;
  }
}

function setupMobileNav() {
  const toggle = document.querySelector(".nav-toggle, .menu-toggle");
  const nav = document.querySelector(".nav-links");

  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    nav.classList.toggle("open");
    toggle.classList.toggle("open");
  });
}

function setupPageTransitions() {
  document.body.classList.add("page-loaded");

  document.querySelectorAll("a[data-transition]").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      e.preventDefault();
      document.body.classList.add("page-leaving");

      setTimeout(() => {
        window.location.href = href;
      }, 260);
    });
  });
}

function setupAnimatedBackground() {
  const bg = document.querySelector(".animated-bg, .background");
  if (!bg) return;

  for (let i = 0; i < 12; i++) {
    const particle = document.createElement("b");
    particle.className = "bg-particle";

    const size = Math.floor(Math.random() * 8) + 4;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 8}s`;
    particle.style.animationDuration = `${8 + Math.random() * 18}s`;

    bg.appendChild(particle);
  }
}

function setupCountdown(dateValue) {
  const countdown = document.querySelector("[data-countdown]");
  if (!countdown) return;

  const monthsEl = countdown.querySelector("[data-months]");
  const daysEl = countdown.querySelector("[data-days]");
  const hoursEl = countdown.querySelector("[data-hours]");
  const minutesEl = countdown.querySelector("[data-minutes]");
  const secondsEl = countdown.querySelector("[data-seconds]");

  const target = new Date(dateValue);

  function updateCountdown() {
    const now = new Date();

    if (Number.isNaN(target.getTime()) || target <= now) {
      setCountdownValue(monthsEl, "00");
      setCountdownValue(daysEl, "00");
      setCountdownValue(hoursEl, "00");
      setCountdownValue(minutesEl, "00");
      setCountdownValue(secondsEl, "00");
      return;
    }

    const parts = getCalendarCountdown(now, target);

    setCountdownValue(monthsEl, pad(parts.months));
    setCountdownValue(daysEl, pad(parts.days));
    setCountdownValue(hoursEl, pad(parts.hours));
    setCountdownValue(minutesEl, pad(parts.minutes));
    setCountdownValue(secondsEl, pad(parts.seconds));
  }

  clearInterval(countdownInterval);
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

function getCalendarCountdown(startDate, endDate) {
  let months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());

  let anchor = new Date(startDate);
  anchor.setMonth(anchor.getMonth() + months);

  if (anchor > endDate) {
    months--;
    anchor = new Date(startDate);
    anchor.setMonth(anchor.getMonth() + months);
  }

  let remaining = endDate.getTime() - anchor.getTime();

  const dayMs = 1000 * 60 * 60 * 24;
  const hourMs = 1000 * 60 * 60;
  const minuteMs = 1000 * 60;

  const days = Math.floor(remaining / dayMs);
  remaining -= days * dayMs;

  const hours = Math.floor(remaining / hourMs);
  remaining -= hours * hourMs;

  const minutes = Math.floor(remaining / minuteMs);
  remaining -= minutes * minuteMs;

  const seconds = Math.floor(remaining / 1000);

  return { months, days, hours, minutes, seconds };
}

function setCountdownValue(element, value) {
  if (!element || element.textContent === value) return;

  element.textContent = value;
  element.classList.remove("tick");

  requestAnimationFrame(() => {
    element.classList.add("tick");
  });
}

function renderGuidelines(guidelines) {
  const list = document.querySelector("[data-guidelines-list], #guidelinesCards");
  if (!list) return;

  list.innerHTML = "";

  guidelines.forEach((rule, index) => {
    const card = document.createElement("article");
    card.className = "content-card rule-card reveal";
    card.style.animationDelay = `${index * 0.07}s`;

    card.innerHTML = `
      <div class="card-number">${String(index + 1).padStart(2, "0")}</div>
      <h3>${escapeHTML(rule.title)}</h3>
      <p>${escapeHTML(rule.text)}</p>
    `;

    list.appendChild(card);
  });
}

function renderInformation(info) {
  const box = document.querySelector("[data-information], #informationPanel");
  if (!box) return;

  box.innerHTML = `
    <article class="hero-card info-main-card reveal">
      <span class="eyebrow">Official Event</span>
      <h1>${escapeHTML(info.title)}</h1>
      <p>${escapeHTML(info.text)}</p>
    </article>

    <div class="content-grid info-extra-grid">
      <article class="content-card reveal">
        <div class="card-number">01</div>
        <h3>Build</h3>
        <p>Create your game during the jam period and prepare it for judging.</p>
      </article>

      <article class="content-card reveal">
        <div class="card-number">02</div>
        <h3>Submit</h3>
        <p>Submit your project before the countdown ends so it can be reviewed.</p>
      </article>

      <article class="content-card reveal">
        <div class="card-number">03</div>
        <h3>Compete</h3>
        <p>Top games appear on the leaderboard and can earn official placements.</p>
      </article>
    </div>
  `;
}

function renderPodium(podium, data = siteData) {
  const wrapper = document.querySelector("[data-podium], #podium");
  if (!wrapper) return;

  wrapper.innerHTML = "";

  if (data?.leaderboardHidden) {
    wrapper.classList.add("hidden");
    return;
  }

  wrapper.classList.remove("hidden");

  const ordered = [
    podium[0] || fallbackData.podium[0],
    podium[1] || fallbackData.podium[1],
    podium[2] || fallbackData.podium[2]
  ];

  ordered.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = index === 1 ? "podium-card first reveal" : "podium-card reveal";

    const imageHTML = item.image
      ? `<img src="${escapeAttribute(item.image)}" alt="${escapeAttribute(item.gameName)}">`
      : `<div class="image-placeholder">No Image</div>`;

    card.innerHTML = `
      <div class="floating-game">
        <h3>${escapeHTML(item.gameName)}</h3>
        <div class="game-image-square">${imageHTML}</div>
      </div>

      <div class="podium-block">
        <span>${escapeHTML(item.placement)}</span>
        <strong>${escapeHTML(item.prize)}</strong>
      </div>
    `;

    wrapper.appendChild(card);
  });
}

function renderLeaderboard(entries, data = siteData) {
  const list = document.querySelector("[data-leaderboard], #leaderboardRows");
  const leaderboardSection = document.querySelector(".leaderboard-list");
  const main = document.querySelector("main");

  if (!list) return;

  const existingMessage = document.querySelector(".leaderboard-hidden-message");
  if (existingMessage) existingMessage.remove();

  if (data?.leaderboardHidden) {
    if (leaderboardSection) leaderboardSection.classList.add("hidden");

    const message = document.createElement("section");
    message.className = "leaderboard-hidden-message reveal";
    message.innerHTML = `
      <span class="eyebrow">Leaderboard Hidden</span>
      <h2>Rankings are not public yet</h2>
      <p>${escapeHTML(data.leaderboardHiddenMessage || fallbackData.leaderboardHiddenMessage)}</p>
    `;

    if (main) main.appendChild(message);
    return;
  }

  if (leaderboardSection) leaderboardSection.classList.remove("hidden");
  list.innerHTML = "";

  entries.forEach((entry) => {
    if (list.tagName.toLowerCase() === "tbody") {
      const tr = document.createElement("tr");
      tr.className = "reveal";
      tr.innerHTML = `
        <td>#${escapeHTML(entry.rank)}</td>
        <td>${escapeHTML(entry.team)}</td>
        <td>${escapeHTML(entry.project)}</td>
        <td>${escapeHTML(entry.score)}</td>
        <td><span class="status-pill">${escapeHTML(entry.status)}</span></td>
        <td>${escapeHTML(entry.prize)}</td>
      `;
      list.appendChild(tr);
      return;
    }

    const row = document.createElement("article");
    row.className = "leaderboard-row reveal";
    row.innerHTML = `
      <div class="rank">#${escapeHTML(entry.rank)}</div>
      <div><span class="label">Team / Developer</span><strong>${escapeHTML(entry.team)}</strong></div>
      <div><span class="label">Project</span><strong>${escapeHTML(entry.project)}</strong></div>
      <div><span class="label">Score</span><strong>${escapeHTML(entry.score)}</strong></div>
      <div><span class="label">Status</span><strong>${escapeHTML(entry.status)}</strong></div>
      <div><span class="label">Prize</span><strong>${escapeHTML(entry.prize)}</strong></div>
    `;
    list.appendChild(row);
  });
}

function pad(value) {
  return String(Math.max(0, value)).padStart(2, "0");
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
