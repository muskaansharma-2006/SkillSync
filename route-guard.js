(() => {
  fetch("http://127.0.0.1:3000/api/auth/me", { credentials: "include" })
    .then(async response => {
      if (!response.ok) throw new Error("Unauthenticated");
      const result = await response.json();
      window.SkillSyncAuth = result.data;
    })
    .catch(() => {
      window.location.replace("auth.html?returnTo=field-discovery.html");
    });
})();
