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

const adminBtn = document.getElementById("lockdown-admin-button");
const popup = document.getElementById("lockdown-admin-popup");
const passInput = document.getElementById("lockdown-admin-password");
const cancelBtn = document.getElementById("lockdown-admin-cancel");
const submitBtn = document.getElementById("lockdown-admin-submit");
const errorEl = document.getElementById("lockdown-admin-error");

let countdown = null;

// ===== LOCKDOWN CORE =====
function format(ms) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function showLockdown(message, end) {
  msgEl.textContent = message;
  overlay.classList.remove("lockdown-hidden");
  document.body.style.overflow = "hidden";

  if (countdown) clearInterval(countdown);

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
      timerEl.textContent = format(left);
    };
    tick();
    countdown = setInterval(tick, 1000);
  } else {
    timerEl.textContent = "--:--:--";
  }
}

function hideLockdown() {
  overlay.classList.add("lockdown-hidden");
  document.body.style.overflow = "";
  if (countdown) clearInterval(countdown);
}

// ===== ADMIN POPUP =====
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
    clearLockdownParams();
    hideLockdown();
    popup.classList.add("lockdown-popup-hidden");
  } else {
    errorEl.textContent = "Incorrect password.";
  }
});

passInput.addEventListener("keydown", e => {
  if (e.key === "Enter") submitBtn.click();
});

// ===== INIT =====
(function () {
  const p = getParams();
  if (p.lockdown === "1") {
    const msg = p.msg ? decodeURIComponent(p.msg) : "This site is locked.";
    const end = p.end ? parseInt(p.end, 10) : null;
    showLockdown(msg, end);
  } else {
    hideLockdown();
  }
})();
