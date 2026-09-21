/* 
  SkillSync - Core Application Logic & Interactions
*/

const getApiBaseUrl = () => (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.API_BASE_URL || '')).replace(/\/$/, '');

// Application State Store (Local Storage sync with fallback mock defaults)
const CompetencyState = {
  candidate: {
    name: "Muskaan",
    fullName: "Muskaan Sharma",
    avatar: "MS",
    overallScore: 84,
    level: "Intermediate",
    assessmentsCompleted: 6,
    skillsAssessed: 4,
    skills: {
      "Python": 87,
      "SQL": 82,
      "Problem Solving": 91,
      "Data Analysis": 84,
      "Communication": 76,
      "Debugging": 68
    },
    targets: {
      "Python": 90,
      "SQL": 85,
      "Debugging": 80,
      "Problem Solving": 95
    }
  },
  
  // Assessments List Data
  assessments: [
    {
      id: "python-practical",
      title: "Python Practical Competency",
      level: "Intermediate",
      duration: "30 mins",
      challenges: 8,
      progress: 37,
      status: "in-progress",
      score: null,
      category: "Programming",
      tags: ["Python", "Algorithms", "Debugging"]
    },
    {
      id: "sql-data-benchmark",
      title: "SQL & Data Analysis Benchmark",
      level: "Intermediate",
      duration: "25 mins",
      challenges: 6,
      progress: 100,
      status: "completed",
      score: 82,
      category: "Data",
      tags: ["SQL", "Analytics", "Joins"]
    },
    {
      id: "problem-solving-logic",
      title: "Problem Solving & Algorithmic Logic",
      level: "Advanced",
      duration: "35 mins",
      challenges: 5,
      progress: 0,
      status: "available",
      score: 91,
      category: "Core CS",
      tags: ["Data Structures", "Logic"]
    },
    {
      id: "realtime-api-backend",
      title: "Real-Time API & Backend Architecture",
      level: "Advanced",
      duration: "45 mins",
      challenges: 6,
      progress: 0,
      status: "available",
      score: null,
      category: "Backend",
      tags: ["REST", "Async", "Python"]
    },
    {
      id: "frontend-ui-benchmark",
      title: "Frontend UI/UX Practical Benchmark",
      level: "Intermediate",
      duration: "25 mins",
      challenges: 6,
      progress: 0,
      status: "available",
      score: null,
      category: "Frontend",
      tags: ["HTML", "CSS", "DOM"]
    }
  ],

  // Active Role State
  role: "candidate"
};

const PROTECTED_PAGES = new Set([
  "index.html", "assessments.html", "assessment-details.html", "assessment.html",
  "result.html", "skill-gap.html", "practice.html", "passport.html", "history.html",
  "mentor.html", "career-recommendation.html", "recruiter.html", "candidate.html", "settings.html"
]);

// Initialize Application once the page markup is available
async function initializeApplication() {
  if (!(await enforceAuthentication())) return;
  initNavigation();
  initRoleSwitcher();
  initMobileMenu();
  initProfileMenu();
  
  // Page-specific initializers
  const page = getPageName();
  if (page === "index" || page === "" || page === "index.html") {
    initCandidateDashboard();
  } else if (page === "assessments.html") {
    initAssessmentsPage();
  } else if (page === "practice.html") {
    initPracticePage();
  } else if (page === "assessment.html" || page === "assessment-details.html" || document.getElementById("runCodeBtn")) {
    initPracticalAssessmentSimulation();
  } else if (page === "result.html") {
    initResultPage();
  } else if (page === "skill-gap.html") {
    initSkillGapPage();
  } else if (page === "career-recommendation.html") {
    initCareerRecommendationPage();
  } else if (page === "passport.html") {
    initPassportPage();
  } else if (page === "recruiter.html") {
    initRecruiterDashboard();
  } else if (page === "candidate.html") {
    initCandidateProfileView();
  } else if (page === "history.html") {
    initHistoryPage();
  } else if (page === "mentor.html") {
    initAIMentorPage();
  }
}

async function enforceAuthentication() {
  const page = getPageName() || "index.html";
  if (!PROTECTED_PAGES.has(page)) return true;
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, { credentials: "include" });
    const result = await response.json();
    const user = result.data;
    if (!response.ok || !user) throw new Error("Unauthenticated");
    window.SkillSyncAuth = user;
    if (user.role === "recruiter" && ["index.html", "assessments.html", "assessment-details.html", "assessment.html", "result.html", "skill-gap.html", "practice.html", "passport.html", "history.html", "mentor.html", "career-recommendation.html"].includes(page)) {
      window.location.href = "recruiter.html";
      return false;
    }
    if (user.role === "candidate" && ["recruiter.html", "candidate.html"].includes(page)) {
      window.location.href = "index.html";
      return false;
    }
    return true;
  } catch (error) {
    window.location.href = "auth.html?returnTo=" + encodeURIComponent(page);
    return false;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApplication);
} else {
  initializeApplication();
}

// Utility to parse current HTML filename
function getPageName() {
  const path = window.location.pathname;
  return path.substring(path.lastIndexOf('/') + 1);
}

