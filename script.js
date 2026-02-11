const ADMIN_PASSWORD = "loyal";

// ===== URL & LOCKDOWN MODULE =====
const URLModule = (() => {
  function getParams() {
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

  function clearLockdownParams() {
    const url = new URL(window.location.href);
    url.searchParams.delete("lockdown");
    url.searchParams.delete("end");
    url.searchParams.delete("msg");
    window.history.replaceState({}, "", url.toString());
  }

  function setLockdownParams(message, endTimestamp) {
    const url = new URL(window.location.href);
    url.searchParams.set("lockdown", "1");
    url.searchParams.set("end", String(endTimestamp));
    url.searchParams.set("msg", encodeURIComponent(message));
    window.location.href = url.toString();
  }

  return { getParams, clearLockdownParams, setLockdownParams };
})();

const LockdownModule = (() => {
  const overlay = document.getElementById("lockdown-overlay");
  const msgEl = document.getElementById("lockdown-message");
  const timerEl = document.getElementById("lockdown-timer");
  const adminBtn = document.getElementById("lockdown-admin-button");
  const popup = document.getElementById("lockdown-admin-popup");
  const passInput = document.getElementById("lockdown-admin-password");
  const cancelBtn = document.getElementById("lockdown-admin-cancel");
  const submitBtn = document.getElementById("lockdown-admin-submit");
  const errorEl = document.getElementById("lockdown-admin-error");

  let interval = null;

  function format(ms) {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function startCountdown(end) {
    function tick() {
      const now = Date.now();
      const remaining = end - now;
      if (remaining <= 0) {
        timerEl.textContent = "00:00:00";
        URLModule.clearLockdownParams();
        hide();
        return;
      }
      timerEl.textContent = format(remaining);
    }
    tick();
    interval = setInterval(tick, 1000);
  }

  function show(message, end) {
    msgEl.textContent = message || "This site is currently locked.";
    overlay.classList.remove("lockdown-hidden");
    document.body.style.overflow = "hidden";
    if (interval) clearInterval(interval);
    if (end) startCountdown(end);
    else timerEl.textContent = "--:--:--";
  }

  function hide() {
    overlay.classList.add("lockdown-hidden");
    document.body.style.overflow = "";
    if (interval) clearInterval(interval);
  }

  // Admin popup
  adminBtn.addEventListener("click", () => {
    errorEl.textContent = "";
    passInput.value = "";
    popup.classList.remove("lockdown-popup-hidden");
    passInput.focus();
  });

  cancelBtn.addEventListener("click", () => {
    popup.classList.add("lockdown-popup-hidden");
  });

  submitBtn.addEventListener("click", () => {
    const val = passInput.value.trim();
    if (val === ADMIN_PASSWORD) {
      URLModule.clearLockdownParams();
      hide();
      popup.classList.add("lockdown-popup-hidden");
    } else {
      errorEl.textContent = "Incorrect password.";
    }
  });

  passInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitBtn.click();
  });

  function initFromURL() {
    const params = URLModule.getParams();
    if (params.lockdown === "1") {
      const msg = params.msg ? decodeURIComponent(params.msg) : "This site is currently locked.";
      const end = params.end ? parseInt(params.end, 10) : null;
      show(msg, end);
    } else {
      hide();
    }
  }

  return { initFromURL, show, hide };
})();

// ===== SPA MODULE =====
const SPAModule = (() => {
  const mainView = document.getElementById("main-view");
  const navButtons = document.querySelectorAll(".nav-btn");
  let games = [];

  function renderHome() {
    mainView.innerHTML = `
      <section>
        <h2>Home</h2>
        <p>Welcome to BLK Launcher.</p>
      </section>
    `;
  }

  function renderGames() {
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
            This will reload with ?lockdown=1&end=TIMESTAMP&msg=...  
            Everyone using that URL will see lockdown.
          </p>
        </div>
      </section>
    `;

    const btn = document.getElementById("admin-activate-lockdown");
    const msgInput = document.getElementById("admin-lock-msg");
    const minsInput = document.getElementById("admin-lock-mins");

    btn.addEventListener("click", () => {
      const msg = msgInput.value.trim() || "This site is currently locked.";
      const mins = parseInt(minsInput.value, 10) || 60;
      const endTimestamp = Date.now() + mins * 60 * 1000;
      URLModule.setLockdownParams(msg, endTimestamp);
    });
  }

  function setView(view) {
    if (view === "home") renderHome();
    else if (view === "games") renderGames();
    else if (view === "favorites") renderFavorites();
    else if (view === "admin") renderAdmin();
  }

  function initNav() {
    navButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-view");
        setView(view);
      });
    });
  }

  function loadGames() {
    return fetch("games.json")
      .then((res) => res.json())
      .then((data) => {
        games = data;
      })
      .catch(() => {
        games = [];
      });
  }

  async function init() {
    await loadGames();
    initNav();
    renderHome();
  }

  return { init, setView };
})();

// ===== INIT =====
LockdownModule.initFromURL();
SPAModule.init();
