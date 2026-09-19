const discoveryQuestions = [
  {
    topic: "How you like to think",
    text: "Which kind of problem sounds most satisfying?",
    options: [
      { label: "Breaking a complex problem into clear steps", tags: ["technical", "analytical"] },
      { label: "Finding a new, creative way around a constraint", tags: ["technical", "communication"] },
      { label: "Understanding what people need and organizing a solution", tags: ["communication", "analytical"] }
    ]
  },
  {
    topic: "Your curiosity",
    text: "What would you most enjoy investigating?",
    options: [
      { label: "How an app or service works behind the scenes", tags: ["technical"] },
      { label: "Patterns hidden in numbers, events, or customer behavior", tags: ["analytical"] },
      { label: "Why a team or product is struggling and how to improve it", tags: ["communication", "analytical"] }
    ]
  },
  {
    topic: "Numbers and data",
    text: "How do you feel about working with numbers and data?",
    options: [
      { label: "I enjoy finding patterns and making evidence-based decisions", tags: ["analytical"] },
      { label: "I am comfortable using data when it helps solve a problem", tags: ["analytical", "technical"] },
      { label: "I prefer ideas, conversations, and organizing people or work", tags: ["communication"] }
    ]
  },
  {
    topic: "Building things",
    text: "What would you rather make on a free afternoon?",
    options: [
      { label: "A small tool, website, or automation", tags: ["technical"] },
      { label: "A dashboard that explains what is happening", tags: ["analytical", "technical"] },
      { label: "A plan, presentation, or workflow that helps people move forward", tags: ["communication"] }
    ]
  },
  {
    topic: "Working with code",
    text: "Which statement feels closest to you right now?",
    options: [
      { label: "I want to understand how code is built and debugged", tags: ["technical"] },
      { label: "I would rather use tools than write much code", tags: ["analytical", "communication"] },
      { label: "I am curious about code but want a practical, gradual start", tags: ["technical", "analytical"] }
    ]
  },
  {
    topic: "Aptitude in practice",
    text: "When something goes wrong, what do you naturally do first?",
    options: [
      { label: "Trace the steps until I find the root cause", tags: ["technical", "analytical"] },
      { label: "Look for evidence and compare what changed", tags: ["analytical"] },
      { label: "Ask questions, align people, and clarify the next action", tags: ["communication"] }
    ]
  },
  {
    topic: "Your ideal workday",
    text: "Which day would leave you feeling most energized?",
    options: [
      { label: "Building and improving a reliable technical system", tags: ["technical"] },
      { label: "Turning messy information into a clear recommendation", tags: ["analytical"] },
      { label: "Collaborating, presenting, and coordinating a useful outcome", tags: ["communication"] }
    ]
  },
  {
    topic: "What to explore next",
    text: "What would you most like to learn by trying a real challenge?",
    options: [
      { label: "How to build APIs, tools, or software features", tags: ["technical"] },
      { label: "How to analyze data and explain what it means", tags: ["analytical"] },
      { label: "How to frame problems and help a team make decisions", tags: ["communication", "analytical"] }
    ]
  }
];

const discoveryFields = {
  technical: {
    title: "Backend Development",
    reason: "You seem drawn to building reliable systems, tracing how things work, and solving problems step by step.",
    icon: "fa-server",
    filter: "technical"
  },
  analytical: {
    title: "Data Analysis",
    reason: "You seem energized by patterns, evidence, and turning information into useful decisions.",
    icon: "fa-chart-column",
    filter: "analytical"
  },
  communication: {
    title: "Communication & Coordination",
    reason: "You seem motivated by understanding people, clarifying direction, and helping work move forward.",
    icon: "fa-comments",
    filter: "communication"
  }
};

const discoveryState = {
  currentQuestion: 0,
  selectedAnswers: Array(discoveryQuestions.length).fill(null),
  signals: { technical: 0, analytical: 0, communication: 0 }
};