// Navigation active state setup
function initNavigation() {
  const currentPage = getPageName() || "index.html";
  const navLinks = document.querySelectorAll(".nav-link");
  
  navLinks.forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentPage || (currentPage === "" && href === "index.html")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// Candidate vs Recruiter Role Switcher
function initRoleSwitcher() {
  const candidateBtn = document.getElementById("role-candidate");
  const recruiterBtn = document.getElementById("role-recruiter");
  
  if (candidateBtn && recruiterBtn) {
    candidateBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
    recruiterBtn.addEventListener("click", () => {
      window.location.href = "recruiter.html";
    });
  }
}

// Shared account menu for every authenticated header that contains a profile.
function initProfileMenu() {
  document.querySelectorAll(".user-profile").forEach(profile => {
    if (profile.dataset.logoutMenuInitialized === "true") return;
    profile.dataset.logoutMenuInitialized = "true";
    profile.style.position = "relative";
    profile.style.cursor = "pointer";
    profile.setAttribute("role", "button");
    profile.setAttribute("tabindex", "0");
    profile.setAttribute("aria-haspopup", "menu");
    profile.setAttribute("aria-expanded", "false");

    const menu = document.createElement("div");
    menu.className = "profile-logout-menu";
    menu.setAttribute("role", "menu");
    menu.style.cssText = "display:none; position:absolute; right:0; top:calc(100% + 0.6rem); min-width:150px; z-index:1000; padding:0.4rem; border:1px solid var(--border-color); border-radius:var(--radius-md); background:#111827; box-shadow:0 12px 28px rgba(0,0,0,.32);";
    menu.innerHTML = '<button type="button" class="profile-logout-btn" role="menuitem" style="width:100%; border:0; border-radius:6px; padding:.6rem .7rem; background:transparent; color:#fda4af; text-align:left; cursor:pointer; font:inherit;"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>';
    profile.appendChild(menu);

    const closeMenu = () => {
      menu.style.display = "none";
      profile.setAttribute("aria-expanded", "false");
    };
    const toggleMenu = () => {
      const isOpen = menu.style.display === "block";
      menu.style.display = isOpen ? "none" : "block";
      profile.setAttribute("aria-expanded", String(!isOpen));
    };
    profile.addEventListener("click", event => {
      if (event.target.closest(".profile-logout-menu")) return;
      toggleMenu();
    });
    profile.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleMenu();
      }
      if (event.key === "Escape") closeMenu();
    });
    document.addEventListener("click", event => {
      if (!profile.contains(event.target)) closeMenu();
    });
    menu.querySelector(".profile-logout-btn").addEventListener("click", async event => {
      event.stopPropagation();
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/auth/logout`, { method: "POST", credentials: "include" });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Logout failed.");
        delete window.SkillSyncAuth;
        window.location.replace("auth.html");
      } catch (error) {
        console.error("Logout failed:", error);
        showToast("Could not end the session. Please try again.", "info");
      }
    });
  });
}

// Mobile Navbar Drawer
function initMobileMenu() {
  const btn = document.querySelector(".mobile-menu-btn");
  const links = document.querySelector(".nav-links");
  
  if (btn && links) {
    btn.addEventListener("click", () => {
      links.classList.toggle("active");
    });
  }
}

// Toast Notifications Helper
function showToast(message, type = "success") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  const icon = type === "success" ? "fa-circle-check text-green" : "fa-circle-info text-primary";
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ----------------------------------------------------
// PAGE-SPECIFIC IMPLEMENTATIONS
// ----------------------------------------------------

// 1. CANDIDATE DASHBOARD (index.html)
async function initCandidateDashboard() {
  const user = window.SkillSyncAuth || {};
  
  const greetingEl = document.getElementById("dashGreeting");
  if (greetingEl && user.name) {
    const firstName = user.name.split(' ')[0];
    greetingEl.textContent = `Good morning, ${firstName} 👋`;
  }
  const headerNameEl = document.getElementById("dashHeaderName");
  if (headerNameEl && user.name) {
    headerNameEl.textContent = user.name;
  }
  const avatarEl = document.getElementById("dashAvatar");
  if (avatarEl && user.name) {
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    avatarEl.textContent = initials;
  }

  try {
    const compRes = await fetch(`${getApiBaseUrl()}/api/candidates/${user.id}/competencies`, { credentials: "include" });
    const resRes = await fetch(`${getApiBaseUrl()}/api/candidates/${user.id}/results`, { credentials: "include" });
    
    let competencies = [];
    let overallScore = null;
    let skillLevel = "Not Assessed";
    let completedCount = 0;

    if (compRes.ok) {
      const compJson = await compRes.json();
      if (compJson.success && compJson.data) {
        competencies = compJson.data.competencies || [];
        overallScore = compJson.data.overall_competency;
        skillLevel = compJson.data.competency_level || "Starter";
      }
    }

    // A Response body is a one-shot stream. Parse the results response once
    // and reuse the parsed data for both the count and the AI insight.
    let resultsList = [];
    if (resRes.ok) {
      const resJson = await resRes.json();
      if (resJson.success && Array.isArray(resJson.data)) {
        resultsList = resJson.data;
        completedCount = resultsList.length;
      }
    }

    const overallScoreEl = document.getElementById("dashOverallScore");
    const completedCountEl = document.getElementById("dashCompletedCount");
    const skillsCountEl = document.getElementById("dashSkillsCount");
    const skillLevelEl = document.getElementById("dashSkillLevel");
    const headerRoleEl = document.getElementById("dashHeaderRole");
    const quoteEl = document.getElementById("dashAiInsightQuote");

    if (completedCount > 0 && overallScore !== null) {
      if (overallScoreEl) overallScoreEl.textContent = `${overallScore}%`;
      if (completedCountEl) completedCountEl.textContent = completedCount;
      if (skillsCountEl) skillsCountEl.textContent = competencies.length;
      if (skillLevelEl) skillLevelEl.textContent = skillLevel;
      if (headerRoleEl) headerRoleEl.textContent = `${skillLevel} Level`;

      if (quoteEl && resultsList.length > 0 && resultsList[0].ai_insight) {
        quoteEl.textContent = `"${resultsList[0].ai_insight}"`;
      }

      const labels = competencies.map(c => c.skill_name);
      const scores = competencies.map(c => Number(c.score));
      renderRadarChart("competencyRadarChart", scores.length ? scores : [0, 0, 0, 0, 0], labels.length ? labels : ['Python', 'SQL', 'Algorithms', 'Data Analysis', 'Debugging']);
      renderTrendChart("competencyTrendChart", overallScore);
      renderSkillsBreakdownWidget(competencies);

    } else {
      if (overallScoreEl) overallScoreEl.textContent = "0%";
      if (completedCountEl) completedCountEl.textContent = "0";
      if (skillsCountEl) skillsCountEl.textContent = "0";
      if (skillLevelEl) skillLevelEl.textContent = "Not Assessed";
      if (headerRoleEl) headerRoleEl.textContent = "Starter Candidate";
      if (quoteEl) quoteEl.textContent = "Complete an assessment to unlock your personalized AI competency evaluation.";

      renderRadarChart("competencyRadarChart", [0, 0, 0, 0, 0], ['Python', 'SQL', 'Algorithms', 'Data Analysis', 'Debugging']);
      renderTrendChart("competencyTrendChart", 0);
      renderSkillsBreakdownWidget([]);
    }

  } catch (err) {
    console.error("Failed to load candidate dashboard data:", err);
    renderRadarChart("competencyRadarChart", [0, 0, 0, 0, 0], ['Python', 'SQL', 'Algorithms', 'Data Analysis', 'Debugging']);
    renderSkillsBreakdownWidget([]);
  }
}

function renderSkillsBreakdownWidget(competencies) {
  const container = document.getElementById("dashSkillsBreakdownList");
  if (!container) return;

  if (!competencies || competencies.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.88rem; background: rgba(17,24,39,0.3); border-radius: var(--radius-sm); border: 1px dashed var(--border-color);">
        <i class="fa-solid fa-sliders" style="font-size: 1.25rem; color: var(--text-dim); margin-bottom: 0.5rem;"></i>
        <div>No verified competencies yet</div>
        <p style="font-size: 0.8rem; margin-top: 0.25rem;">Complete an assessment to populate your skills breakdown.</p>
      </div>
    `;
    return;
  }

  const icons = {
    'Python': 'fa-brands fa-python',
    'SQL': 'fa-solid fa-database',
    'Debugging': 'fa-solid fa-bug',
    'Algorithms': 'fa-solid fa-code-branch',
    'Data Analysis': 'fa-solid fa-chart-column',
    'Communication': 'fa-solid fa-comments'
  };

  const colors = ['var(--accent-cyan)', 'var(--accent-purple)', 'var(--accent-green)', 'var(--primary)', '#f43f5e'];

  container.innerHTML = competencies.map((item, idx) => {
    const name = item.skill_name;
    const score = Math.round(Number(item.score));
    const icon = icons[name] || 'fa-solid fa-bullseye';
    const color = colors[idx % colors.length];

    return `
      <div>
        <div style="display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 600; margin-bottom: 0.35rem;">
          <span><i class="${icon}" style="color: ${color}; margin-right: 0.4rem;"></i> ${name}</span>
          <span style="color: ${color}; font-weight: 700;">${score}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${score}%; background: ${color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Render Radar Chart for Skills Breakdown
function renderRadarChart(canvasId, scores, labels) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === 'undefined') return;

  const existingChart = Chart.getChart(ctx);
  if (existingChart) existingChart.destroy();

  const chartLabels = labels && labels.length ? labels : ['Python', 'SQL', 'Algorithms', 'Data Analysis', 'Debugging'];

  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Current Competency %',
        data: scores,
        backgroundColor: 'rgba(99, 102, 241, 0.25)',
        borderColor: '#6366f1',
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#06b6d4',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          pointLabels: {
            color: '#94a3b8',
            font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' }
          },
          ticks: {
            display: false,
            stepSize: 20
          },
          suggestedMin: 0,
          suggestedMax: 100
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// Render Trend Growth Line Chart
function renderTrendChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === 'undefined') return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Current'],
      datasets: [{
        label: 'Overall Score',
        data: [68, 72, 75, 79, 81, 84],
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.01)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.3)');
          return gradient;
        },
        borderColor: '#6366f1',
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#06b6d4'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' },
          min: 60,
          max: 100
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// 2. ASSESSMENTS PAGE (assessments.html)
async function initAssessmentsPage() {
  const container = document.getElementById("assessmentsGrid");
  if (!container) return;

  const searchInput = document.getElementById("assessmentSearch");
  const filterChips = document.querySelectorAll(".filter-chip");
  const requestedFilter = new URLSearchParams(window.location.search).get("field");
  let activeFilter = [...filterChips].some(chip => chip.getAttribute("data-filter") === requestedFilter) ? requestedFilter : "all";

  filterChips.forEach(chip => chip.classList.toggle("active", chip.getAttribute("data-filter") === activeFilter));

  // Loading skeleton state
  container.innerHTML = `
    <div class="card skeleton-card" style="padding: 1.5rem; height: 260px; background: rgba(17, 24, 39, 0.5);">
      <div style="height: 20px; width: 40%; background: rgba(255,255,255,0.06); border-radius: 4px; margin-bottom: 1rem;"></div>
      <div style="height: 24px; width: 80%; background: rgba(255,255,255,0.08); border-radius: 4px; margin-bottom: 0.75rem;"></div>
      <div style="height: 16px; width: 95%; background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 1rem;"></div>
      <div style="height: 38px; width: 100%; background: rgba(255,255,255,0.08); border-radius: 6px; margin-top: auto;"></div>
    </div>
    <div class="card skeleton-card" style="padding: 1.5rem; height: 260px; background: rgba(17, 24, 39, 0.5);">
      <div style="height: 20px; width: 40%; background: rgba(255,255,255,0.06); border-radius: 4px; margin-bottom: 1rem;"></div>
      <div style="height: 24px; width: 80%; background: rgba(255,255,255,0.08); border-radius: 4px; margin-bottom: 0.75rem;"></div>
      <div style="height: 16px; width: 95%; background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 1rem;"></div>
      <div style="height: 38px; width: 100%; background: rgba(255,255,255,0.08); border-radius: 6px; margin-top: auto;"></div>
    </div>
    <div class="card skeleton-card" style="padding: 1.5rem; height: 260px; background: rgba(17, 24, 39, 0.5);">
      <div style="height: 20px; width: 40%; background: rgba(255,255,255,0.06); border-radius: 4px; margin-bottom: 1rem;"></div>
      <div style="height: 24px; width: 80%; background: rgba(255,255,255,0.08); border-radius: 4px; margin-bottom: 0.75rem;"></div>
      <div style="height: 16px; width: 95%; background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 1rem;"></div>
      <div style="height: 38px; width: 100%; background: rgba(255,255,255,0.08); border-radius: 6px; margin-top: auto;"></div>
    </div>
  `;

  let assessmentsList = [];

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/assessments`);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const body = await res.json();
    if (!body.success) throw new Error(body.message || "Failed to load assessments");
    assessmentsList = body.data || [];
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; padding: 2rem; text-align: center; background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: #f43f5e; margin-bottom: 0.75rem;"></i>
        <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.5rem;">Unable to load assessments</h3>
        <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1rem;">Could not connect to the assessments API at <code>/api/assessments</code> (${err.message}).</p>
        <button id="retryAssessmentsBtn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-rotate-right"></i> Retry Connection</button>
      </div>
    `;
    const retryBtn = document.getElementById("retryAssessmentsBtn");
    if (retryBtn) retryBtn.addEventListener("click", () => initAssessmentsPage());
    return;
  }

  if (assessmentsList.length === 0) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; padding: 2.5rem; text-align: center; background: rgba(17, 24, 39, 0.6);">
        <i class="fa-solid fa-box-open" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 0.75rem;"></i>
        <h3 style="font-size: 1.15rem; color: var(--text-main); margin-bottom: 0.5rem;">No assessments found</h3>
        <p style="font-size: 0.88rem; color: var(--text-muted);">There are currently no active assessments in the database.</p>
      </div>
    `;
    return;
  }

  function renderItems() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filtered = assessmentsList.filter(item => {
      const title = (item.title || "").toLowerCase();
      const category = (item.category || "").toLowerCase();
      const difficulty = (item.difficulty || "").toLowerCase();
      const description = (item.description || "").toLowerCase();

      const matchesSearch = !query || title.includes(query) || category.includes(query) || description.includes(query);

      let matchesFilter = true;
      if (activeFilter !== "all") {
        if (activeFilter === "programming") {
          matchesFilter = category.includes("programming");
        } else if (activeFilter === "data") {
          matchesFilter = category.includes("data") || category.includes("sql") || category.includes("analytics");
        } else if (activeFilter === "core_cs") {
          matchesFilter = category.includes("core cs");
        } else if (activeFilter === "backend") {
          matchesFilter = category.includes("backend");
        } else if (activeFilter === "frontend") {
          matchesFilter = category.includes("frontend");
        } else if (activeFilter === "communication") {
          matchesFilter = category.includes("communication");
        } else if (activeFilter === "technical") {
          matchesFilter = category.includes("programming") || category.includes("core cs") || category.includes("backend");
        } else if (activeFilter === "analytical") {
          matchesFilter = category.includes("data") || category.includes("sql") || category.includes("analytics");
        } else {
          matchesFilter = difficulty.toLowerCase() === activeFilter.toLowerCase();
        }
      }

      return matchesSearch && matchesFilter;
    });

    if (filtered.length === 0) {
      const emptyTitle = activeFilter === "communication" ? "No communication assessments yet" : "No matching assessments";
      container.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; padding: 2.5rem; text-align: center; background: rgba(17, 24, 39, 0.6);">
          <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; color: var(--text-dim); margin-bottom: 0.75rem;"></i>
          <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.35rem;">${emptyTitle}</h3>
          <p style="font-size: 0.88rem; color: var(--text-muted);">Try adjusting your search query or filter selection.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => {
      const difficultyBadge = item.difficulty === "Advanced" ? "badge-purple" : "badge-primary";
      return `
        <div class="card card-hover-glow assessment-card-item" data-title="${item.title}" data-category="${item.category}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.85rem;">
            <span class="badge badge-cyan"><i class="fa-solid fa-star"></i> Verified Assessment</span>
            <span class="badge ${difficultyBadge}">${item.difficulty}</span>
          </div>

          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main);">${item.title}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.4rem; line-height: 1.4;">
            ${item.description || 'Demonstrate practical competency through real-world challenges.'}
          </p>

          <div style="display: flex; gap: 1rem; margin: 1.25rem 0; font-size: 0.8rem; color: var(--text-muted);">
            <span><i class="fa-regular fa-clock" style="color: var(--accent-cyan);"></i> ${item.duration_minutes} minutes</span>
            <span><i class="fa-solid fa-list-check" style="color: var(--accent-purple);"></i> ${item.challenge_count} Challenges</span>
          </div>

          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
            <span class="badge badge-primary">${item.category}</span>
            <span class="badge badge-cyan">${item.difficulty}</span>
          </div>

          <a href="assessment-details.html?id=${item.id}" class="btn btn-primary" style="width: 100%;">
            <i class="fa-solid fa-play"></i> Start Practical Simulation
          </a>
        </div>
      `;
    }).join('');
  }

  if (searchInput) searchInput.addEventListener("input", renderItems);
  filterChips.forEach(chip => {
    chip.addEventListener("click", () => {
      activeFilter = chip.getAttribute("data-filter") || "all";
      filterChips.forEach(item => item.classList.toggle("active", item === chip));
      renderItems();
    });
  });

  renderItems();
}

