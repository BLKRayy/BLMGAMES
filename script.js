// ===== CONFIG =====
const ADMIN_PASSWORD = "loyal";

// ===== URL HELPERS =====
function getQueryParams() {
  const params = {};
  const search = window.location.search.substring(1);
  if (!search) return params;
  for (const part of search.split("&")) {
    const [key, value] = part.split("=");
    if (!key) continue;
    params[decodeURIComponent(key)] = decodeURIComponent(value || "");
  }
  return params;
}

function removeLockdownFromURL() {
  const url = new URL(window.location.href);
  url.searchParams.delete("lockdown");
  url.searchParams.delete("end");
  url.searchParams.delete("msg");
  window.history.replaceState({}, "", url.toString());
}

// ===== LOCKDOWN LOGIC =====
const lockdownOverlay = document.getElementById("lockdown-overlay");
const lockdownMessageEl = document.getElementById("lockdown-message");
const lockdownTimerEl = document.getElementById("lockdown-timer");
const lockdownAdminButton = document.getElementById("lockdown-admin-button");
const lockdownAdminPopup = document.getElementById("lockdown-admin-popup");
const lockdownAdminPasswordInput = document.getElementById("lockdown-admin-password");
const lockdownAdminCancel = document.getElementById("lockdown-admin-cancel");
const lockdownAdminSubmit = document.getElementById("lockdown-admin-submit");
const lockdownAdminError = document.getElementById("lockdown-admin-error");

let lockdownInterval = null;

function formatTimeRemaining(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function startLockdownCountdown(endTimestamp) {
  function update() {
    const now = Date.now();
    const remaining = endTimestamp - now;
    if (remaining <= 0) {
      lockdownTimerEl.textContent = "00:00:00";
      // Auto-clear lockdown when time is up
      removeLockdownFromURL();
      hideLockdownOverlay();
      return;
    }
    lockdownTimerEl.textContent = formatTimeRemaining(remaining);
  }

  update();
  lockdownInterval = setInterval(update, 1000);
}

function showLockdownOverlay(message, endTimestamp) {
  lockdownMessageEl.textContent = message || "This site is currently locked.";
  lockdownOverlay.classList.remove("lockdown-hidden");
  document.body.style.overflow = "hidden"; // hard lock
  if (lockdownInterval) clearInterval(lockdownInterval);
  if (endTimestamp) {
    startLockdownCountdown(endTimestamp);
  } else {
    lockdownTimerEl.textContent = "--:--:--";
  }
}

function hideLockdownOverlay() {
  lockdownOverlay.classList.add("lockdown-hidden");
  document.body.style.overflow = "";
  if (lockdownInterval) clearInterval(lockdownInterval);
}

// Admin popup handlers
lockdownAdminButton.addEventListener("click", () => {
  lockdownAdminError.textContent = "";
  lockdownAdminPasswordInput.value = "";
  lockdownAdminPopup.classList.remove("lockdown-popup-hidden");
  lockdownAdminPasswordInput.focus();
});

lockdownAdminCancel.addEventListener("click", () => {
  lockdownAdminPopup.classList.add("lockdown-popup-hidden");
});

lockdownAdminSubmit.addEventListener("click", () => {
  const value = lockdownAdminPasswordInput.value.trim();
  if (value === ADMIN_PASSWORD) {
    // Correct password: disable lockdown globally
    removeLockdownFromURL();
    hideLockdownOverlay();
    lockdownAdminPopup.classList.add("lockdown-popup-hidden");
  } else {
    lockdownAdminError.textContent = "Incorrect password.";
  }
});

// Close popup on Enter
lockdownAdminPasswordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    lockdownAdminSubmit.click();
  }
});

// Initialize lockdown from URL
(function initLockdownFromURL() {
  const params = getQueryParams();
  if (params.lockdown === "1") {
    const msg = params.msg || "This site is currently locked.";
    const end = params.end ? parseInt(params.end, 10) : null;
    showLockdownOverlay(msg, end);
  } else {
    hideLockdownOverlay();
  }
})();

// ===== SIMPLE SPA VIEWS =====
const mainView = document.getElementById("main-view");

function renderHome() {
  mainView.innerHTML = `
    <section>
      <h2>Home</h2>
      <p>Welcome to BLK Launcher.</p>
    </section>
  `;
}

function renderGames(games) {
  const cards = games
    .map(
      (g) => `
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
      <div class="game-grid">
        ${cards}
      </div>
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

function renderAdmin() {
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
          This will generate a URL with ?lockdown=1&end=TIMESTAMP&msg=...  
          Share that URL or refresh with it to lock everyone.
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

// Nav handling
const navButtons = document.querySelectorAll(".nav-btn");
let gamesCache = [];

function setActiveView(view) {
  if (view === "home") renderHome();
  else if (view === "games") renderGames(gamesCache);
  else if (view === "favorites") renderFavorites();
  else if (view === "admin") renderAdmin();
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.getAttribute("data-view");
    setActiveView(view);
  });
});

// Load games.json
fetch("games.json")
  .then((res) => res.json())
  .then((data) => {
    gamesCache = data;
    renderHome();
  })
  .catch(() => {
    gamesCache = [];
    renderHome();
  });
