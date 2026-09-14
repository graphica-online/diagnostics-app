/**
 * app.js — Инициализация приложения, роутинг, загрузка данных
 */

// ═══ ГЛОБАЛЬНОЕ СОСТОЯНИЕ ═══
const App = {
  currentScreen: "home",
  questions: {
    block1: [],
    block2: [],
    block3: [],
    block4: [],
    block5: [],
  },
  texts: {
    centers: {},
    patterns: {},
    recommend: {},
    child: {},
    fairytales: {},
  },
  testState: {
    currentQuestion: 0,
    answers: {},
    block: 1,
    totalQuestions: 127,
  },
};

// ═══ БЕЗОПАСНОСТЬ: ЭКРАНИРОВАНИЕ HTML (XSS) ═══
App.escapeHtml = function (str) {
  if (typeof str !== "string") return str || "";
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
};

// ═══ ИНИЦИАЛИЗАЦИЯ ═══
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[App] 1/4 — Старт инициализации...");

  try {
    if (typeof VK !== "undefined" && VK.init) {
      await VK.init();
    }
    console.log("[App] 2/4 — VK Bridge проверен");

    // Инициализируем хранилище и синхронизируем из ВК
    if (typeof Storage !== "undefined" && Storage.init) {
      await Storage.init();
      await Storage.syncFromVK();
    }

    await App.loadData();
    console.log("[App] 3/4 — Данные загружены");

    const onboardingDone =
      typeof Storage !== "undefined" && Storage.isOnboardingDone();
    const startScreen = onboardingDone ? "home" : "onboarding";

    App.showScreen(startScreen);
    App.updateHomeScreen();
    console.log("[App] 4/4 — Готово! Открыт экран: " + startScreen);
  } catch (err) {
    console.error("[App] Критическая ошибка при старте:", err);
    App.showScreen("home");
  }
});

// ═══ ЗАГРУЗКА ДАННЫХ ИЗ JSON ═══
App.loadData = async function () {
  const dataFiles = [
    { type: "questions", key: "block1", path: "data/questions-block1.json" },
    { type: "questions", key: "block2", path: "data/questions-block2.json" },
    { type: "questions", key: "block3", path: "data/questions-block3.json" },
    { type: "questions", key: "block4", path: "data/questions-block4.json" },
    { type: "questions", key: "block5", path: "data/questions-block5.json" },
    { type: "texts", key: "centers", path: "data/texts-centers.json" },
    { type: "texts", key: "patterns", path: "data/texts-patterns.json" },
    { type: "texts", key: "recommend", path: "data/texts-recommend.json" },
    { type: "texts", key: "child", path: "data/texts-child.json" },
    { type: "texts", key: "fairytales", path: "data/texts-fairytales.json" },
  ];

  for (const file of dataFiles) {
    try {
      const response = await fetch(file.path);
      if (response.ok) {
        const json = await response.json();
        if (file.type === "questions") {
          App.questions[file.key] = json;
        } else {
          App.texts[file.key] = json;
        }
      } else {
        console.warn("[App] Файл не найден: " + file.path);
      }
    } catch (e) {
      console.warn("[App] Ошибка загрузки " + file.path + ": " + e.message);
    }
  }
};

// ═══ РОУТИНГ ЭКРАНОВ ═══
App.showScreen = function (screenId) {
  const screens = ["onboarding", "home", "test", "result", "history", "about"];
  const screensWithNav = ["home", "result", "history", "about"];

  // Скрываем все экраны
  screens.forEach(function (s) {
    const el = document.getElementById("screen-" + s);
    if (el) el.classList.remove("active");
  });

  // Показываем целевой
  const target = document.getElementById("screen-" + screenId);
  if (target) {
    target.classList.add("active");
  } else {
    console.error("[App] Экран screen-" + screenId + " не найден!");
    const home = document.getElementById("screen-home");
    if (home) home.classList.add("active");
  }

  // Управление нижним меню
  const nav = document.getElementById("bottom-nav");
  if (nav) {
    if (screensWithNav.indexOf(screenId) !== -1) {
      nav.classList.remove("hidden");
    } else {
      nav.classList.add("hidden");
    }
  }

  // Подсветка активной кнопки меню
  document.querySelectorAll(".nav-btn").forEach(function (btn) {
    const isActive = btn.dataset.screen === screenId;
    const svg = btn.querySelector("svg");
    const span = btn.querySelector("span");

    if (isActive) {
      btn.classList.add("bg-holo/[0.08]");
      btn.style.boxShadow = "inset 0 0 12px rgba(123,97,255,0.10)";
      if (svg) {
        svg.style.color = "#7B61FF";
        svg.style.filter = "drop-shadow(0 0 4px rgba(123,97,255,0.5))";
      }
      if (span) span.style.color = "#7B61FF";
    } else {
      btn.classList.remove("bg-holo/[0.08]");
      btn.style.boxShadow = "none";
      if (svg) {
        svg.style.color = "rgba(255,255,255,0.4)";
        svg.style.filter = "none";
      }
      if (span) span.style.color = "rgba(255,255,255,0.4)";
    }
  });

  App.currentScreen = screenId;
  window.scrollTo(0, 0);

  // Инициализация модулей при открытии экранов
  if (screenId === "onboarding" && typeof Onboarding !== "undefined") {
    Onboarding.init();
  }
  if (screenId === "test" && typeof Test !== "undefined") {
    Test.init();
  }
  if (screenId === "history" && typeof Chronology !== "undefined") {
    Chronology.render();
  }
  if (screenId === "result" && typeof Result !== "undefined") {
    const lastResult = Storage.getLastResult();
    if (lastResult) {
      Result.render(lastResult);
      setTimeout(function () {
        if (typeof Result.initAnchors === "function") {
          Result.initAnchors();
        }
      }, 150);
    }
  }
};