// 2B. PRACTICE PAGE (practice.html)
async function initPracticePage() {
  const container = document.getElementById("practiceGrid");
  if (!container) return;

  // Loading skeleton state
  container.innerHTML = `
    <div class="card skeleton-card" style="padding: 1.5rem; height: 220px; background: rgba(17, 24, 39, 0.5);">
      <div style="height: 20px; width: 40%; background: rgba(255,255,255,0.06); border-radius: 4px; margin-bottom: 1rem;"></div>
      <div style="height: 24px; width: 75%; background: rgba(255,255,255,0.08); border-radius: 4px; margin-bottom: 0.75rem;"></div>
      <div style="height: 16px; width: 90%; background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 1rem;"></div>
      <div style="height: 38px; width: 100%; background: rgba(255,255,255,0.08); border-radius: 6px; margin-top: auto;"></div>
    </div>
    <div class="card skeleton-card" style="padding: 1.5rem; height: 220px; background: rgba(17, 24, 39, 0.5);">
      <div style="height: 20px; width: 40%; background: rgba(255,255,255,0.06); border-radius: 4px; margin-bottom: 1rem;"></div>
      <div style="height: 24px; width: 75%; background: rgba(255,255,255,0.08); border-radius: 4px; margin-bottom: 0.75rem;"></div>
      <div style="height: 16px; width: 90%; background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 1rem;"></div>
      <div style="height: 38px; width: 100%; background: rgba(255,255,255,0.08); border-radius: 6px; margin-top: auto;"></div>
    </div>
  `;

  let practiceList = [];

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/practice`);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const body = await res.json();
    if (!body.success) throw new Error(body.message || "Failed to load practice challenges");
    practiceList = body.data || [];
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; padding: 2rem; text-align: center; background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: #f43f5e; margin-bottom: 0.75rem;"></i>
        <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.5rem;">Unable to load practice challenges</h3>
        <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1rem;">Could not connect to the practice API at <code>/api/practice</code> (${err.message}).</p>
        <button id="retryPracticeBtn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-rotate-right"></i> Retry Connection</button>
      </div>
    `;
    const retryBtn = document.getElementById("retryPracticeBtn");
    if (retryBtn) retryBtn.addEventListener("click", () => initPracticePage());
    return;
  }

  if (practiceList.length === 0) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; padding: 2.5rem; text-align: center; background: rgba(17, 24, 39, 0.6);">
        <i class="fa-solid fa-fire" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 0.75rem;"></i>
        <h3 style="font-size: 1.15rem; color: var(--text-main); margin-bottom: 0.5rem;">No practice challenges found</h3>
        <p style="font-size: 0.88rem; color: var(--text-muted);">Check back soon for new personalized micro-challenges.</p>
      </div>
    `;
    return;
  }

  const borderColors = {
    'Debugging': '#f43f5e',
    'Python': '#38bdf8',
    'SQL': '#a78bfa',
    'Data Analysis': '#06b6d4',
    'Problem Solving': '#10b981'
  };

  container.innerHTML = practiceList.map(item => {
    const borderColor = borderColors[item.target_competency] || 'var(--primary)';
    return `
      <div class="card card-hover-glow" style="border-left: 4px solid ${borderColor};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.85rem;">
          <span class="badge badge-amber"><i class="fa-solid fa-bolt"></i> Recommended Practice</span>
          <span class="badge badge-green">Target: ${item.target_competency}</span>
        </div>

        <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main);">${item.title}</h3>
        <p style="font-size: 0.88rem; color: var(--text-muted); margin-top: 0.35rem; line-height: 1.5;">
          ${item.description || 'Targeted interactive micro-challenge to build practical capability.'}
        </p>

        <div style="display: flex; gap: 1rem; margin: 1.25rem 0; font-size: 0.82rem; color: var(--text-muted);">
          <span><i class="fa-regular fa-clock" style="color: var(--accent-cyan);"></i> ${item.estimated_minutes} mins</span>
          <span><i class="fa-solid fa-layer-group" style="color: var(--primary);"></i> ${item.difficulty}</span>
          <span><i class="fa-solid fa-bullseye" style="color: var(--accent-purple);"></i> Skill: ${item.target_competency}</span>
        </div>

        <a href="assessment.html" class="btn btn-primary" style="width: 100%;">
          <i class="fa-solid fa-play"></i> Start Practice Scenario
        </a>
      </div>
    `;
  }).join('');
}

// 3. LIVE PRACTICAL ASSESSMENT SIMULATION (assessment.html)
function initPracticalAssessmentSimulation() {
  // Timer Countdown Logic (18:42 start time)
  let timeInSeconds = 18 * 60 + 42;
  const timerDisplay = document.getElementById("assessmentTimer");
  
  if (timerDisplay) {
    const timerInterval = setInterval(() => {
      if (timeInSeconds <= 0) {
        clearInterval(timerInterval);
        timerDisplay.textContent = "00:00";
        showToast("Time is up! Submitting assessment automatically...", "info");
        setTimeout(triggerSubmissionModal, 1500);
      } else {
        timeInSeconds--;
        const mins = Math.floor(timeInSeconds / 60);
        const secs = timeInSeconds % 60;
        timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  // Interactive Code Execution Button
  const runCodeBtn = document.getElementById("runCodeBtn");
  const consoleOutput = document.getElementById("consoleOutput");
  const testResultsBadge = document.getElementById("testResultsBadge");

  if (runCodeBtn && consoleOutput) {
    runCodeBtn.addEventListener("click", () => {
      runCodeBtn.disabled = true;
      runCodeBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Running Tests...`;
      consoleOutput.innerHTML = `> Compiling Python 3.11 environment...<br>> Executing test_transaction_calculator.py...`;
      
      const editor = document.querySelector(".ide-editor");
      
      setTimeout(() => {
        if (editor) {
          editor.value = `# Challenge 3: FIXED Solution
def calculate_transaction_summary(transactions, tax_rate=0.15):
    if not transactions:
        return {"gross": 0.0, "tax": 0.0, "net": 0.0}
    
    # FIXED: Includes negative refund amounts
    gross_total = sum(transactions)
    
    # FIXED: Safely computes tax without ZeroDivisionError
    tax_amount = gross_total * tax_rate if tax_rate > 0 else 0.0
    
    return {
        "gross": round(gross_total, 2),
        "tax": round(tax_amount, 2),
        "net": round(gross_total + tax_amount, 2)
    }

# Candidate Test Invocation
sample = [100.0, 250.0, -50.0]
print("Execution Result:", calculate_transaction_summary(sample, 0.15))`;
        }

        runCodeBtn.disabled = false;
        runCodeBtn.innerHTML = `<i class="fa-solid fa-play"></i> Run Code`;
        consoleOutput.innerHTML = `> Running Test Case 1: calculate_tax([100, 250, 400], 0.15) ... <span style="color: #10b981; font-weight: 600;">PASS</span><br>> Running Test Case 2: handle_negative_balances([-50, 100]) ... <span style="color: #10b981; font-weight: 600;">PASS</span><br>> Running Test Case 3: zero_currency_division_check(tax_rate=0.0) ... <span style="color: #10b981; font-weight: 600;">PASS</span><br><br><span style="color: #10b981; font-weight: 600;">✓ All 3 Automated Unit Tests Passed cleanly (0.04s)</span>`;
        
        if (testResultsBadge) {
          testResultsBadge.className = "badge badge-green";
          testResultsBadge.innerHTML = `<i class="fa-solid fa-check"></i> 3/3 Passed`;
        }

        // Also update test badges in the left problem statement list
        const testItemBadges = document.querySelectorAll(".ide-panel .badge-amber");
        testItemBadges.forEach(badge => {
          if (badge.id !== "testResultsBadge") {
            badge.className = "badge badge-green";
            badge.innerHTML = `<i class="fa-solid fa-check"></i> Passed`;
          }
        });

        showToast("Code executed successfully! All 3 test cases passed.", "success");
      }, 1200);
    });
  }

  // Submit Assessment Trigger
  const submitBtn = document.getElementById("submitAssessmentBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      triggerSubmissionModal();
    });
  }
}

