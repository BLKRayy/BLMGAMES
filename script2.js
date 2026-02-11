const ADMIN_PASSWORD = "loyal";

// ===== URL TOOLS =====
const URLTools = {
  get() {
    const params = {};
    const raw = window.location.search.substring(1);
    if (!raw) return params;
    raw.split("&").forEach(p => {
      const [k, v] = p.split("=");
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || "");
    });
    return params;
  },
  clearLockdown() {
    const url = new URL(window.location.href);
    ["lockdown", "end", "msg"].forEach(k => url.searchParams.delete(k));
    window.history.replaceState({}, "", url.toString());
  }
};

// ===== LOCKDOWN MODULE =====
const Lockdown = (() => {
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

  function fmt(ms) {
    if (ms <= 0) return "00:00:00";
    const s = Math.floor(ms / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  }

  function show(message, end) {
    msgEl.textContent = message || "This site is currently locked.";
    overlay.classList.remove("lockdown-hidden");
    document.body.style.overflow = "hidden";

    if (interval) clearInterval(interval);

    if (end) {
      const tick = () => {
        const now = Date.now();
        const left = end - now;
        if (left <= 0) {
          timerEl.textContent = "00:00:00";
          URLTools.clearLockdown();
          hide();
          return;
        }
        timerEl.textContent = fmt(left);
      };
      tick();
      interval = setInterval(tick, 1000);
    } else {
      timerEl.textContent = "--:--:--";
    }
  }

  function hide() {
    overlay.classList.add("lockdown-hidden");
    document.body.style.overflow = "";
    if (interval) clearInterval(interval);
  }

  // Admin popup only opens on click
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
    if (passInput.value.trim() === ADMIN_PASSWORD) {
      URLTools.clearLockdown();
      hide();
      popup.classList.add("lockdown-popup-hidden");
    } else {
      errorEl.textContent = "Incorrect password.";
    }
  });

  passInput.addEventListener("keydown", e => {
    if (e.key === "Enter") submitBtn.click();
  });

  function initFromURL() {
    const p = URLTools.get();
    if (p.lockdown === "1") {
      const msg = p.msg ? decodeURIComponent(p.msg) : "This site is currently locked.";
      const end = p.end ? parseInt(p.end, 10) : null;
      show(msg, end);
    } else {
      hide();
    }
  }

  return { initFromURL };
})();

// ===== APP MODULE (WITH ADMIN LOGIN) =====
const App = (() => {
  const mainView = document.getElementById("main-view");
  const navButtons = document.querySelectorAll(".nav-btn");

  let games = [];
  let isAdmin = false;

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

  function requireAdmin() {
    if (!isAdmin) {
      const entered = prompt("Admin password:");
      if (entered === null) return false;
      if (entered.trim() !== ADMIN_PASSWORD) {
        alert("Incorrect password.");
        return false;
      }
      isAdmin = true;
    }
    return true;
  }

  function setView(view) {
    if (view === "home") renderHome();
    else if (view === "games") renderGames();
    else if (view === "favorites") renderFavorites();
    else if (view === "admin") {
      if (requireAdmin()) renderAdminPanel();
    }
  }

  function initNav() {
    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-view");
        setView(view);
      });
    });
  }

  async function loadGames() {
    try {
      const res = await fetch("games.json");
      games = await res.json();
    } catch {
      games = [];
    }
  }

  async function init() {
    await loadGames();
    initNav();
    renderHome();
  }

  return { init };
})();

// ===== INIT =====
Lockdown.initFromURL();
App.init();
