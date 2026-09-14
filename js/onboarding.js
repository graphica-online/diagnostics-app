/**
 * onboarding.js — Многошаговый онбординг
 */

const Onboarding = {
  currentSlide: 0,

  slides: [
    {
      icon: "🌌",
      step: "Шаг 1 из 5",
      title: "Добро пожаловать",
      text: "Этот тест покажет, как работает ваша энергетическая система — от корней до кроны, от тела до смысла.",
    },
    {
      icon: "📋",
      step: "Шаг 2 из 5",
      title: "Как это работает",
      text: "127 вопросов, примерно 20 минут. Пять блоков: самооценка, сценарии, ресурс, история и контроль. Честные ответы = точный результат.",
    },
    {
      icon: "⚕️",
      step: "Шаг 3 из 5",
      title: "Важная оговорка",
      text: "Это инструмент самопознания, а не медицинская или психиатрическая диагностика. Результаты носят рекомендательный характер.",
    },
    {
      icon: "🚩",
      step: "Шаг 4 из 5",
      title: "Когда стоит остановиться",
      text: "Если вы переживаете острый кризис, суицидальные мысли или панические атаки — обратитесь к специалисту. Тест можно пройти позже.",
    },
    {
      icon: "🔒",
      step: "Шаг 5 из 5",
      title: "Конфиденциальность",
      text: "Ваши данные хранятся только на вашем устройстве и не передаются третьим лицам. Вы можете удалить историю в любой момент.",
    },
  ],

  init() {
    this.currentSlide = 0;
    this.render();
  },

  render() {
    const container = document.getElementById("onboarding-content");
    if (!container) return;

    const slide = this.slides[this.currentSlide];
    const total = this.slides.length;
    const isLast = this.currentSlide === total - 1;

    let dotsHtml = "";
    for (let i = 0; i < total; i++) {
      if (i === this.currentSlide) {
        dotsHtml +=
          '<div class="w-6 h-1 rounded-full bg-holo" style="box-shadow: 0 0 6px rgba(123,97,255,0.5);"></div>';
      } else {
        dotsHtml += '<div class="w-1 h-1 rounded-full bg-white/20"></div>';
      }
    }

    const iconPath = isLast
      ? "M4.5 12.75l6 6 9-13.5"
      : "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3";

    const skipBtnHtml = !isLast
      ? '<button class="w-full py-2 text-[13px] font-medium text-white/40 hover:text-white/70 transition-colors" id="onboarding-skip-btn">Пропустить онбординг</button>'
      : "";

    container.innerHTML = `
      <div class="w-28 h-28 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center relative overflow-hidden">
        <div class="text-5xl opacity-70">${slide.icon}</div>
        <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(circle at center, transparent 30%, rgba(123,97,255,0.08) 100%);"></div>
      </div>

      <div class="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-holo/80">
        ${slide.step}
      </div>

      <div class="space-y-3">
        <h2 class="text-[26px] font-bold tracking-[-0.03em] text-white leading-tight">
          ${slide.title}
        </h2>
        <p class="text-[14px] font-light text-white/60 tracking-[-0.03em] leading-[1.7] max-w-[280px] mx-auto">
          ${slide.text}
        </p>
      </div>

      <div class="flex items-center gap-2 pt-2">
        ${dotsHtml}
      </div>

      <div class="w-full space-y-3 pt-2">
        <button class="btn-holo w-full py-4 rounded-2xl font-semibold text-[15px] tracking-[-0.02em] flex items-center justify-center gap-2" id="onboarding-next-btn">
          ${isLast ? "Начать тест" : "Далее"}
          <svg class="w-4 h-4 opacity-70" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="${iconPath}"/>
          </svg>
        </button>
        ${skipBtnHtml}
      </div>
    `;

    const nextBtn = document.getElementById("onboarding-next-btn");
    if (nextBtn) {
      nextBtn.onclick = () => {
        if (isLast) {
          this.finish();
        } else {
          this.next();
        }
      };
    }

    const skipBtn = document.getElementById("onboarding-skip-btn");
    if (skipBtn) {
      skipBtn.onclick = () => this.finish();
    }
  },

  next() {
    if (this.currentSlide < this.slides.length - 1) {
      this.currentSlide++;
      this.render();
    }
  },

  finish() {
    Storage.setOnboardingDone();
    App.showScreen("home");
  },

  reset() {
    Storage.remove("onboardingDone");
    this.currentSlide = 0;
    App.showScreen("onboarding");
  },
};