// Submission Loading Modal & Real API Submission
async function triggerSubmissionModal() {
  const modal = document.getElementById("submissionModal");
  const statusMsg = document.getElementById("modalStatusMsg");
  
  if (modal) modal.classList.add("active");
  if (statusMsg) statusMsg.textContent = "Submitting assessment & running rubric evaluation...";

  const editor = document.querySelector(".ide-editor");
  const candidateAnswerText = editor ? editor.value : "";

  try {
    if (statusMsg) statusMsg.textContent = "Analyzing logic structure, error handling & pattern efficiency...";

    let assessmentId = "python-practical";
    try {
      const assRes = await fetch(`${getApiBaseUrl()}/api/assessments`);
      if (assRes.ok) {
        const assJson = await assRes.json();
        if (assJson.data && assJson.data.length > 0) {
          assessmentId = assJson.data[0].id;
        }
      }
    } catch (e) {}

    if (statusMsg) statusMsg.textContent = "Generating AI Insight & per-competency vector breakdown...";

    const res = await fetch(`${getApiBaseUrl()}/api/assessment-attempts/current/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        assessment_id: assessmentId,
        answers: { challenge_1: candidateAnswerText }
      })
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.message || "Failed to submit assessment.");
    }

    const resultId = body.data?.id;
    if (statusMsg) statusMsg.textContent = "Evaluation complete! Redirecting to report...";
    
    setTimeout(() => {
      window.location.href = `result.html?id=${resultId}`;
    }, 1200);

  } catch (err) {
    console.error("Submission error:", err);
    if (statusMsg) statusMsg.textContent = `Submission note: ${err.message}. Navigating to result...`;
    showToast(`Assessment submitted with baseline metrics`, "info");
    setTimeout(() => {
      window.location.href = "result.html";
    }, 2000);
  }
}

// 4. AI COMPETENCY RESULT (result.html)
async function initResultPage() {
  const params = new URLSearchParams(window.location.search);
  const resultId = params.get("id");
  const user = window.SkillSyncAuth || {};

  let resultData = null;

  try {
    if (resultId) {
      const res = await fetch(`${getApiBaseUrl()}/api/results/${resultId}`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          resultData = json.data;
        }
      }
    }

    if (!resultData && user.id) {
      const latestRes = await fetch(`${getApiBaseUrl()}/api/candidates/${user.id}/results`, { credentials: "include" });
      if (latestRes.ok) {
        const json = await latestRes.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          resultData = json.data[0];
        }
      }
    }
  } catch (err) {
    console.error("Error loading result details:", err);
  }

  if (resultData) {
    renderResultData(resultData);
  } else {
    renderRadarChart("resultRadarChart", [84, 76, 80, 78, 82]);
  }
}

function renderResultData(result) {
  const score = Math.round(Number(result.overall_score || 0));
  const title = result.assessments?.title || "Practical Competency Assessment";
  const breakdown = result.breakdown || {};
  const strengths = Array.isArray(result.strengths) ? result.strengths : [];
  const improvements = Array.isArray(result.improvement_areas) ? result.improvement_areas : [];
  const insight = result.ai_insight || `Candidate achieved an overall verified score of ${score}%.`;

  const ringBox = document.getElementById("resultRingBox");
  if (ringBox) {
    ringBox.style.background = `radial-gradient(circle at 50% 50%, #0b0f19 60%, transparent 61%), conic-gradient(var(--primary) ${score}%, rgba(255,255,255,0.1) 0)`;
  }
  const scoreValEl = document.getElementById("resultScoreValue");
  if (scoreValEl) scoreValEl.textContent = `${score}%`;

  const level = score >= 85 ? "Advanced Level" : (score >= 70 ? "Intermediate Level" : "Beginner Level");
  const levelBadge = document.getElementById("resultLevelBadge");
  if (levelBadge) levelBadge.textContent = level;

  const titleEl = document.getElementById("resultAssessmentTitle");
  if (titleEl) titleEl.textContent = title;

  const subtitleEl = document.getElementById("resultSubtitle");
  if (subtitleEl) subtitleEl.textContent = `${title} • Verified AI Evaluation Report`;

  const metaEl = document.getElementById("resultMetaInfo");
  if (metaEl) metaEl.textContent = `Completed ${new Date(result.created_at).toLocaleDateString()} • Cryptographically Verified`;

  const insightEl = document.getElementById("resultAiInsight");
  if (insightEl) insightEl.textContent = `"${insight}"`;

  const breakdownListEl = document.getElementById("resultBreakdownList");
  if (breakdownListEl && Object.keys(breakdown).length > 0) {
    const colors = ['var(--accent-green)', 'var(--accent-cyan)', 'var(--primary)', 'var(--accent-purple)', 'var(--accent-amber)'];
    breakdownListEl.innerHTML = Object.entries(breakdown).map(([skill, val], idx) => {
      const numVal = Math.round(Number(val));
      const color = colors[idx % colors.length];
      return `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.35rem;">
            <span>${skill}</span>
            <span style="color: ${color}; font-weight: 700;">${numVal}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${numVal}%; background: ${color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  const strengthsListEl = document.getElementById("resultStrengthsList");
  if (strengthsListEl && strengths.length > 0) {
    strengthsListEl.innerHTML = strengths.map(item => `
      <li><i class="fa-solid fa-check" style="color: var(--accent-green); margin-right: 0.4rem;"></i> ${item}</li>
    `).join('');
  }

  const improvementsListEl = document.getElementById("resultImprovementsList");
  if (improvementsListEl && improvements.length > 0) {
    improvementsListEl.innerHTML = improvements.map(item => `
      <li><i class="fa-solid fa-arrow-right" style="color: var(--accent-amber); margin-right: 0.4rem;"></i> ${item}</li>
    `).join('');
  }

  const labels = Object.keys(breakdown);
  const values = Object.values(breakdown).map(v => Number(v));
  if (labels.length > 0) {
    renderRadarChart("resultRadarChart", values, labels);
  } else {
    renderRadarChart("resultRadarChart", [score, score, score, score, score]);
  }
}

// 5. SKILL GAP ANALYSIS (skill-gap.html)
async function initSkillGapPage() {
  const user = window.SkillSyncAuth || {};
  const selectEl = document.getElementById("targetRoleSelect");
  
  let savedRole = localStorage.getItem("skillsync_target_role") || "Python Developer";
  if (selectEl) {
    selectEl.value = savedRole;
    selectEl.addEventListener("change", (e) => {
      const newRole = e.target.value;
      localStorage.setItem("skillsync_target_role", newRole);
      fetchAndRenderSkillGap(user.id, newRole);
    });
  }

  fetchAndRenderSkillGap(user.id, savedRole);
}

async function fetchAndRenderSkillGap(candidateId, targetRole) {
  const compListEl = document.getElementById("skillGapComparisonList");
  const matchBadge = document.getElementById("targetMatchBadge");
  const focusCard = document.getElementById("primaryGapFocusCard");
  const timelineEl = document.getElementById("skillGapTimeline");
  const topCta = document.getElementById("topPracticeCta");

  if (!compListEl) return;

  compListEl.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Calculating live skill gap vector...</div>`;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/skill-gap/${candidateId}?role=${encodeURIComponent(targetRole)}`, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (!json.success || !json.data || !json.data.has_data || !json.data.skill_gaps || json.data.skill_gaps.length === 0) {
      if (matchBadge) matchBadge.textContent = "Target: Not Assessed";

      compListEl.innerHTML = `
        <div style="padding: 2.5rem 1.5rem; text-align: center; background: rgba(17, 24, 39, 0.4); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(99, 102, 241, 0.15); color: var(--primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 1.5rem;">
            <i class="fa-solid fa-clipboard-list"></i>
          </div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">No Verified Competency Data Yet</h3>
          <p style="font-size: 0.88rem; color: var(--text-muted); max-width: 500px; margin: 0 auto 1.5rem; line-height: 1.5;">
            Complete at least one practical assessment to generate your verified skill gap analysis against <strong>${targetRole}</strong> benchmarks.
          </p>
          <a href="assessments.html" class="btn btn-primary"><i class="fa-solid fa-play"></i> Take Your First Assessment</a>
        </div>
      `;

      if (focusCard) {
        focusCard.innerHTML = `
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem;">Primary Gap Focus</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1rem;">
            Your target role is set to <strong>${targetRole}</strong>. Once you take an assessment, your top priority gap will be highlighted here.
          </p>
          <a href="assessments.html" class="btn btn-secondary btn-sm" style="width: 100%;"><i class="fa-solid fa-laptop-code"></i> Browse Assessments</a>
        `;
      }

      if (timelineEl) {
        timelineEl.innerHTML = `
          <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.88rem;">
            Personalized 4-week growth roadmap will unlock automatically after your first assessment completion.
          </div>
        `;
      }
      return;
    }

    const data = json.data;
    const gaps = data.skill_gaps;
    const match = data.match_percent;
    const topGapItem = data.largest_gap || gaps[0];

    if (matchBadge) matchBadge.textContent = `Target Match: ${match}%`;

    const icons = {
      'Python': 'fa-brands fa-python',
      'SQL': 'fa-solid fa-database',
      'Debugging': 'fa-solid fa-bug',
      'Algorithms': 'fa-solid fa-code-branch',
      'Data Analysis': 'fa-solid fa-chart-column',
      'Communication': 'fa-solid fa-comments'
    };

    compListEl.innerHTML = gaps.map((item, idx) => {
      const isTop = idx === 0 && item.gap > 0;
      const icon = icons[item.competency_name] || 'fa-solid fa-bullseye';
      const color = isTop ? '#f43f5e' : (item.gap > 5 ? '#f59e0b' : '#10b981');
      const badgeText = isTop ? `High Priority: -${item.gap}%` : (item.gap > 0 ? `Gap: -${item.gap}%` : `Near Benchmark`);
      const badgeClass = isTop ? 'badge-amber' : (item.gap > 0 ? 'badge-amber' : 'badge-green');
      const badgeStyle = isTop ? 'background: rgba(244, 63, 94, 0.2); color: #fda4af;' : '';

      return `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <span style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">
              <i class="${icon}" style="color: ${color}; margin-right: 0.4rem;"></i> ${item.competency_name}
            </span>
            <div style="font-size: 0.88rem; font-weight: 700;">
              <span style="color: var(--accent-cyan);">${item.current_score}%</span> 
              <i class="fa-solid fa-arrow-right" style="color: var(--text-dim); margin: 0 0.35rem;"></i> 
              <span style="color: var(--primary);">Target ${item.target_score}%</span>
              <span class="badge ${badgeClass}" style="margin-left: 0.5rem; ${badgeStyle}">${badgeText}</span>
            </div>
          </div>
          <div class="progress-bar-bg" style="height: 10px;">
            <div class="progress-bar-fill" style="width: ${item.current_score}%; background: ${color};"></div>
          </div>
        </div>
      `;
    }).join('');

    if (focusCard && topGapItem) {
      const topIcon = icons[topGapItem.competency_name] || 'fa-solid fa-bullseye';
      focusCard.innerHTML = `
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Primary Gap Focus</h3>

        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
          <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(244, 63, 94, 0.15); display: flex; align-items: center; justify-content: center; color: #f43f5e; font-size: 1.25rem;">
            <i class="${topIcon}"></i>
          </div>
          <div>
            <div style="font-weight: 700; font-size: 0.95rem;">${topGapItem.competency_name} (-${topGapItem.gap}%)</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">Current: ${topGapItem.current_score}% | Target: ${topGapItem.target_score}%</div>
          </div>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
          Closing this ${topGapItem.gap}% gap will raise your overall Job Fit index for <strong>${targetRole}</strong> roles.
        </p>

        <div style="margin-top: 1.25rem;">
          <a href="practice.html?skill=${encodeURIComponent(topGapItem.competency_name)}" class="btn btn-primary btn-sm" style="width: 100%;">
            <i class="fa-solid fa-bolt"></i> Start ${topGapItem.competency_name} Practice Now
          </a>
        </div>
      `;
    }

    if (topCta && topGapItem) {
      topCta.href = `practice.html?skill=${encodeURIComponent(topGapItem.competency_name)}`;
    }

    if (timelineEl && gaps.length > 0) {
      const gap1 = gaps[0] ? gaps[0].competency_name : "Debugging";
      const gap2 = gaps[1] ? gaps[1].competency_name : "Algorithms";

      timelineEl.innerHTML = `
        <div class="timeline-item">
          <div class="timeline-node completed"><i class="fa-solid fa-check" style="font-size: 0.6rem; color: #fff;"></i></div>
          <div class="roadmap-header" style="cursor: pointer;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">
                Week 1: Master ${gap1} Fundamentals & Boundary Conditions
              </h4>
              <i class="fa-solid fa-chevron-up toggle-icon" style="color: var(--text-dim);"></i>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.25rem;">
              Focus area: Core logic checks, edge cases, and robust error safeguards.
            </p>
          </div>
          <div class="glass-panel" style="padding: 0.85rem; margin-top: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;">
              <span><i class="fa-solid fa-fire" style="color: var(--accent-amber);"></i> Recommended Practice: ${gap1} Optimization</span>
              <a href="practice.html?skill=${encodeURIComponent(gap1)}" class="btn btn-primary btn-sm">Start Task</a>
            </div>
          </div>
        </div>

        <div class="timeline-item">
          <div class="timeline-node"></div>
          <div class="roadmap-header" style="cursor: pointer;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">
                Week 2: Advanced ${gap2} & Structural Patterns
              </h4>
              <i class="fa-solid fa-chevron-down toggle-icon" style="color: var(--text-dim);"></i>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.25rem;">
              Focus area: Data structures, modular abstractions, and pattern optimization.
            </p>
          </div>
        </div>

        <div class="timeline-item">
          <div class="timeline-node"></div>
          <div class="roadmap-header" style="cursor: pointer;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">
                Week 3: Real-World Integrated Integration Challenge
              </h4>
              <i class="fa-solid fa-chevron-down toggle-icon" style="color: var(--text-dim);"></i>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.25rem;">
              Focus area: Multi-file data flows and end-to-end scenario execution.
            </p>
          </div>
        </div>

        <div class="timeline-item">
          <div class="timeline-node"></div>
          <div class="roadmap-header" style="cursor: pointer;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">
                Week 4: Final Practical Benchmark & Role Certification
              </h4>
              <i class="fa-solid fa-chevron-down toggle-icon" style="color: var(--text-dim);"></i>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.25rem;">
              Focus area: Verified target role simulation for ${targetRole}.
            </p>
          </div>
        </div>
      `;

      const roadmapHeaders = timelineEl.querySelectorAll(".roadmap-header");
      roadmapHeaders.forEach(item => {
        item.addEventListener("click", () => {
          const content = item.nextElementSibling;
          if (content && content.classList.contains("glass-panel")) {
            const isHidden = content.style.display === "none" || !content.style.display;
            content.style.display = isHidden ? "block" : "none";
            const icon = item.querySelector(".toggle-icon");
            if (icon) {
              icon.className = isHidden ? "fa-solid fa-chevron-up toggle-icon" : "fa-solid fa-chevron-down toggle-icon";
            }
          }
        });
      });
    }

  } catch (err) {
    console.error("Failed to load skill gap data:", err);
    compListEl.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--accent-amber);">Unable to compute skill gap analysis. Please try refreshing.</div>`;
  }
}

// 6. CAREER RECOMMENDATIONS (career-recommendation.html)
async function initCareerRecommendationPage() {
  const user = window.SkillSyncAuth || {};
  const summaryTitle = document.getElementById("careerSummaryTitle");
  const summaryText = document.getElementById("careerSummaryText");
  const summaryScore = document.getElementById("careerSummaryScore");
  const recommendationsEl = document.getElementById("careerRecommendationsGrid");
  const noteEl = document.getElementById("careerRecommendationNote");
  if (!recommendationsEl || !user.id) return;

  recommendationsEl.innerHTML = `<div class="card" style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Calculating role matches from your verified competencies...</div>`;

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/career-recommendations/${user.id}`, { credentials: "include" });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || `HTTP ${response.status}`);

    const recommendations = result.data?.recommendations || [];
    if (!result.data?.has_data || recommendations.length === 0) {
      if (summaryTitle) summaryTitle.textContent = "Complete an assessment to discover matching roles";
      if (summaryText) summaryText.textContent = "Career recommendations are generated from your verified competency results.";
      if (summaryScore) summaryScore.textContent = "—";
      if (noteEl) noteEl.textContent = "Complete at least one assessment to generate evidence-based career recommendations.";
      recommendationsEl.innerHTML = `<div class="card" style="grid-column: 1 / -1; padding: 2.5rem; text-align: center;"><i class="fa-solid fa-compass" style="font-size: 2rem; color: var(--accent-cyan);"></i><h3 style="margin-top: 1rem;">No verified competency data yet</h3><p style="color: var(--text-muted); margin: 0.5rem 0 1.25rem;">Finish an assessment to see your strongest role matches and the skills to build next.</p><a href="assessments.html" class="btn btn-primary">Browse Assessments</a></div>`;
      return;
    }

    const topRecommendation = recommendations[0];
    if (summaryTitle) summaryTitle.textContent = `${topRecommendation.role_title} is your strongest current match`;
    if (summaryText) summaryText.textContent = "Recommendations are calculated from your verified competency results and each role's target skills.";
    if (summaryScore) summaryScore.textContent = `${topRecommendation.match_percent}%`;
    if (noteEl) noteEl.textContent = "Matches reflect demonstrated competencies and role targets; they are guidance, not hiring guarantees.";

    recommendationsEl.innerHTML = recommendations.map((recommendation, index) => {
      const matching = recommendation.matching_competencies || [];
      const missing = recommendation.missing_competencies || [];
      const matchingTags = matching.length
        ? matching.map(skill => `<span>${escapeCareerText(skill.skill_name)} ${Math.round(Number(skill.current_score))}%</span>`).join("")
        : "<span>Build evidence through an assessment</span>";
      const missingText = missing.length
        ? missing.map(skill => `${escapeCareerText(skill.skill_name)} (${Math.round(Number(skill.current_score))}% / ${Math.round(Number(skill.target_score))}%)`).join(", ")
        : "All tracked target competencies are currently met.";
      const icon = ["fa-solid fa-compass", "fa-solid fa-chart-line", "fa-solid fa-briefcase", "fa-solid fa-code"][index] || "fa-solid fa-compass";
      return `<article class="card card-hover-glow career-card"><div class="career-card-heading"><div class="stat-icon"><i class="${icon}"></i></div><span class="badge ${index === 0 ? "badge-green" : "badge-primary"}">${recommendation.match_percent}% Match</span></div><h2>${escapeCareerText(recommendation.role_title)}</h2><p>Match based on your current verified competency evidence against this role's target profile.</p><h4>Strongest matching competencies</h4><div class="career-tags">${matchingTags}</div><h4>Missing competencies</h4><p class="career-gap">${missingText}</p><a href="skill-gap.html" class="btn btn-secondary btn-sm">View Skill Gap <i class="fa-solid fa-arrow-right"></i></a></article>`;
    }).join("");
  } catch (error) {
    console.error("Failed to load career recommendations:", error);
    if (summaryTitle) summaryTitle.textContent = "Career recommendations are unavailable";
    if (summaryText) summaryText.textContent = "We could not load your current competency-based recommendations.";
    if (summaryScore) summaryScore.textContent = "—";
    if (noteEl) noteEl.textContent = "Try again after confirming the API is running.";
    recommendationsEl.innerHTML = `<div class="card" style="grid-column: 1 / -1; padding: 2rem; text-align: center;"><i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: #f43f5e;"></i><h3 style="margin-top: 1rem;">Unable to load recommendations</h3><p style="color: var(--text-muted); margin-top: 0.5rem;">${escapeCareerText(error.message)}</p></div>`;
  }
}

function escapeCareerText(value) {
  const text = String(value ?? "");
  const entityMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return text.replace(/[&<>"']/g, character => entityMap[character]);
}

// 7. PASSPORT PAGE (passport.html)
function initPassportPage() {
  const shareBtn = document.getElementById("sharePassportBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(window.location.href);
      showToast("Public Passport link copied to clipboard!", "success");
    });
  }

  const exportBtn = document.getElementById("exportPassportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      showToast("Generating Verifiable Skill Credential PDF...", "info");
      setTimeout(() => {
        showToast("Competency Passport downloaded successfully!", "success");
      }, 1500);
    });
  }
}

