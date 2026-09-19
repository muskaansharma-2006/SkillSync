const AUTH_API = "http://127.0.0.1:3000/api/auth";

const loginPanel = document.getElementById("loginPanel");
const signupPanel = document.getElementById("signupPanel");
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const feedback = document.getElementById("authFeedback");

function showPanel(panel) {
  const signup = panel === "signup";
  loginPanel.hidden = signup;
  signupPanel.hidden = !signup;
  loginTab.classList.toggle("active", !signup);
  signupTab.classList.toggle("active", signup);
  feedback.hidden = true;
}

function showFeedback(message, type = "error") {
  feedback.textContent = message;
  feedback.className = `auth-feedback ${type}`;
  feedback.hidden = false;
}

function clearErrors(form) {
  form.querySelectorAll(".field-error").forEach(error => { error.textContent = ""; });
}

function setLoading(form, loading) {
  const submit = form.querySelector("button[type=submit]");
  if (!submit) return;
  submit.disabled = loading;
  submit.classList.toggle("is-loading", loading);
  submit.querySelector("span").textContent = loading ? "Please wait..." : (form.id === "loginForm" ? "Login" : "Create Account");
}

function saveSession(data) {
  window.SkillSyncAuth = data.user;
  const destination = data.user?.role === "recruiter" ? "recruiter.html" : "index.html";
  window.location.href = destination;
}

async function sendAuth(path, payload) {
  const response = await fetch(`${AUTH_API}/${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "We could not complete that request.");
  return data.data;
}

loginTab.addEventListener("click", () => showPanel("login"));
signupTab.addEventListener("click", () => showPanel("signup"));
document.getElementById("switchToSignup").addEventListener("click", () => showPanel("signup"));
document.getElementById("switchToLogin").addEventListener("click", () => showPanel("login"));
document.getElementById("forgotPassword").addEventListener("click", () => showFeedback("Password reset will be available once email delivery is connected.", "info"));
document.getElementById("googleLogin").addEventListener("click", () => showFeedback("Google sign-in is ready for OAuth configuration and is not required for the demo.", "info"));

document.querySelectorAll(".password-toggle").forEach(button => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.target);
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    button.setAttribute("aria-label", visible ? "Show password" : "Hide password");
    button.innerHTML = `<i class="fa-regular fa-eye${visible ? "" : "-slash"}"></i>`;
  });
});

document.getElementById("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  clearErrors(form);
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!email) document.getElementById("loginEmailError").textContent = "Enter your email.";
  if (!password) document.getElementById("loginPasswordError").textContent = "Enter your password.";
  if (!email || !password) return;
  setLoading(form, true);
  try { saveSession(await sendAuth("login", { email, password })); }
  catch (error) { showFeedback(error.message); setLoading(form, false); }
});

document.getElementById("signupForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  clearErrors(form);
  const full_name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirm = document.getElementById("signupConfirmPassword").value;
  const role = document.querySelector("input[name=signupRole]:checked").value;
  let valid = true;
  if (full_name.length < 2) { document.getElementById("signupNameError").textContent = "Enter your full name."; valid = false; }
  if (!email.includes("@")) { document.getElementById("signupEmailError").textContent = "Enter a valid email."; valid = false; }
  if (password.length < 8) { document.getElementById("signupPasswordError").textContent = "Use at least 8 characters."; valid = false; }
  if (password !== confirm) { document.getElementById("signupConfirmPasswordError").textContent = "Passwords do not match."; valid = false; }
  if (!valid) return;
  setLoading(form, true);
  try { saveSession(await sendAuth("signup", { name: full_name, full_name, email, password, role })); }
  catch (error) { showFeedback(error.message); setLoading(form, false); }
});
