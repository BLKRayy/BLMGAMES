// ===== CONFIG =====
const ADMIN_PASSWORD = "loyal";

// ===== URL PARAM HELPERS =====
function getParams() {
  const params = {};
  const raw = window.location.search.substring(1);
  if (!raw) return params;
  raw.split("&").forEach(p => {
    const [k, v] = p.split("=");
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || "");
  });
  return params;
}

function clearLockdownParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("lockdown");
  url.searchParams.delete("end");
  url.searchParams.delete("msg");
  window.history.replaceState({}, "", url.toString());
}

// ===== LOCKDOWN ELEMENTS =====
const overlay = document.getElementById("lockdown-overlay");
const msgEl = document.getElementById("lockdown-message");
const timerEl = document.getElementById("lockdown-timer");

const lockdownAdminBtn = document.getElementById("lockdown-admin-button");
const lockdownPopup = document.getElementById("lockdown-admin-popup");
const lockdownPassInput = document.getElementById("lockdown-admin-password");
const lockdownCancelBtn = document.getElementById("lockdown-admin-cancel");
const lockdownSubmitBtn = document.getElementById("lockdown-admin-submit");
const lockdownErrorEl = document.getElementById("lockdown-admin-error");

let lockdownInterval = null;

// ===== LOCKDOWN CORE =====
function formatTime(ms) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function showLockdown(message, end) {
  msgEl.textContent = message || "This site is currently locked.";
  overlay.classList.remove("lockdown-hidden");
  document.body.style.overflow = "hidden";

  if (lockdownInterval) clearInterval(lockdownInterval);

  if (end) {
    const tick = () => {
      const now = Date.now();
      const left = end - now;
      if (left <= 0) {
        timerEl.textContent = "00:00:00";
        clearLockdownParams();
        hideLockdown();
        return;
      }
      timerEl.textContent = formatTime(left);
    };
    tick();
    lockdownInterval = setInterval(tick, 1000);
  } else {
    timerEl.textContent = "--:--:--";
  }
}

function hideLockdown() {
  overlay.classList.add("lockdown-hidden");
  document.body.style.overflow = "";
  if (lockdownInterval) clearInterval(lockdownInterval);
}

// ===== LOCKDOWN ADMIN POPUP (ONLY OPENS ON CLICK) =====
lockdownAdminBtn.addEventListener("click", () => {
  lockdownErrorEl.textContent = "";
  lockdownPassInput.value = "";
  lockdownPopup.classList.remove("lockdown-popup-hidden");
  lockdownPassInput.focus();
});

lockdownCancelBtn.addEventListener("click", () => {
  lockdownPopup.classList.add("lockdown-popup-hidden");
});

lockdownSubmitBtn.addEventListener("click", () => {
  const val = lockdownPassInput.value.trim();
  if (val === ADMIN_PASSWORD) {
    clearLockdownParams();
    hideLockdown();
    lockdownPopup.classList.add("lockdown-popup-hidden");
  } else {
    lockdownErrorEl.textContent = "Incorrect password.";
  }
});

lockdownPassInput.addEventListener("keydown", e => {
  if (e.key === "Enter") lockdownSubmitBtn.click();
});

// ===== INIT LOCKDOWN FROM URL =====
(function initLockdown() {
  const p = getParams();
  if (p.lockdown === "1") {
    const msg = p.msg ? decodeURIComponent(p.msg) : "This site is currently locked.";
    const end = p.end ? parseInt(p.end, 10) : null;
    showLockdown(msg, end);
  } else {
    hideLockdown();
  }
})();

// ===== SIMPLE SPA (WITH ADMIN PANEL LOGIN) =====
const mainView = document.getElementById("main-view");
const navButtons = document.querySelectorAll(".nav-btn");

let gamesCache = [];
let isAdmin = false; // admin panel access flag

function renderHome() {
  mainView.innerHTML = `
    <section>
      <h2>Home</h2>
      <p>Welcome to BLK Launcher.</p>
    </section>
  `;
}

function renderGames() {
  const cards = gamesCache
    .map(
      g => `
      <div class="game-card">
        <div class="game-title">${g.title}</div>
        <div class="game-meta">${g.category}</div>
        <div class="game-meta">${g.description}</div>
      </div>
    `
    )
    .join("");
  mainView.innerHTML = `
    <section>
      <h2>Games</h2>
      <div class="game-grid">${cards}</div>
    </section>
  `;
}

function renderFavorites() {
  mainView.innerHTML = `
    <section>
      <h2>Favorites</h2>
      <p>Favorites system placeholder.</p>
    </section>
  `;
}

function renderAdminPanel() {
  mainView.innerHTML = `
    <section>
      <h2>Admin Panel</h2>
      <div class="admin-panel">
        <h2>Global Lockdown Control</h2>
        <div class="admin-field">
          <label for="admin-lock-msg">Lockdown Message</label>
          <textarea id="admin-lock-msg" rows="3" placeholder="Enter lockdown message..."></textarea>
        </div>
        <div class="admin-field">
          <label for="admin-lock-mins">Duration (minutes)</label>
          <input type="number" id="admin-lock-mins" min="1" max="1440" value="60" />
        </div>
        <button id="admin-activate-lockdown">Activate Lockdown</button>
        <p style="margin-top:8px;font-size:11px;color:#aaa;">
          This will reload with ?lockdown=1&end=TIMESTAMP&msg=...  
          Everyone using that URL will see the lockdown screen.
        </p>
      </div>
    </section>
  `;

  const btn = document.getElementById("admin-activate-lockdown");
  const msgInput = document.getElementById("admin-lock-msg");
  const minsInput = document.getElementById("admin-lock-mins");

  btn.addEventListener("click", () => {
    const msg = encodeURIComponent(msgInput.value.trim() || "This site is currently locked.");
    const mins = parseInt(minsInput.value, 10) || 60;
    const endTimestamp = Date.now() + mins * 60 * 1000;

    const url = new URL(window.location.href);
    url.searchParams.set("lockdown", "1");
    url.searchParams.set("end", String(endTimestamp));
    url.searchParams.set("msg", msg);

    window.location.href = url.toString();
  });
}

function requireAdminAndRender() {
  if (!isAdmin) {
    const entered = prompt("Admin password:");
    if (entered === null) return; // cancelled
    if (entered.trim() !== ADMIN_PASSWORD) {
      alert("Incorrect password.");
      return;
    }
    isAdmin = true;
  }
  renderAdminPanel();
}

function setView(view) {
  if (view === "home") renderHome();
  else if (view === "games") renderGames();
  else if (view === "favorites") renderFavorites();
  else if (view === "admin") requireAdminAndRender();
}

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.getAttribute("data-view");
    setView(view);
  });
});

// Load games.json
fetch("games.json")
  .then(res => res.json())
  .then(data => {
    gamesCache = data;
    renderHome();
  })
  .catch(() => {
    gamesCache = [];
    renderHome();
  });
