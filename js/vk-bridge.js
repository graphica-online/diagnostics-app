/**
 * vk-bridge.js — Безопасная интеграция с ВКонтакте
 *
 * Умеет определять среду запуска и никогда не зависает локально.
 */

const VK = {
  isAvailable: false,
  userInfo: null,

  // ═══ ИНИЦИАЛИЗАЦИЯ ═══
  async init() {
    // 1. Проверяем, запущены ли мы внутри ВКонтакте
    // Все приложения ВК запускаются с параметрами vk_app_id, vk_platform и т.д.
    const isVkEnv =
      window.location.search.includes("vk_") ||
      window.location.search.includes("api_id");

    if (
      isVkEnv &&
      (typeof vkBridge !== "undefined" ||
        typeof window.vkBridge !== "undefined")
    ) {
      try {
        const bridge = window.vkBridge || vkBridge;

        // Инициализируем библиотеку внутри ВК
        await bridge.send("VKWebAppInit");
        this.isAvailable = true;
        console.log("[VK] Успешно запущен внутри ВКонтакте");

        // Настраиваем внешний вид
        try {
          await bridge.send("VKWebAppSetViewSettings", {
            status_bar_style: "light",
            action_bar_color: "#050507",
          });
        } catch (e) {
          // Не критично для работы
        }

        // Загружаем данные пользователя
        await this.loadUserInfo();
      } catch (e) {
        console.warn("[VK] Ошибка инициализации Bridge:", e.message);
        this.isAvailable = false;
        this.loadLocalFallback();
      }
    } else {
      console.log(
        "[VK] Локальный запуск (Live Server / Beget). VK Bridge отключен.",
      );
      this.isAvailable = false;
      this.loadLocalFallback();
    }
  },

  // ═══ ЛОКАЛЬНЫЕ ДАННЫЕ (заглушка для теста) ═══
  loadLocalFallback() {
    this.userInfo = {
      first_name: "Иван",
      last_name: "Иванов",
      sex: 2, // 2 = мужской, 1 = женский
      city: { title: "Москва" },
    };
    // Записываем пол по умолчанию в настройки
    const settings = Storage.getSettings();
    settings.gender = "male";
    Storage.saveSettings(settings);
    console.log("[VK] Загружен локальный профиль:", this.userInfo.first_name);
  },

  // ═══ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ИЗ ВК ═══
  async loadUserInfo() {
    if (!this.isAvailable) return;

    try {
      const bridge = window.vkBridge || vkBridge;
      const data = await bridge.send("VKWebAppGetUserInfo");
      this.userInfo = data;

      // Сохраняем пол и возраст
      const settings = Storage.getSettings();
      if (data.sex === 1) settings.gender = "female";
      else if (data.sex === 2) settings.gender = "male";

      if (data.bdate) {
        const birthYear = parseInt(data.bdate.split(".").pop());
        if (birthYear > 1900) {
          settings.age = new Date().getFullYear() - birthYear;
        }
      }
      Storage.saveSettings(settings);

      console.log("[VK] Профиль загружен из ВК:", data.first_name);
    } catch (e) {
      console.warn("[VK] Не удалось загрузить профиль из ВК:", e.message);
      this.loadLocalFallback();
    }
  },

  // ═══ ШЕРИНГ (Поделиться) ═══
  async share(text, link) {
    if (!this.isAvailable) {
      try {
        await navigator.clipboard.writeText(text + "\n" + (link || ""));
        alert(
          "Ссылка скопирована в буфер обмена! (Вне ВК шеринг работает так)",
        );
      } catch (e) {
        alert("Шеринг доступен только внутри ВКонтакте");
      }
      return;
    }

    try {
      const bridge = window.vkBridge || vkBridge;
      await bridge.send("VKWebAppShare", {
        link: link || window.location.href,
      });
    } catch (e) {
      console.warn("[VK] Ошибка шеринга:", e.message);
    }
  },

  // ═══ PUSH-УВЕДОМЛЕНИЯ ═══
  async scheduleNotification(daysAfter, title, body) {
    if (!this.isAvailable) {
      console.log(
        `[VK] Отложено: через ${daysAfter} дн. — "${title}: ${body}"`,
      );
      return;
    }

    try {
      const bridge = window.vkBridge || vkBridge;
      await bridge.send("VKWebAppShowNotifications", {
        notification: {
          title: title,
          body: body,
          delay: daysAfter * 24 * 60 * 60,
        },
      });
    } catch (e) {
      console.warn("[VK] Не удалось запланировать уведомление:", e.message);
    }
  },

  // Запуск цикла уведомлений
  scheduleAllPushes() {
    const schedule = [
      {
        days: 14,
        title: "Энергетический профиль",
        body: "Прошло 2 недели. Как ваш приоритетный центр? Пройдите короткий тест 🌳",
      },
      {
        days: 30,
        title: "Энергетический профиль",
        body: "Ваш профиль мог измениться. Проверьте динамику 🌱",
      },
      {
        days: 60,
        title: "Энергетический профиль",
        body: "Два месяца назад вы прошли тест. Пора обновить результаты 🔄",
      },
      {
        days: 90,
        title: "Энергетический профиль",
        body: "Квартальный чек-ап вашей энергетической системы ✨",
      },
      {
        days: 180,
        title: "Энергетический профиль",
        body: "Полгода прошло. Как ваши центры? 🌳",
      },
      {
        days: 365,
        title: "Энергетический профиль",
        body: "Годовой обзор вашего энергетического профиля 🎉",
      },
    ];

    schedule.forEach((s) => {
      this.scheduleNotification(s.days, s.title, s.body);
    });
  },
};
