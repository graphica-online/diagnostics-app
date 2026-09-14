/**
 * vk-storage.js — Универсальное хранилище данных
 *
 * Внутри ВК: использует VK Storage (100 КБ на пользователя)
 * Локально: использует localStorage (без ограничений)
 *
 * Автоматически сжимает данные для VK Storage
 */

const VKStorage = {
  isVK: false,
  bridge: null,

  // ═══ ИНИЦИАЛИЗАЦИЯ ═══
  init() {
    if (typeof VK !== "undefined" && VK.isAvailable) {
      this.isVK = true;
      this.bridge = window.vkBridge || vkBridge;
      console.log("[VKStorage] Режим: VK Storage");
    } else {
      this.isVK = false;
      console.log("[VKStorage] Режим: localStorage (заглушка)");
    }
  },

  // ═══ ЧТЕНИЕ ═══
  async get(key) {
    if (this.isVK) {
      try {
        const data = await this.bridge.send("VKWebAppStorageGet", {
          keys: [key],
        });
        if (data && data.keys && data.keys.length > 0) {
          return data.keys[0].value || null;
        }
        return null;
      } catch (e) {
        console.warn("[VKStorage] Ошибка чтения:", e.message);
        return null;
      }
    } else {
      return localStorage.getItem("ep_vk_" + key);
    }
  },

  // ═══ ЗАПИСЬ ═══
  async set(key, value) {
    if (this.isVK) {
      try {
        await this.bridge.send("VKWebAppStorageSet", {
          key: key,
          value: value,
        });
      } catch (e) {
        console.warn("[VKStorage] Ошибка записи:", e.message);
      }
    } else {
      localStorage.setItem("ep_vk_" + key, value);
    }
  },

  // ═══ УДАЛЕНИЕ ═══
  async remove(key) {
    if (this.isVK) {
      try {
        await this.bridge.send("VKWebAppStorageSet", { key: key, value: "" });
      } catch (e) {
        console.warn("[VKStorage] Ошибка удаления:", e.message);
      }
    } else {
      localStorage.removeItem("ep_vk_" + key);
    }
  },

  // ═══ КОДИРОВАНИЕ ОТВЕТОВ (сжатие) ═══
  encodeAnswers(answers) {
    const parts = [];
    for (const key in answers) {
      const short = key.replace("b", "").replace("_q", ":");
      parts.push(short + "=" + answers[key]);
    }
    return parts.join("|");
  },

  // ═══ ДЕКОДИРОВАНИЕ ОТВЕТОВ ═══
  decodeAnswers(str) {
    if (!str) return {};
    const answers = {};
    const parts = str.split("|");
    for (const part of parts) {
      if (!part) continue;
      const eqIdx = part.indexOf("=");
      if (eqIdx === -1) continue;
      const key = part.substring(0, eqIdx);
      const val = part.substring(eqIdx + 1);
      const blockNum = key.split(":");
      if (blockNum.length === 2) {
        answers["b" + blockNum[0] + "_q" + blockNum[1]] = isNaN(val)
          ? val
          : Number(val);
      }
    }
    return answers;
  },

  // ═══ КОДИРОВАНИЕ ПОРЯДКА ВОПРОСОВ ═══
  encodeOrder(orderIds) {
    if (!orderIds || !orderIds.length) return "";
    return orderIds
      .map(function (id) {
        return id.replace("b", "").replace("_q", ":");
      })
      .join(",");
  },

  // ═══ ДЕКОДИРОВАНИЕ ПОРЯДКА ═══
  decodeOrder(str) {
    if (!str) return null;
    return str.split(",").map(function (s) {
      const parts = s.split(":");
      return "b" + parts[0] + "_q" + parts[1];
    });
  },

  // ═══ КОДИРОВАНИЕ ИСТОРИИ (компактный формат) ═══
  encodeHistory(history) {
    if (!history || !history.length) return "";
    return history
      .map(function (test) {
        const date = test.date
          ? test.date.substring(0, 10).replace(/-/g, "")
          : "00000000";
        const health = test.overallHealth || 0;
        const s = test.summary || {};
        const worst = (s.worstCenter || "?") + ":" + (s.worstHealth || 0);
        const pattern = s.pattern || "-";
        const child = s.childAge || "-";
        const resources = (s.topResources || []).join("+") || "-";
        return [date, health, worst, pattern, child, resources].join("|");
      })
      .join("~");
  },

  // ═══ ДЕКОДИРОВАНИЕ ИСТОРИИ ═══
  decodeHistory(str) {
    if (!str) return [];
    return str
      .split("~")
      .map(function (entry) {
        if (!entry) return null;
        const parts = entry.split("|");
        if (parts.length < 2) return null;

        const dateStr = parts[0];
        const health = parseInt(parts[1]) || 0;

        const date =
          dateStr.length === 8
            ? dateStr.substring(0, 4) +
              "-" +
              dateStr.substring(4, 6) +
              "-" +
              dateStr.substring(6, 8) +
              "T00:00:00.000Z"
            : dateStr;

        let worstCenter = "?";
        let worstHealth = 0;
        if (parts[2] && parts[2] !== "-") {
          const colonIdx = parts[2].lastIndexOf(":");
          if (colonIdx !== -1) {
            worstCenter = parts[2].substring(0, colonIdx);
            worstHealth = parseInt(parts[2].substring(colonIdx + 1)) || 0;
          }
        }

        return {
          id:
            Date.now().toString(36) +
            Math.random().toString(36).substring(2, 5),
          date: date,
          overallHealth: health,
          summary: {
            worstCenter: worstCenter,
            worstHealth: worstHealth,
            pattern: parts[3] !== "-" ? parts[3] : null,
            childAge: parts[4] !== "-" ? parts[4] : null,
            topResources:
              parts[5] && parts[5] !== "-" ? parts[5].split("+") : [],
          },
          answers: {},
          orderIds: null,
        };
      })
      .filter(Boolean);
  },

  // ═══ СОХРАНЕНИЕ ПРОГРЕССА ТЕСТА ═══
  async saveProgress(progress) {
    const encoded =
      this.encodeAnswers(progress.answers || {}) +
      "||" +
      (progress.currentQuestion || 0) +
      "||" +
      this.encodeOrder(progress.orderIds || []);
    await this.set("progress", encoded);
  },

  // ═══ ЧТЕНИЕ ПРОГРЕССА ТЕСТА ═══
  async loadProgress() {
    const raw = await this.get("progress");
    if (!raw) return null;
    const parts = raw.split("||");
    if (parts.length < 2) return null;
    return {
      answers: this.decodeAnswers(parts[0]),
      currentQuestion: parseInt(parts[1]) || 0,
      orderIds: this.decodeOrder(parts[2] || ""),
    };
  },

  // ═══ ОЧИСТКА ПРОГРЕССА ═══
  async clearProgress() {
    await this.remove("progress");
  },

  // ═══ СОХРАНЕНИЕ ИСТОРИИ ═══
  async saveHistory(history) {
    const trimmed = history.slice(0, 20);
    const encoded = this.encodeHistory(trimmed);
    await this.set("history", encoded);
  },

  // ═══ ЧТЕНИЕ ИСТОРИИ ═══
  async loadHistory() {
    const raw = await this.get("history");
    if (!raw) return [];
    return this.decodeHistory(raw);
  },

  // ═══ СОХРАНЕНИЕ НАСТРОЕК ═══
  async saveSettings(settings) {
    const encoded =
      (settings.gender || "m") +
      "," +
      (settings.age || 0) +
      "," +
      (settings.showFairytaleCTA ? 1 : 0);
    await this.set("settings", encoded);
  },

  // ═══ ЧТЕНИЕ НАСТРОЕК ═══
  async loadSettings() {
    const raw = await this.get("settings");
    if (!raw) return { gender: null, age: null, showFairytaleCTA: false };
    const parts = raw.split(",");
    return {
      gender: parts[0] === "f" ? "female" : "male",
      age: parseInt(parts[1]) || null,
      showFairytaleCTA: parts[2] === "1",
    };
  },

  // ═══ ОНБОРДИНГ ═══
  async setOnboardingDone() {
    await this.set("onboarding", "1");
  },

  async isOnboardingDone() {
    const val = await this.get("onboarding");
    return val === "1";
  },
};