// Глобальный хелпер для кнопок в HTML
function navigateTo(screenId) {
  App.showScreen(screenId);
}

// ═══ ОБНОВЛЕНИЕ ГЛАВНОГО ЭКРАНА ═══
App.updateHomeScreen = function () {
  if (typeof Storage === "undefined") return;

  // Проверяем, есть ли незавершённый тест
  const progress = Storage.getTestProgress();
  const startBtn = document.getElementById("home-start-btn");
  const startBtnText = document.getElementById("home-start-btn-text");
  const resetBtn = document.getElementById("home-reset-btn");

  if (
    progress &&
    progress.answers &&
    Object.keys(progress.answers).length > 0
  ) {
    // Есть сохранённый прогресс — показываем «Продолжить» + кнопку сброса
    const current = (progress.currentQuestion || 0) + 1;
    const total =
      App.questions.block1.length +
        App.questions.block2.length +
        App.questions.block3.length +
        App.questions.block4.length +
        App.questions.block5.length || 122;

    if (startBtnText) {
      startBtnText.textContent =
        "Продолжить тест (" + current + " из " + total + ")";
    }
    if (startBtn) {
      const svg = startBtn.querySelector("svg");
      if (svg) {
        svg.innerHTML =
          '<path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/>';
      }
    }
    // Показываем кнопку «Пройти заново»
    if (resetBtn) {
      resetBtn.classList.remove("hidden");
    }
  } else {
    // Нет прогресса — стандартная кнопка, кнопку сброса скрываем
    if (startBtnText) {
      startBtnText.textContent = "Начать диагностику";
    }
    if (startBtn) {
      const svg = startBtn.querySelector("svg");
      if (svg) {
        svg.innerHTML =
          '<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>';
      }
    }
    // Скрываем кнопку «Пройти заново»
    if (resetBtn) {
      resetBtn.classList.add("hidden");
    }
  }

  // 2. Показываем последний результат
  const lastResult = Storage.getLastResult();
  const preview = document.getElementById("home-last-result");

  if (lastResult && preview) {
    preview.classList.remove("hidden");
    const dateEl = document.getElementById("home-last-date");
    const percentEl = document.getElementById("home-last-percent");

    if (percentEl) percentEl.textContent = lastResult.overallHealth || "—";
    if (dateEl && lastResult.date) {
      const d = new Date(lastResult.date);
      dateEl.textContent = d.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      });
    }
  }
};
// ═══ ГЛОБАЛЬНЫЙ СБРОС ТЕСТА С ГЛАВНОГО ЭКРАНА ═══
function resetTest() {
  App.showConfirm({
    title: "Начать заново?",
    message:
      "Текущий прогресс будет потерян. Все ответы удалятся, и тест начнётся с первого вопроса в новом порядке.",
    confirmText: "Начать заново",
    cancelText: "Отмена",
    onConfirm: () => {
      // 1. Очищаем прогресс
      Storage.clearTestProgress();
      Storage.clearQuestionOrder();

      // 2. Сбрасываем состояние теста
      App.testState.currentQuestion = 0;
      App.testState.answers = {};

      // 3. Переключаемся на экран теста (это автоматически вызовет Test.init())
      App.showScreen("test");

      // 4. Обновляем главный экран (на будущее)
      App.updateHomeScreen();
    },
  });
}

// ═══ УНИВЕРСАЛЬНЫЙ МОДАЛ ПОДТВЕРЖДЕНИЯ ═══
App.showConfirm = function (options) {
  const modal = document.getElementById("modal-confirm");
  const title = document.getElementById("modal-title");
  const message = document.getElementById("modal-message");
  const confirmBtn = document.getElementById("modal-confirm-btn");
  const cancelBtn = document.getElementById("modal-cancel-btn");

  if (!modal) {
    // Fallback на стандартный confirm если модала нет
    if (confirm(options.message || "Подтвердить?")) {
      if (options.onConfirm) options.onConfirm();
    }
    return;
  }

  // Устанавливаем тексты
  if (title) title.textContent = options.title || "Подтверждение";
  if (message) message.textContent = options.message || "Вы уверены?";
  if (confirmBtn) confirmBtn.textContent = options.confirmText || "Подтвердить";
  if (cancelBtn) cancelBtn.textContent = options.cancelText || "Отмена";

  // Показываем модал
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Функция закрытия
  const close = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    // Убираем обработчики, чтобы не накапливались
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
    modal.onclick = null;
  };

  // Обработчики
  confirmBtn.onclick = () => {
    close();
    if (options.onConfirm) options.onConfirm();
  };

  cancelBtn.onclick = () => {
    close();
    if (options.onCancel) options.onCancel();
  };

  // Клик по фону закрывает модал
  modal.onclick = (e) => {
    if (e.target === modal) close();
  };
};
