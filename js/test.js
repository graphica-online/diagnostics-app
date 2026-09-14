/**
 * test.js — Логика прохождения теста
 * С рандомизацией вопросов и автосейвом порядка
 */

const Test = {
  allQuestions: [],

  // ═══ ИНИЦИАЛИЗАЦИЯ ═══
  init() {
    this.allQuestions = this.buildQuestionOrder();

    if (this.allQuestions.length === 0) {
      this.showEmptyState();
      return;
    }

    // Проверяем автосейв
    const saved = Storage.getTestProgress();
    if (saved && saved.answers && Object.keys(saved.answers).length > 0) {
      App.testState.answers = saved.answers;
      App.testState.currentQuestion = saved.currentQuestion || 0;
    } else {
      App.testState.currentQuestion = 0;
      App.testState.answers = {};
    }

    this.renderQuestion();
    this.bindEvents();
  },

  // ═══ ПОСТРОЕНИЕ ПОРЯДКА ВОПРОСОВ ═══
  buildQuestionOrder() {
    // Если есть сохранённый порядок — восстанавливаем
    const saved = Storage.getTestProgress();
    if (saved && saved.orderIds && saved.orderIds.length > 0) {
      const allById = {};
      [
        ...App.questions.block1,
        ...App.questions.block2,
        ...App.questions.block3,
        ...App.questions.block4,
        ...App.questions.block5,
      ].forEach((q) => {
        allById[q.id] = q;
      });

      const restored = saved.orderIds.map((id) => allById[id]).filter(Boolean);
      if (restored.length > 0) {
        console.log("[Test] Восстановлен сохранённый порядок");
        return restored;
      }
    }

    // Новый порядок
    console.log("[Test] Новый порядок вопросов");
    const b1 = this.smartShuffle([...App.questions.block1]);
    const b2 = this.shuffle([...App.questions.block2]);
    const b3 = [...App.questions.block3];
    const b4 = [...App.questions.block4];
    const b5 = [...App.questions.block5];

    return [...b1, ...b2, ...b3, ...b4, ...b5];
  },

  // ═══ FISHER-YATES SHUFFLE ═══
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  // ═══ УМНЫЙ SHUFFLE (вопросы одного центра не подряд) ═══
  smartShuffle(questions) {
    const shuffled = this.shuffle(questions);
    const result = [];
    const remaining = [...shuffled];
    let lastCenter = null;

    while (remaining.length > 0) {
      let idx = remaining.findIndex((q) => q.center !== lastCenter);
      if (idx === -1) idx = 0;
      const picked = remaining.splice(idx, 1)[0];
      result.push(picked);
      lastCenter = picked.center;
    }

    return result;
  },

  // ═══ ПРИВЯЗКА СОБЫТИЙ ═══
  bindEvents() {
    const btnBack = document.getElementById("test-btn-back");
    const btnNext = document.getElementById("test-btn-next");
    const btnClose = document.getElementById("test-close-btn");

    if (btnBack) btnBack.onclick = () => this.prevQuestion();
    if (btnNext) btnNext.onclick = () => this.nextQuestion();

    // Крестик — сохранить прогресс и выйти
    if (btnClose) {
      btnClose.onclick = () => {
        this.autoSave(); // Сохраняем текущий прогресс
        App.showScreen("home"); // Возвращаемся на главную
        App.updateHomeScreen(); // Обновляем кнопку «Продолжить»
      };
    }
  },

  // ═══ ОПРЕДЕЛЕНИЕ МИРА ═══
  getWorld(centerNum) {
    if ([1, 2, 3, 10, 11].includes(centerNum)) return "nav";
    if ([4, 5, 6, 12, 13].includes(centerNum)) return "yav";
    if ([7, 8, 9].includes(centerNum)) return "slav";
    return "nav";
  },

  // ═══ ОПРЕДЕЛЕНИЕ БЛОКА ═══
  getBlockInfo(index) {
    const b1 = App.questions.block1.length;
    const b2 = App.questions.block2.length;
    const b3 = App.questions.block3.length;
    const b4 = App.questions.block4.length;

    if (index < b1) return { block: 1, type: "scale" };
    if (index < b1 + b2) return { block: 2, type: "scenario" };
    if (index < b1 + b2 + b3) return { block: 3, type: "resource" };
    if (index < b1 + b2 + b3 + b4) return { block: 4, type: "history" };
    return { block: 5, type: "control" };
  },

  // ═══ РЕНДЕРИНГ ВОПРОСА ═══
  renderQuestion() {
    const idx = App.testState.currentQuestion;
    const total = this.allQuestions.length;
    const q = this.allQuestions[idx];
    if (!q) return;

    const info = this.getBlockInfo(idx);

    // Счётчик
    const counter = document.getElementById("test-counter");
    if (counter) counter.textContent = `${idx + 1} / ${total}`;

    // Прогресс-бар
    const fill = document.getElementById("test-progress-fill");
    if (fill) fill.style.width = `${((idx + 1) / total) * 100}%`;

    // Миры — через CSS-класс (надёжнее чем inline-стили)
    const world = this.getWorld(q.center);
    const navEl = document.getElementById("test-world-nav");
    const yavEl = document.getElementById("test-world-yav");
    const slavEl = document.getElementById("test-world-slav");

    // Убираем активность со всех
    [navEl, yavEl, slavEl].forEach((el) => {
      if (el) {
        el.classList.remove("world-active");
        el.style.color = ""; // сброс inline-стилей
      }
    });

    // Ставим активность только на нужный
    if (world === "nav" && navEl) navEl.classList.add("world-active");
    if (world === "yav" && yavEl) yavEl.classList.add("world-active");
    if (world === "slav" && slavEl) slavEl.classList.add("world-active");

    // Мета
    const meta = document.getElementById("test-q-meta");
    const labels = {
      1: "Самооценка",
      2: "Сценарий",
      3: "Ресурс",
      4: "История",
      5: "Проверка",
    };
    if (meta)
      meta.textContent = `${labels[info.block]} · ${idx + 1} / ${total}`;

    // Бейдж центра
    const badge = document.getElementById("test-q-center-badge");
    if (badge) {
      badge.innerHTML = `
        <div class="w-2 h-2 rounded-full" style="background:${q.color};box-shadow:0 0 6px ${q.color}80;"></div>
        <span class="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-white/20">${App.escapeHtml(q.name)}</span>
      `;
    }

    // Текст
    const textEl = document.getElementById("test-q-text");
    if (textEl) textEl.textContent = q.text;

    // Варианты
    const optionsEl = document.getElementById("test-q-options");
    if (!optionsEl) return;

    const currentAnswer = App.testState.answers[q.id];

    if (info.type === "scenario" || info.type === "history") {
      this.renderChoiceOptions(optionsEl, q, currentAnswer);
    } else {
      this.renderScaleOptions(optionsEl, q, currentAnswer);
    }

    this.updateNavButtons(idx, total, currentAnswer);
  },

  // ═══ ШКАЛА 0-3 ═══
  renderScaleOptions(container, q, currentAnswer) {
    const labels = ["Никогда", "Иногда", "Часто", "Всегда"];
    let html = '<div class="grid grid-cols-4 gap-2 pt-1">';

    for (let i = 0; i <= 3; i++) {
      const sel = currentAnswer === i;
      const cls = sel
        ? "bg-holo/[0.08] border-holo/40"
        : "bg-white/[0.03] border-transparent hover:border-white/[0.08] hover:bg-white/[0.05]";
      const shadow = sel
        ? "box-shadow:inset 0 0 18px rgba(123,97,255,0.10), 0 0 12px rgba(123,97,255,0.08);"
        : "";
      const nc = sel ? "text-white" : "text-white/40";
      const lc = sel ? "text-holo" : "text-white/15";

      html += `
        <button class="test-option group py-4 rounded-2xl border transition-all text-center active:scale-[0.95] ${cls}"
                style="${shadow}" data-value="${i}">
          <div class="font-sora font-extralight text-[24px] ${nc} leading-none">${i}</div>
          <div class="font-mono text-[8px] font-bold ${lc} uppercase tracking-[0.15em] mt-2">${labels[i]}</div>
        </button>`;
    }

    html += "</div>";
    container.innerHTML = html;

    container.querySelectorAll(".test-option").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.selectAnswer(q.id, parseInt(btn.dataset.value)),
      );
    });
  },

  // ═══ ВЫБОР А/Б/В(/Г) ═══
  renderChoiceOptions(container, q, currentAnswer) {
    if (!q.options || !q.options.length) {
      container.innerHTML =
        '<p class="text-white/30 text-sm py-4">Варианты не загружены</p>';
      return;
    }

    let html = '<div class="space-y-2 pt-1">';

    q.options.forEach((opt) => {
      const sel = currentAnswer === opt.key;
      const cls = sel
        ? "bg-holo/[0.06] border-holo/30"
        : "bg-white/[0.03] border-transparent hover:border-white/[0.08] hover:bg-white/[0.05]";
      const shadow = sel
        ? "box-shadow:inset 0 0 20px rgba(123,97,255,0.08), 0 0 12px rgba(123,97,255,0.06);"
        : "";
      const bc = sel
        ? "bg-holo text-white"
        : "bg-white/[0.04] border border-white/[0.08] text-white/25 group-hover:text-white/50";
      const bs = sel ? "box-shadow:0 0 14px rgba(123,97,255,0.45);" : "";
      const tc = sel
        ? "text-white/90 font-medium"
        : "text-white/40 group-hover:text-white/60";

      html += `
        <button class="test-option w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 group active:scale-[0.99] ${cls}"
                style="${shadow}" data-value="${opt.key}">
          <span class="w-7 h-7 rounded-xl font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${bc}" style="${bs}">${opt.key.toUpperCase()}</span>
          <span class="text-[13px] font-light ${tc} tracking-[-0.03em] leading-[1.6] transition-colors">${App.escapeHtml(opt.text)}</span>
        </button>`;
    });

    html += "</div>";
    container.innerHTML = html;

    container.querySelectorAll(".test-option").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.selectAnswer(q.id, btn.dataset.value),
      );
    });
  },

  // ═══ ВЫБОР ОТВЕТА ═══
  selectAnswer(questionId, value) {
    App.testState.answers[questionId] = value;
    this.renderQuestion();
    this.autoSave();

    const idx = App.testState.currentQuestion;
    if (idx < this.allQuestions.length - 1) {
      setTimeout(() => this.nextQuestion(), 300);
    }
  },

  // ═══ НАВИГАЦИЯ ═══
  nextQuestion() {
    const idx = App.testState.currentQuestion;
    const total = this.allQuestions.length;
    const q = this.allQuestions[idx];

    if (App.testState.answers[q.id] === undefined) return;

    if (idx < total - 1) {
      App.testState.currentQuestion = idx + 1;
      this.renderQuestion();
      this.autoSave();
      window.scrollTo(0, 0);
    } else {
      this.finishTest();
    }
  },

  prevQuestion() {
    const idx = App.testState.currentQuestion;
    if (idx > 0) {
      App.testState.currentQuestion = idx - 1;
      this.renderQuestion();
      window.scrollTo(0, 0);
    } else {
      App.showScreen("home");
    }
  },

  // ═══ КНОПКИ НАВИГАЦИИ ═══
  updateNavButtons(idx, total, currentAnswer) {
    const btnBack = document.getElementById("test-btn-back");
    const btnNext = document.getElementById("test-btn-next");

    if (btnBack) {
      const label = idx === 0 ? "Выход" : "Назад";
      btnBack.innerHTML = `
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
        ${label}`;
    }

    if (btnNext) {
      const isLast = idx === total - 1;
      const hasAnswer = currentAnswer !== undefined;
      const label = isLast ? "Завершить" : "Далее";
      const icon = isLast
        ? "M4.5 12.75l6 6 9-13.5"
        : "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3";

      btnNext.innerHTML = `
        ${label}
        <svg class="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${icon}"/></svg>`;

      if (hasAnswer) {
        btnNext.classList.remove("opacity-50", "pointer-events-none");
      } else {
        btnNext.classList.add("opacity-50", "pointer-events-none");
      }
    }
  },

  // ═══ АВТОСЕЙВ ═══
  autoSave() {
    Storage.saveTestProgress({
      currentQuestion: App.testState.currentQuestion,
      answers: App.testState.answers,
      orderIds: this.allQuestions.map((q) => q.id),
    });
  },

  // ═══ ЗАВЕРШЕНИЕ ТЕСТА ═══
  finishTest() {
    console.log(
      "[Test] Тест завершён. Ответов:",
      Object.keys(App.testState.answers).length,
    );

    if (typeof Scoring !== "undefined") {
      const result = Scoring.calculate(
        App.testState.answers,
        this.allQuestions,
      );
      Storage.saveTestResult(result);

      if (typeof VK !== "undefined") {
        VK.scheduleAllPushes();
      }

      Storage.clearTestProgress();
      Storage.clearQuestionOrder();

      if (typeof Result !== "undefined") {
        Result.render(result);
      }

      App.showScreen("result");
      App.updateHomeScreen();
    } else {
      alert(
        "Тест завершён! Подсчёт результатов будет доступен после подключения scoring.js",
      );
      Storage.clearTestProgress();
      Storage.clearQuestionOrder();
      App.showScreen("home");
    }
  },

  // ═══ ПУСТОЕ СОСТОЯНИЕ ═══
  showEmptyState() {
    const textEl = document.getElementById("test-q-text");
    const optionsEl = document.getElementById("test-q-options");
    if (textEl)
      textEl.textContent = "Вопросы не загружены. Проверьте папку data/.";
    if (optionsEl) optionsEl.innerHTML = "";
  },

  // ═══ СБРОС ТЕСТА ═══
  reset() {
    App.testState.currentQuestion = 0;
    App.testState.answers = {};
    Storage.clearTestProgress();
    Storage.clearQuestionOrder();
    this.init();
  },
};
