/**
 * storage.js — Абстракция хранения данных
 *
 * Использует VKStorage как облачный драйвер.
 * Дублирует в localStorage для быстрого доступа.
 */

const Storage = {
  async init() {
    if (typeof VKStorage !== "undefined") {
      VKStorage.init();
    }
  },

  // ═══ ПРОГРЕСС ТЕСТА ═══
  saveTestProgress(progress) {
    localStorage.setItem("ep_progress", JSON.stringify(progress));
    if (typeof VKStorage !== "undefined" && VKStorage.isVK) {
      VKStorage.saveProgress(progress);
    }
  },

  getTestProgress() {
    try {
      const raw = localStorage.getItem("ep_progress");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  clearTestProgress() {
    localStorage.removeItem("ep_progress");
    if (typeof VKStorage !== "undefined" && VKStorage.isVK) {
      VKStorage.clearProgress();
    }
  },

  clearQuestionOrder() {
    // Порядок хранится внутри progress
  },

  // ═══ РЕЗУЛЬТАТЫ ТЕСТОВ ═══
  saveTestResult(result) {
    const history = this.getTestHistory();
    history.unshift(result);
    if (history.length > 20) history.length = 20;

    localStorage.setItem("ep_history", JSON.stringify(history));
    localStorage.setItem("ep_lastResult", JSON.stringify(result));

    if (typeof VKStorage !== "undefined" && VKStorage.isVK) {
      VKStorage.saveHistory(history);
    }
  },

  getLastResult() {
    try {
      const raw = localStorage.getItem("ep_lastResult");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  getTestHistory() {
    try {
      const raw = localStorage.getItem("ep_history");
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  },

  deleteTest(id) {
    let history = this.getTestHistory();
    history = history.filter(function (t) {
      return t.id !== id;
    });
    localStorage.setItem("ep_history", JSON.stringify(history));

    const last = this.getLastResult();
    if (last && last.id === id) {
      if (history.length > 0) {
        localStorage.setItem("ep_lastResult", JSON.stringify(history[0]));
      } else {
        localStorage.removeItem("ep_lastResult");
      }
    }

    if (typeof VKStorage !== "undefined" && VKStorage.isVK) {
      VKStorage.saveHistory(history);
    }
  },
  deleteOldTests(keepHistory) {
    localStorage.setItem("ep_history", JSON.stringify(keepHistory));
    if (typeof VKStorage !== "undefined" && VKStorage.isVK) {
      VKStorage.saveHistory(keepHistory);
    }
  },

  // ═══ НАСТРОЙКИ ═══
  getSettings() {
    try {
      const raw = localStorage.getItem("ep_settings");
      if (!raw) return { gender: null, age: null, showFairytaleCTA: false };
      return JSON.parse(raw);
    } catch (e) {
      return { gender: null, age: null, showFairytaleCTA: false };
    }
  },

  saveSettings(settings) {
    localStorage.setItem("ep_settings", JSON.stringify(settings));
    if (typeof VKStorage !== "undefined" && VKStorage.isVK) {
      VKStorage.saveSettings(settings);
    }
  },

  // ═══ ОНБОРДИНГ ═══
  isOnboardingDone() {
    return localStorage.getItem("ep_onboarding") === "1";
  },

  setOnboardingDone() {
    localStorage.setItem("ep_onboarding", "1");
    if (typeof VKStorage !== "undefined" && VKStorage.isVK) {
      VKStorage.setOnboardingDone();
    }
  },

  remove(key) {
    localStorage.removeItem("ep_" + key);
    if (typeof VKStorage !== "undefined" && VKStorage.isVK) {
      VKStorage.remove(key);
    }
  },

  // ═══ СИНХРОНИЗАЦИЯ ИЗ ВК ═══
  async syncFromVK() {
    if (typeof VKStorage === "undefined" || !VKStorage.isVK) return;

    console.log("[Storage] Синхронизация из VK Storage...");

    try {
      const vkHistory = await VKStorage.loadHistory();
      if (vkHistory && vkHistory.length > 0) {
        const localHistory = this.getTestHistory();
        if (vkHistory.length > localHistory.length) {
          localStorage.setItem("ep_history", JSON.stringify(vkHistory));
          localStorage.setItem("ep_lastResult", JSON.stringify(vkHistory[0]));
          console.log("[Storage] История синхронизирована из ВК");
        }
      }

      const vkProgress = await VKStorage.loadProgress();
      if (vkProgress && Object.keys(vkProgress.answers).length > 0) {
        const localProgress = this.getTestProgress();
        if (
          !localProgress ||
          Object.keys(localProgress.answers).length <
            Object.keys(vkProgress.answers).length
        ) {
          localStorage.setItem("ep_progress", JSON.stringify(vkProgress));
          console.log("[Storage] Прогресс синхронизирован из ВК");
        }
      }

      const vkOnboarding = await VKStorage.isOnboardingDone();
      if (vkOnboarding) {
        localStorage.setItem("ep_onboarding", "1");
      }

      console.log("[Storage] Синхронизация завершена");
    } catch (e) {
      console.warn("[Storage] Ошибка синхронизации:", e.message);
    }
  },
};