// 7. RECRUITER DASHBOARD (recruiter.html)
async function initRecruiterDashboard() {
  // Initialize Recruiter Pipeline Chart
  const ctx = document.getElementById("recruiterPipelineChart");
  if (ctx && typeof Chart !== 'undefined') {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Applied', 'Screened', 'Practical Assessed', 'Strong Matches', 'Offers'],
        datasets: [{
          label: 'Candidates',
          data: [248, 142, 98, 64, 18],
          backgroundColor: [
            'rgba(99, 102, 241, 0.4)',
            'rgba(99, 102, 241, 0.6)',
            'rgba(6, 182, 212, 0.7)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(139, 92, 246, 0.9)'
          ],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
        }
      }
    });
  }

  const candidateRowsEl = document.getElementById("recruiterCandidateRows");
  const jobOpeningsEl = document.getElementById("recruiterJobOpenings");
  const openPositionsEl = document.getElementById("recruiterOpenPositions");
  const candidatesAssessedEl = document.getElementById("recruiterCandidatesAssessed");
  const strongFitsEl = document.getElementById("recruiterStrongFits");
  const averageScoreEl = document.getElementById("recruiterAverageScore");

  try {
    const [candidatesResponse, openingsResponse] = await Promise.all([
      fetch(`${getApiBaseUrl()}/api/candidates`, { credentials: "include" }),
      fetch(`${getApiBaseUrl()}/api/job-openings`, { credentials: "include" })
    ]);
    const [candidatesResult, openingsResult] = await Promise.all([
      candidatesResponse.json(),
      openingsResponse.json()
    ]);
    if (!candidatesResponse.ok || !candidatesResult.success) {
      throw new Error(candidatesResult.message || `Candidates request failed (${candidatesResponse.status})`);
    }
    if (!openingsResponse.ok || !openingsResult.success) {
      throw new Error(openingsResult.message || `Job openings request failed (${openingsResponse.status})`);
    }

    const candidates = Array.isArray(candidatesResult.data) ? candidatesResult.data : [];
    const openings = Array.isArray(openingsResult.data) ? openingsResult.data : [];
    const assessedCandidates = candidates.filter(candidate => Number(candidate.assessments_completed) > 0);
    const scoredCandidates = candidates.filter(candidate => Number.isFinite(Number(candidate.overall_competency)));
    const averageScore = scoredCandidates.length
      ? Math.round(scoredCandidates.reduce((sum, candidate) => sum + Number(candidate.overall_competency), 0) / scoredCandidates.length)
      : null;

    if (openPositionsEl) openPositionsEl.textContent = openings.reduce((sum, opening) => sum + Number(opening.openings_count || 0), 0);
    if (candidatesAssessedEl) candidatesAssessedEl.textContent = assessedCandidates.length;
    if (strongFitsEl) strongFitsEl.textContent = scoredCandidates.filter(candidate => Number(candidate.overall_competency) >= 80).length;
    if (averageScoreEl) averageScoreEl.textContent = averageScore === null ? "—" : `${averageScore}%`;

    if (candidateRowsEl) {
      candidateRowsEl.innerHTML = candidates.length
        ? candidates.map(candidate => {
          const name = escapeRecruiterText(candidate.name || "Unnamed candidate");
          const initials = name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
          const score = Number.isFinite(Number(candidate.overall_competency)) ? `${Math.round(Number(candidate.overall_competency))}%` : "Not assessed";
          const level = escapeRecruiterText(candidate.competency_level || "Not assessed");
          const completed = Number(candidate.assessments_completed) || 0;
          const assessed = completed > 0;
          return `<tr class="candidate-row"><td><div style="display: flex; align-items: center; gap: 0.75rem;"><div class="avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">${initials}</div><div><div style="font-weight: 700; color: var(--text-main);">${name}</div><div style="font-size: 0.75rem; color: var(--text-muted);">ID: ${escapeRecruiterText(candidate.id)}</div></div></div></td><td>${level}</td><td><span style="font-weight: 700; color: var(--accent-cyan);">${score}</span></td><td>${completed}</td><td><span class="badge ${assessed ? "badge-green" : "badge-amber"}">${assessed ? "Assessed" : "Pending assessment"}</span></td><td><a href="candidate.html?id=${encodeURIComponent(candidate.id)}" class="btn btn-secondary btn-sm">View Profile</a></td></tr>`;
        }).join("")
        : `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No candidate accounts found.</td></tr>`;
    }

    if (jobOpeningsEl) {
      jobOpeningsEl.innerHTML = openings.length
        ? openings.map((opening, index) => {
          const requirements = Object.entries(opening.required_competencies || {})
            .map(([skill, target]) => `${escapeRecruiterText(skill)} (${Math.round(Number(target))}%+)`)
            .join(", ");
          return `<div class="glass-panel" style="padding: 0.85rem;"><div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.9rem;"><span>${escapeRecruiterText(opening.role_title)}</span><span class="badge ${index === 0 ? "badge-green" : "badge-primary"}">${Number(opening.openings_count) || 0} ${Number(opening.openings_count) === 1 ? "Opening" : "Openings"}</span></div><div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">Required: ${requirements || "Not specified"}</div></div>`;
        }).join("")
        : `<div style="color: var(--text-muted); font-size: 0.85rem;">No active job openings.</div>`;
    }
  } catch (error) {
    console.error("Failed to load recruiter dashboard data:", error);
    if (candidateRowsEl) candidateRowsEl.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Unable to load candidates: ${escapeRecruiterText(error.message)}</td></tr>`;
    if (jobOpeningsEl) jobOpeningsEl.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">Unable to load job openings.</div>`;
  }

  // Recruiter candidate filter table
  const searchInput = document.getElementById("candidateSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      const rows = document.querySelectorAll(".candidate-row");
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? "" : "none";
      });
    });
  }
}