const questionText = document.getElementById("questionText");
const questionTopic = document.getElementById("questionTopic");
const answerOptions = document.getElementById("answerOptions");
const questionCount = document.getElementById("questionCount");
const questionPercent = document.getElementById("questionPercent");
const quizProgress = document.getElementById("quizProgress");
const backQuestion = document.getElementById("backQuestion");
const nextQuestion = document.getElementById("nextQuestion");
const quizView = document.getElementById("quizView");
const resultView = document.getElementById("resultView");
const suggestionCards = document.getElementById("suggestionCards");

function renderDiscoveryQuestion() {
  const question = discoveryQuestions[discoveryState.currentQuestion];
  const questionNumber = discoveryState.currentQuestion + 1;
  const percent = Math.round((questionNumber / discoveryQuestions.length) * 100);

  questionTopic.textContent = question.topic;
  questionText.textContent = question.text;
  questionCount.textContent = `Question ${questionNumber} of ${discoveryQuestions.length}`;
  questionPercent.textContent = `${percent}%`;
  quizProgress.style.width = `${percent}%`;
  answerOptions.innerHTML = "";

  question.options.forEach((option, optionIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "discovery-option";
    button.textContent = option.label;
    button.classList.toggle("selected", discoveryState.selectedAnswers[discoveryState.currentQuestion] === optionIndex);
    button.addEventListener("click", () => {
      discoveryState.selectedAnswers[discoveryState.currentQuestion] = optionIndex;
      answerOptions.querySelectorAll(".discovery-option").forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
      nextQuestion.disabled = false;
    });
    answerOptions.appendChild(button);
  });

  backQuestion.disabled = discoveryState.currentQuestion === 0;
  nextQuestion.disabled = discoveryState.selectedAnswers[discoveryState.currentQuestion] === null;
  nextQuestion.innerHTML = discoveryState.currentQuestion === discoveryQuestions.length - 1 ? "See My Suggestions <i class=\"fa-solid fa-compass\"></i>" : "Next <i class=\"fa-solid fa-arrow-right\"></i>";
}

function renderDiscoveryResults() {
  discoveryState.signals = { technical: 0, analytical: 0, communication: 0 };
  discoveryState.selectedAnswers.forEach((answerIndex, questionIndex) => {
    if (answerIndex === null) return;
    discoveryQuestions[questionIndex].options[answerIndex].tags.forEach(tag => {
      discoveryState.signals[tag] += 1;
    });
  });

  const suggestions = Object.entries(discoveryState.signals)
    .sort(([, first], [, second]) => second - first)
    .slice(0, 3)
    .map(([tag]) => discoveryFields[tag]);

  suggestionCards.innerHTML = suggestions.map(field => `
    <article class="card card-hover-glow discovery-suggestion">
      <div class="discovery-suggestion-icon"><i class="fa-solid ${field.icon}"></i></div>
      <h3>${field.title}</h3>
      <p>${field.reason}</p>
      <a href="assessments.html?field=${field.filter}" class="btn btn-secondary btn-sm">Explore ${field.title} Assessments <i class="fa-solid fa-arrow-right"></i></a>
    </article>
  `).join("");

  quizView.hidden = true;
  resultView.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

nextQuestion.addEventListener("click", () => {
  if (discoveryState.selectedAnswers[discoveryState.currentQuestion] === null) return;
  if (discoveryState.currentQuestion === discoveryQuestions.length - 1) {
    renderDiscoveryResults();
    return;
  }
  discoveryState.currentQuestion += 1;
  renderDiscoveryQuestion();
});

backQuestion.addEventListener("click", () => {
  if (discoveryState.currentQuestion === 0) return;
  discoveryState.currentQuestion -= 1;
  renderDiscoveryQuestion();
});

document.getElementById("retakeQuiz").addEventListener("click", () => {
  discoveryState.currentQuestion = 0;
  discoveryState.selectedAnswers = Array(discoveryQuestions.length).fill(null);
  quizView.hidden = false;
  resultView.hidden = true;
  renderDiscoveryQuestion();
});

renderDiscoveryQuestion();
