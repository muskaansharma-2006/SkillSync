(() => {
  const baseUrl = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.API_BASE_URL || "http://127.0.0.1:3000")).replace(/\/$/, '');
  fetch(`${baseUrl}/api/auth/me`, { credentials: "include" })
    .then(async response => {
      if (!response.ok) throw new Error("Unauthenticated");
      const result = await response.json();
      window.SkillSyncAuth = result.data;
    })
    .catch(() => {
      window.location.replace("auth.html?returnTo=field-discovery.html");
    });
})();
