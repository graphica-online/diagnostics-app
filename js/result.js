/**
 * result.js — Рендеринг экрана результата
 * Использует тексты из App.texts (загружаются в app.js)
 * Все сырые данные из JSON экранируются через App.escapeHtml для безопасности (XSS)
 */

const Result = {
  render(result) {
    if (!result) return;

    this.renderSchema(result);
    this.renderCenters(result);
    this.renderChild(result);
    this.renderPattern(result);
    this.renderAdvice(result);
  },

  // ═══════════════════════════════════════════
  // СХЕМА ЦЕНТРОВ
  // ═══════════════════════════════════════════
  renderSchema(result) {
    const container = document.getElementById("result-schema-content");
    if (!container) return;

    const c = result.centers;

    // Порядок: Славь (сверху) → Явь → Навь → Периферия
    const worlds = [
      { name: "Славь", avg: result.worlds.slav, centers: [9, 8, 7] },
      { name: "Явь", avg: result.worlds.yav, centers: [6, 4, 5] },
      { name: "Навь", avg: result.worlds.nav, centers: [3, 2, 1] },
    ];

    let html = `
      <div class="text-center pb-4" style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <p class="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-holo/60 mb-2">Общий баланс системы</p>
        <div class="flex items-baseline justify-center gap-1">
          <span class="text-[56px] font-extralight tracking-[-0.04em] leading-none text-white/85">${result.overallHealth}</span>
          <span class="text-[20px] font-extralight text-white/25">%</span>
        </div>
      </div>
    `;

    // Три мира
    worlds.forEach((world) => {
      html += `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-4 h-px bg-white/20"></span>
              <span class="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">${world.name}</span>
            </div>
            <span class="font-mono text-[10px] font-bold text-white/40">${world.avg}%</span>
          </div>
      `;

      world.centers.forEach((cNum) => {
        const center = c[cNum];
        const fillSize = Math.round(40 * (center.health / 100)); // Число, безопасно
        const isPriority = center.health <= 50 && center.isMain;

        html += `
          <div class="flex items-center gap-4">
            <div class="ch-circle w-10 h-10 flex-shrink-0">
              <div class="ch-ring" style="border-color: ${center.color};"></div>
              <div class="ch-fill" style="width: ${fillSize}px; height: ${fillSize}px; background: ${center.color}; box-shadow: 0 0 12px ${center.color}70;"></div>
            </div>
            <div class="flex-1 flex items-center justify-between gap-3">
              <div>
                <div class="font-semibold text-[13px] ${isPriority ? "text-white" : "text-white/80"} tracking-[-0.02em] flex items-center gap-1.5">
                  ${App.escapeHtml(center.name)}
                  ${isPriority ? '<span class="font-mono text-[8px] font-bold uppercase tracking-widest text-st-neg px-1.5 py-0.5 rounded-full bg-st-neg/10 border border-st-neg/20">приоритет</span>' : ""}
                </div>
                <div class="font-mono text-[9px] font-bold text-white/25 uppercase tracking-[0.1em]">${center.total}/${center.max}</div>
              </div>
              <span class="font-mono text-[11px] font-bold" style="color: ${center.color};">${center.health}%</span>
            </div>
          </div>
        `;
      });

      html += "</div>";
    });

    // Периферия
    html += `
      <div class="space-y-3 pt-3" style="border-top: 1px solid rgba(255,255,255,0.05);">
        <div class="flex items-center gap-2">
          <span class="w-4 h-px bg-white/10"></span>
          <span class="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Периферия</span>
        </div>
        <div class="grid grid-cols-4 gap-3">
    `;

    [10, 11, 12, 13].forEach((cNum) => {
      const center = c[cNum];
      const fillSize = Math.round(32 * (center.health / 100)); // Число, безопасно

      html += `
        <div class="flex flex-col items-center gap-1.5">
          <div class="ch-circle w-8 h-8">
            <div class="ch-ring" style="border-color: ${center.color}; opacity: 0.35;"></div>
            <div class="ch-fill" style="width: ${fillSize}px; height: ${fillSize}px; background: ${center.color}; opacity: 0.85; box-shadow: 0 0 8px ${center.color}55;"></div>
          </div>
          <div class="text-center">
            <div class="font-mono text-[8px] font-bold text-white/50 uppercase tracking-[0.1em]">${App.escapeHtml(center.name)}</div>
            <div class="font-mono text-[8px] font-bold text-white/25">${center.health}%</div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
      <div class="pt-3 flex items-center justify-center gap-4" style="border-top: 1px solid rgba(255,255,255,0.05);">
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full bg-white/20"></div>
          <span class="font-mono text-[8px] font-bold uppercase tracking-widest text-white/25">Пусто</span>
        </div>
        <span class="w-6 h-px bg-white/10"></span>
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full bg-white/60"></div>
          <span class="font-mono text-[8px] font-bold uppercase tracking-widest text-white/40">Заполнено</span>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  // ═══════════════════════════════════════════
  // КАРТОЧКИ ЦЕНТРОВ
  // ═══════════════════════════════════════════
  renderCenters(result) {
    const container = document.getElementById("result-centers-list");
    if (!container) return;

    const c = result.centers;

    // Сортируем: худшие первыми (только основные 1-9)
    const sorted = Object.entries(c)
      .filter(([k, v]) => v.isMain)
      .sort((a, b) => a[1].health - b[1].health);

    let html = "";

    sorted.forEach(([cNum, center], idx) => {
      const num = parseInt(cNum);
      const fillSize = Math.round(56 * (center.health / 100)); // Число, безопасно
      const isExpanded = idx === 0; // Первый (худший) — развёрнут
      const isPriority = center.health <= 50;

      // Получаем текст описания из матрицы
      let centerText = "Описание не загружено";
      if (App.texts && App.texts.centers && App.texts.centers[num]) {
        const textsForCenter = App.texts.centers[num];
        if (center.health >= 80) {
          centerText = textsForCenter.balance;
        } else if (center.deficit >= center.excess) {
          centerText = textsForCenter.deficit;
        } else {
          centerText = textsForCenter.excess;
        }
      }

      if (isExpanded) {
        html += `
          <div class="glass rounded-3xl p-6 relative overflow-hidden">
            <div class="absolute -top-16 -right-16 w-40 h-40 rounded-full pointer-events-none" style="background: ${center.color}18; filter: blur(60px);"></div>
            <div class="relative">
              <div class="flex items-start justify-between mb-5">
                <div class="flex items-center gap-4">
                  <div class="ch-circle w-14 h-14">
                    <div class="ch-ring" style="border-color: ${center.color};"></div>
                    <div class="ch-fill" style="width: ${fillSize}px; height: ${fillSize}px; background: ${center.color}; box-shadow: 0 0 14px ${center.color}80;"></div>
                  </div>
                  <div>
                    <h3 class="font-semibold text-[17px] tracking-[-0.02em] text-white">${App.escapeHtml(center.name)}</h3>
                    <p class="font-mono text-[9px] font-bold uppercase tracking-[0.15em]" style="color: ${center.color};">Центр ${num}</p>
                  </div>
                </div>
                ${isPriority ? '<span class="font-mono text-[8px] font-bold uppercase tracking-widest text-st-neg px-2 py-1 rounded-full bg-st-neg/[0.08] border border-st-neg/20">приоритет</span>' : ""}
              </div>

              <div class="mb-4">
                <div class="flex items-baseline gap-1 mb-1">
                  <span class="text-[48px] font-extralight tracking-[-0.04em] leading-none" style="color: ${center.color};">${center.health}</span>
                  <span class="text-[18px] font-extralight text-white/25">%</span>
                  <span class="ml-auto font-mono text-[10px] font-bold text-white/30 uppercase tracking-widest">здоровье</span>
                </div>
              </div>

              <div class="mb-4">
                <div class="h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                  <div class="h-full rounded-full" style="width: ${center.health}%; background: ${center.color}; box-shadow: 0 0 8px ${center.color}80;"></div>
                </div>
              </div>

              <p class="text-[13px] font-light text-white/60 tracking-[-0.03em] leading-[1.7] mb-4">
                ${App.escapeHtml(centerText)}
              </p>

              <div class="grid grid-cols-2 gap-2 pt-4" style="border-top: 1px solid rgba(255,255,255,0.05);">
                <div class="bg-white/[0.02] border border-white/[0.05] rounded-2xl px-4 py-3">
                  <div class="font-mono text-[8px] font-bold text-white/25 uppercase tracking-[0.15em] mb-1">Недобор</div>
                  <div class="flex items-baseline gap-1">
                    <span class="font-mono text-[16px] font-bold ${center.deficit >= 5 ? "text-st-neg" : "text-white/70"}">${center.deficit}</span>
                    <span class="font-mono text-[10px] text-white/25">/ 9</span>
                  </div>
                </div>
                <div class="bg-white/[0.02] border border-white/[0.05] rounded-2xl px-4 py-3">
                  <div class="font-mono text-[8px] font-bold text-white/25 uppercase tracking-[0.15em] mb-1">Перебор</div>
                  <div class="flex items-baseline gap-1">
                    <span class="font-mono text-[16px] font-bold text-white/70">${center.excess}</span>
                    <span class="font-mono text-[10px] text-white/25">/ 9</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        const smallFill = Math.round(40 * (center.health / 100)); // Число, безопасно
        html += `
          <div class="glass rounded-3xl px-5 py-4 flex items-center justify-between hover:border-white/[0.12] transition-all cursor-pointer group">
            <div class="flex items-center gap-4">
              <div class="ch-circle w-10 h-10">
                <div class="ch-ring" style="border-color: ${center.color};"></div>
                <div class="ch-fill" style="width: ${smallFill}px; height: ${smallFill}px; background: ${center.color}; box-shadow: 0 0 10px ${center.color}65;"></div>
              </div>
              <div>
                <div class="font-semibold text-[14px] text-white/80 tracking-[-0.02em]">${App.escapeHtml(center.name)}</div>
                <div class="font-mono text-[9px] font-bold text-white/25 uppercase tracking-[0.1em]">${center.total}/${center.max}</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-mono text-[13px] font-bold" style="color: ${center.color};">${center.health}%</span>
              
            </div>
          </div>
        `;
      }
    });

    container.innerHTML = html;
  },

  // ═══════════════════════════════════════════
  // ВНУТРЕННИЙ РЕБЁНОК
  // ═══════════════════════════════════════════
  renderChild(result) {
    const container = document.getElementById("result-child-content");
    if (!container) return;

    if (!result.child || result.child.isNone) {
      container.innerHTML = `
        <div class="glass rounded-3xl p-6 text-center">
          <p class="text-[14px] font-light text-white/50 py-8">У вас нет выраженного «застрявшего» внутреннего ребёнка. Все центры в относительном балансе.</p>
        </div>
      `;
      return;
    }

    const child = result.child;
    const centerColor = Scoring.CENTER_COLORS[child.center];

    // Заглушка эмодзи
    const settings = Storage.getSettings();
    const gender = settings.gender || "male";
    let emoji = "👦";
    if (child.age === "0-3") emoji = "👶";
    else if (child.age === "3-10") emoji = gender === "female" ? "👧" : "👦";
    else if (child.age === "10-15" || child.age === "14-17")
      emoji = gender === "female" ? "👩" : "🧑";
    else emoji = gender === "female" ? "👧" : "👦";

    // Получаем описание ребёнка из матрицы
    let childText = "Описание не загружено";
    if (App.texts && App.texts.child && App.texts.child[child.center]) {
      const childTexts = App.texts.child[child.center];
      childText = child.isAcquired ? childTexts.acquired : childTexts.early;
    }

    // Рекомендация сказки
    let fairytaleHtml = "";
    const showFairytale = settings.showFairytaleCTA;
    if (showFairytale && App.texts && App.texts.fairytales) {
      let fKey = child.center.toString();
      if ([1, 4, 9].includes(child.center)) {
        fKey += child.isAcquired ? "_acquired" : "_early";
      }
      const fData = App.texts.fairytales[fKey];
      if (fData) {
        // Каждую строковую переменную внутри сборного HTML экранируем отдельно!
        fairytaleHtml = `
          <div class="p-4 rounded-2xl bg-black/25 border border-white/[0.06] flex items-center justify-between hover:border-white/[0.12] transition-all cursor-pointer group" onclick="window.open('https://vk.com/kasha_na_noch', '_blank')">
            <div class="flex items-center gap-3">
              <span class="text-xl">📖</span>
              <div class="text-left">
                <div class="font-semibold text-[13px] tracking-[-0.02em] group-hover:text-white transition-colors">Полка «${App.escapeHtml(fData.shelf)}» (${App.escapeHtml(fData.age)})</div>
                <div class="font-mono text-[9px] font-bold text-white/30 uppercase tracking-[0.1em] mt-0.5">Сказка для этого ребёнка</div>
              </div>
            </div>
            <svg class="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
          </div>
        `;
      }
    }

    container.innerHTML = `
      <div class="glass holo-shimmer rounded-3xl p-6 relative overflow-hidden">
        <div class="absolute -bottom-20 -left-20 w-56 h-56 rounded-full pointer-events-none" style="background: ${centerColor}12; filter: blur(80px);"></div>
        <div class="relative space-y-5">
          <div class="flex items-center gap-2">
            <span class="w-4 h-px" style="background: ${centerColor}66;"></span>
            <span class="font-mono text-[9px] font-bold uppercase tracking-[0.2em]" style="color: ${centerColor}bb;">Твой внутренний ребёнок</span>
          </div>

          <div class="flex items-start gap-4">
            <div class="w-24 h-24 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
              <div class="text-4xl opacity-60">${emoji}</div>
            </div>
            <div class="flex-1 pt-1">
              <div class="mb-2">
                <div class="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">Возраст</div>
                <div class="flex items-baseline gap-1">
                  <span class="text-[24px] font-extralight tracking-[-0.04em] leading-none text-white/85">${App.escapeHtml(child.ageLabel)}</span>
                </div>
              </div>
              <p class="text-[13px] font-light text-white/60 tracking-[-0.02em]">${child.isAcquired ? "Приобретённый паттерн" : "Застрявший ребёнок"} · ${App.escapeHtml(child.centerName)}</p>
            </div>
          </div>

          <div class="pt-4" style="border-top: 1px solid rgba(255,255,255,0.05);">
            <p class="text-[13px] font-light text-white/70 tracking-[-0.03em] leading-[1.75]">
              ${App.escapeHtml(childText)}
            </p>
          </div>

          <div class="flex gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
            <div class="flex-shrink-0 mt-0.5">
              <svg class="w-4 h-4 text-holo/60" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/></svg>
            </div>
            <p class="text-[11px] font-light text-white/40 tracking-[-0.02em] leading-[1.6]">Это метафора, а не диагноз. Если образ вызывает сильные чувства — это нормально.</p>
          </div>

          ${fairytaleHtml} 
        </div>
      </div>
    `;
  },

  // ═══════════════════════════════════════════
  // ПАТТЕРН
  // ═══════════════════════════════════════════
  renderPattern(result) {
    const container = document.getElementById("result-pattern-content");
    if (!container) return;

    if (!result.pattern) {
      container.innerHTML = `
        <div class="glass rounded-3xl p-6 text-center">
          <p class="text-[14px] font-light text-white/50 py-8">Выраженного компенсаторного паттерна не обнаружено. Ваши центры работают относительно сбалансированно.</p>
        </div>
      `;
      return;
    }

    const p = result.pattern;

    // Ищем текст паттерна в матрице
    let patternText = "";
    if (App.texts && App.texts.patterns) {
      patternText = App.texts.patterns[p.name] || "";
    }

    // Если текст не найден (индивидуальный паттерн) — генерируем динамически
    if (!patternText && p.centers && p.centers.length >= 2) {
      const c1 = p.centers[0];
      const c2 = p.centers[1];
      const center1Data = result.centers[c1.num];
      const center2Data = result.centers[c2.num];

      const state1 =
        center1Data.deficit > center1Data.excess ? "недобор" : "перебор";
      const state2 =
        center2Data.deficit > center2Data.excess ? "недобор" : "перебор";

      patternText =
        "Ваша система компенсирует " +
        state1 +
        " в центре «" +
        c1.name +
        "» (" +
        center1Data.health +
        "%) " +
        state2 +
        "ом в центре «" +
        c2.name +
        "» (" +
        center2Data.health +
        "%). " +
        "Это не поломка — это адаптация, которая когда-то помогла вам выжить. " +
        "Начните работу с того центра, который показывает " +
        state1 +
        ", — мягко, без форсирования, давая ему разрешение работать.";
    }

    // Финальный fallback
    if (!patternText) {
      patternText =
        "Ваша система компенсирует дисбаланс в одних центрах перегрузкой других. Это адаптация, которая когда-то помогла вам выжить. Обратите внимание на центры с наибольшим дисбалансом.";
    }

    let centersHtml = p.centers
      .map(function (cItem) {
        return `
        <div class="flex items-center gap-1.5 px-2 py-1 rounded-full" style="background: ${cItem.color}12; border: 1px solid ${cItem.color}40;">
          <div class="w-1.5 h-1.5 rounded-full" style="background: ${cItem.color};"></div>
          <span class="font-mono text-[9px] font-bold uppercase tracking-[0.1em]" style="color: ${cItem.color};">${App.escapeHtml(cItem.name)}</span>
        </div>
      `;
      })
      .join(
        '<span class="font-mono text-[10px] text-white/20 self-center">×</span>',
      );

    container.innerHTML = `
      <div class="glass rounded-3xl p-6 space-y-5">
        <div class="flex items-center gap-2">
          <span class="w-4 h-px bg-holo/40"></span>
          <span class="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-holo/70">Доминирующий паттерн</span>
        </div>
        <div>
          <h3 class="font-bold text-[20px] tracking-[-0.03em] text-white leading-tight mb-3">«${App.escapeHtml(p.name)}»</h3>
          <div class="flex items-center gap-2 flex-wrap">${centersHtml}</div>
        </div>
        <p class="text-[13px] font-light text-white/60 tracking-[-0.03em] leading-[1.75]">
          ${App.escapeHtml(patternText)}
        </p>
      </div>
    `;
  },

  // ═══════════════════════════════════════════
  // СОВЕТЫ
  // ═══════════════════════════════════════════
  renderAdvice(result) {
    const container = document.getElementById("result-advice-content");
    if (!container) return;

    // Находим худший центр
    let worstNum = 1;
    let worstHealth = 100;
    for (let c = 1; c <= 9; c++) {
      if (result.centers[c].health < worstHealth) {
        worstHealth = result.centers[c].health;
        worstNum = c;
      }
    }

    const worst = result.centers[worstNum];
    const resource = result.resources[worstNum];
    const hasHighResource = resource && resource.score >= 2;

    // Получаем текст рекомендации из матрицы
    let adviceText = "Рекомендация не загружена";
    if (App.texts && App.texts.recommend && App.texts.recommend[worstNum]) {
      const adviceTexts = App.texts.recommend[worstNum];
      adviceText = hasHighResource ? adviceTexts.high : adviceTexts.low;
    }

    container.innerHTML = `
      <div class="glass rounded-3xl p-6 space-y-5">
        <div class="flex items-center gap-2">
          <span class="w-4 h-px bg-st-pos/40"></span>
          <span class="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-st-pos/80">С чего начать</span>
        </div>

        <div>
          <h3 class="font-semibold text-[17px] tracking-[-0.02em] text-white/85 mb-2">
            Работайте с центром «${App.escapeHtml(worst.name)}»
          </h3>
          <p class="font-mono text-[9px] font-bold text-white/30 uppercase tracking-[0.15em]">
            Здоровье: ${worst.health}% · ${hasHighResource ? "Высокий ресурс" : "Низкий ресурс"}
          </p>
        </div>

        <p class="text-[13px] font-light text-white/60 tracking-[-0.03em] leading-[1.75]">
          ${App.escapeHtml(adviceText)}
        </p>

        <a href="https://vk.com/kasha_na_noch" target="_blank" class="inline-flex items-center gap-1.5 text-holo font-medium text-[13px] hover:bg-holo/[0.05] px-3 py-2 -mx-3 rounded-xl transition-all">
          <span>Подробные практики в лонгриде Части 3</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
        </a>
      </div>
    `;
  },

  // ═══════════════════════════════════════════
  // ЯКОРЯ — ПРАВИЛЬНАЯ ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════
  _observer: null,

  initAnchors() {
    // 1. Уничтожаем старый observer, если был
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }

    const sections = document.querySelectorAll(
      '#screen-result section[id^="section-"]',
    );
    const anchors = document.querySelectorAll(".result-anchor");
    if (!sections.length || !anchors.length) return;

    // 2. Привязываем клики на якоря (только если ещё не привязано)
    anchors.forEach((btn) => {
      // Убираем старые обработчики, создавая клон
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById(newBtn.dataset.target);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    // 3. Обновляем ссылки на якоря (после cloneNode они пересоздались)
    const freshAnchors = document.querySelectorAll(".result-anchor");

    // 4. Создаём новый observer
    this._observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            freshAnchors.forEach((a) => {
              if (a.dataset.target === id) {
                a.classList.add("bg-holo", "text-white", "font-semibold");
                a.classList.remove("text-white/40", "font-medium");
                a.style.boxShadow = "0 0 16px rgba(123,97,255,0.35)";
                // Прокручиваем навигацию к активному якорю
                a.scrollIntoView({
                  behavior: "smooth",
                  inline: "center",
                  block: "nearest",
                });
              } else {
                a.classList.remove("bg-holo", "text-white", "font-semibold");
                a.classList.add("text-white/40", "font-medium");
                a.style.boxShadow = "none";
              }
            });
          }
        });
      },
      {
        rootMargin: "-40% 0px -55% 0px",
        threshold: 0,
      },
    );

    sections.forEach((s) => this._observer.observe(s));

    // 5. Активируем первый якорь по умолчанию
    const first = document.querySelector(".result-anchor");
    if (first) {
      first.classList.add("bg-holo", "text-white", "font-semibold");
      first.classList.remove("text-white/40", "font-medium");
      first.style.boxShadow = "0 0 16px rgba(123,97,255,0.35)";
    }
  },
};