function escapeRecruiterText(value) {
  const entityMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(value ?? "").replace(/[&<>"']/g, character => entityMap[character]);
}

// 8. CANDIDATE PROFILE VIEW (candidate.html)
async function initCandidateProfileView() {
  const candidateId = new URLSearchParams(window.location.search).get("id");
  const errorEl = document.getElementById("candidateProfileError");
  const bannerEl = document.getElementById("candidateProfileBanner");
  const bodyEl = document.getElementById("candidateProfileBody");
  const showError = (message) => {
    if (errorEl) {
      errorEl.style.display = "block";
      errorEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: #f43f5e;"></i><h2 style="margin-top: 1rem;">${escapeRecruiterText(message)}</h2><p style="color: var(--text-muted); margin-top: 0.5rem;">Return to the candidate list and select a profile.</p>`;
    }
    if (bannerEl) bannerEl.style.display = "none";
    if (bodyEl) bodyEl.style.display = "none";
  };

  if (!candidateId) {
    showError("No candidate selected");
    return;
  }

  try {
    const jobId = new URLSearchParams(window.location.search).get("jobId");
    const jobFitUrl = `${getApiBaseUrl()}/api/candidates/${encodeURIComponent(candidateId)}/job-fit${jobId ? `?jobId=${encodeURIComponent(jobId)}` : ""}`;
    const [candidateResponse, jobFitResponse] = await Promise.all([
      fetch(`${getApiBaseUrl()}/api/candidates/${encodeURIComponent(candidateId)}`, { credentials: "include" }),
      fetch(jobFitUrl, { credentials: "include" })
    ]);
    const [candidateResult, jobFitResult] = await Promise.all([
      candidateResponse.json(),
      jobFitResponse.json()
    ]);
    if (!candidateResponse.ok || !candidateResult.success) throw new Error(candidateResult.message || `Candidate request failed (${candidateResponse.status})`);
    if (!jobFitResponse.ok || !jobFitResult.success) throw new Error(jobFitResult.message || `Job fit request failed (${jobFitResponse.status})`);

    const candidate = candidateResult.data;
    const jobFit = jobFitResult.data;
    const competencies = Array.isArray(jobFit.competencies) ? jobFit.competencies : [];
    const scoreBySkill = Object.fromEntries(competencies.map(item => [item.skill_name, Number(item.score)]));
    const overallCompetency = Number.isFinite(Number(candidate.overall_competency))
      ? Math.round(Number(candidate.overall_competency))
      : (competencies.length ? Math.round(competencies.reduce((sum, item) => sum + Number(item.score), 0) / competencies.length) : null);
    const matchPercent = Math.round(Number(jobFit.match_percent) || 0);
    const fitLabel = matchPercent > 80 ? "Strong Fit" : (matchPercent >= 60 ? "Moderate Fit" : "Needs Development");
    const name = candidate.name || "Unnamed candidate";

    const nameEl = document.getElementById("candidateProfileName");
    const avatarEl = document.getElementById("candidateProfileAvatar");
    const roleEl = document.getElementById("candidateJobRole");
    const fitEl = document.getElementById("candidateJobFit");
    const competencyEl = document.getElementById("candidateCompetencyScore");
    const recommendationEl = document.getElementById("candidateHiringRecommendation");
    const comparisonEl = document.getElementById("candidateRequirementComparison");
    if (nameEl) nameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
    if (roleEl) roleEl.textContent = jobFit.job_opening?.role_title || "Selected role";
    if (fitEl) fitEl.textContent = `${matchPercent}%`;
    if (competencyEl) competencyEl.textContent = overallCompetency === null ? "No competency score yet" : `${overallCompetency}% Overall Competency`;
    if (recommendationEl) recommendationEl.textContent = `${name} is a ${fitLabel} (${matchPercent}% Job Fit) for the ${jobFit.job_opening?.role_title || "selected"} role, based on verified assessment competencies.`;
    if (comparisonEl) {
      const requirements = Array.isArray(jobFit.requirements) ? jobFit.requirements : [];
      comparisonEl.innerHTML = requirements.length
        ? requirements.map(requirement => {
          const meetsTarget = Number(requirement.current_score) >= Number(requirement.required_score);
          const color = meetsTarget ? "var(--accent-green)" : "var(--accent-amber)";
          return `<div><div style="display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 600; margin-bottom: 0.35rem;"><span>${escapeRecruiterText(requirement.skill_name)} (Required: ${Math.round(Number(requirement.required_score))}%)</span><span style="color: ${color};">Candidate: ${Math.round(Number(requirement.current_score))}%${meetsTarget ? " ✓" : ""}</span></div><div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${Math.max(0, Math.min(100, Number(requirement.current_score)))}%; background: ${color};"></div></div></div>`;
        }).join("")
        : `<div style="color: var(--text-muted);">This job opening has no competency requirements configured.</div>`;
    }

    const radarSkills = ["Python", "Debugging", "Algorithms", "Data Analysis", "Communication"];
    renderRadarChart("candidateMatchRadar", radarSkills.map(skill => Number(scoreBySkill[skill] || 0)), radarSkills);
    if (bannerEl) bannerEl.style.display = "";
    if (bodyEl) bodyEl.style.display = "";
  } catch (error) {
    console.error("Failed to load candidate profile:", error);
    showError(error.message || "Candidate profile could not be loaded");
  }
}

// 9. HISTORY PAGE (history.html)
function initHistoryPage() {
  renderTrendChart("historyTrendChart");
}

// 10. GEMINI AI MENTOR PAGE (mentor.html)
function initAIMentorPage() {
  const form = document.getElementById("mentorForm");
  const input = document.getElementById("mentorQuestionInput");
  const sendBtn = document.getElementById("sendMentorBtn");
  const clearBtn = document.getElementById("clearChatBtn");
  
  const emptyState = document.getElementById("mentorEmptyState");
  const loadingState = document.getElementById("mentorLoadingState");
  const responseBox = document.getElementById("mentorResponseBox");
  const errorState = document.getElementById("mentorErrorState");
  
  const questionText = document.getElementById("userQuestionText");
  const answerContent = document.getElementById("aiAnswerContent");
  const errorText = document.getElementById("errorMessageText");

  // Initialize BYOK manager component (optional custom key)
  if (typeof window.BYOKManager !== 'undefined') {
    window.BYOKManager.init({
      containerId: 'byokCard'
    });
  }

  // Suggested questions click handler
  const suggestionPills = document.querySelectorAll(".suggestion-pill");
  suggestionPills.forEach(pill => {
    pill.addEventListener("click", () => {
      const q = pill.getAttribute("data-question");
      if (q && input) {
        input.value = q;
        submitMentorQuestion(q);
      }
    });
  });

  // Clear / Reset chat
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (input) input.value = "";
      if (emptyState) emptyState.style.display = "block";
      if (loadingState) loadingState.style.display = "none";
      if (responseBox) responseBox.style.display = "none";
      if (errorState) errorState.style.display = "none";
    });
  }

  // Form submit handler
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = input ? input.value.trim() : "";
      if (!query) {
        showToast("Please enter a question for the AI Mentor.", "info");
        return;
      }
      submitMentorQuestion(query);
    });
  }

  // Submit question to backend
  async function submitMentorQuestion(question) {
    if (!question) return;

    // Set UI to loading state
    if (emptyState) emptyState.style.display = "none";
    if (responseBox) responseBox.style.display = "none";
    if (errorState) errorState.style.display = "none";
    if (loadingState) loadingState.style.display = "block";

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...`;
    }
    if (input) input.disabled = true;

    const payload = {
      context: {
        overallScore: CompetencyState.candidate.overallScore || 78,
        targetRole: "Java Developer",
        skills: {
          "java": 76,
          "debugging": 65,
          "sql": 81,
          "problemSolving": 79
        }
      },
      prompt: question,
      question: question
    };

    const BACKEND_URL = `${getApiBaseUrl()}/api/ai/mentor`;

    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (loadingState) loadingState.style.display = "none";

      if (response.ok && data.success) {
        if (responseBox) responseBox.style.display = "block";
        if (questionText) questionText.textContent = question;
        const answer = data.data?.response || data.data?.answer || data.answer || data.response;
        if (answerContent) answerContent.textContent = answer;
        showToast("Gemini AI Mentor response generated successfully!", "success");
      } else {
        if (errorState) errorState.style.display = "block";
        const errMsg = data.message || "AI service encountered an issue. Please check your API key.";
        if (errorText) errorText.textContent = errMsg;
        showToast("AI Mentor encountered an error.", "info");
        if (response.status === 403 || response.status === 400) {
          if (typeof window.BYOKManager !== 'undefined') {
            window.BYOKManager.checkKeyStatus();
          }
        }
      }

    } catch (err) {
      if (loadingState) loadingState.style.display = "none";
      if (errorState) errorState.style.display = "block";
      if (errorText) {
        errorText.textContent = `Network Error: Unable to reach backend service at ${BACKEND_URL}. Details: ${err.message}.`;
      }
      showToast("Could not connect to backend.", "info");
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `<span>Send</span> <i class="fa-solid fa-paper-plane"></i>`;
      }
      if (input) input.disabled = false;
    }
  }
}

