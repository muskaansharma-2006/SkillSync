const SETTINGS_API = `${typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.API_BASE_URL || 'http://127.0.0.1:3000')}/api`;

async function loadSettings() {
  const response = await fetch(`${SETTINGS_API}/auth/me`, { credentials: "include" });
  const result = await response.json();
  if (!response.ok || !result.data) {
    window.location.href = "auth.html?returnTo=settings.html";
    return null;
  }
  const user = result.data;
  const name = user.name || "SkillSync user";
  document.getElementById("settingsName").textContent = name;
  document.getElementById("settingsEmail").textContent = user.email;
  document.getElementById("settingsRole").textContent = user.role === "recruiter" ? "Recruiter account" : "Candidate account";
  document.getElementById("settingsAvatar").textContent = name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
  return user;
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await fetch(`${SETTINGS_API}/auth/logout`, { method: "POST", credentials: "include" });
  } finally {
    window.location.href = "home.html";
  }
});

loadSettings();

if (typeof window.BYOKManager !== 'undefined') {
  window.BYOKManager.init({ containerId: 'byokSettingsCard' });
}

