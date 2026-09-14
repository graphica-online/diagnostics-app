/**
 * chronology.js — Хронология тестов и визуализация динамики
 */

const Chronology = {
  render() {
    const container = document.getElementById("history-list");
    if (!container) return;

    let history = Storage.getTestHistory();

    if (!history || history.length === 0) {
      container.innerHTML = `
        <div class="glass rounded-3xl p-6 text-center">
          <div class="text-4xl mb-4 opacity-50">📈</div>
          <p class="text-[14px] font-light text-white/40 tracking-[-0.03em] leading-[1.7]">
            Здесь появится хронология ваших тестов. Пройдите первый тест, чтобы начать отслеживать динамику.
          </p>
        </div>
      `;
      return;
    }

    // Автоудаление старых тестов (лимит 30)
    if (history.length > 30) {
      const removed = history.length - 30;
      history = history.slice(0, 30);
      Storage.deleteOldTests(history);
      console.log("[Chronology] Удалено старых тестов: " + removed);
    }

    let html = "";

    if (history.length >= 2) {
      html += this.renderChart(history);
    }

    html += this.renderList(history);
    container.innerHTML = html;
    this.bindDeleteButtons(container);
  },

  renderChart(history) {
    const data = history.slice(0, 10).reverse();
    if (data.length < 2) return "";

    const maxH = 100;
    const minH = 0;
    const chartH = 140;
    const chartW = 100;

    const points = data
      .map(function (d, i) {
        const x = (i / (data.length - 1)) * chartW;
        const y =
          chartH -
          ((d.overallHealth - minH) / (maxH - minH)) * (chartH - 20) -
          10;
        return x + "," + y;
      })
      .join(" ");

    // HTML-точки + подписи процентов
    const dotsHtml = data
      .map(function (d, i) {
        const x = (i / (data.length - 1)) * 100;
        const y =
          chartH -
          ((d.overallHealth - minH) / (maxH - minH)) * (chartH - 20) -
          10;
        const health = d.overallHealth || 0;
        const color =
          health >= 75 ? "#4ADE80" : health >= 50 ? "#EAB308" : "#FB7185";

        return `
        <div class="absolute flex flex-col items-center" style="left: ${x}%; top: ${y - 22}px; transform: translateX(-50%); z-index: 5;">
          <span class="font-mono text-[9px] font-bold mb-1" style="color: ${color};">${health}%</span>
          <div class="w-2.5 h-2.5 rounded-full border border-void" style="background: ${color}; box-shadow: 0 0 8px ${color}80;"></div>
        </div>
      `;
      })
      .join("");

    const firstDate = new Date(data[0].date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
    const lastDate = new Date(data[data.length - 1].date).toLocaleDateString(
      "ru-RU",
      { day: "numeric", month: "short" },
    );

    return `
      <div class="glass rounded-3xl p-5 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-4 h-px bg-holo/40"></span>
            <span class="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-holo/70">Динамика</span>
          </div>
          <span class="font-mono text-[9px] text-white/30">Последние ${data.length} тестов</span>
        </div>

        <div class="relative overflow-visible" style="height: ${chartH}px; margin-left: 8px; margin-right: 8px;">
          <svg width="100%" height="${chartH}" viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="none" style="overflow: visible; display: block;">
            <line x1="0" y1="${(chartH - 20) * 0.25 + 10}" x2="${chartW}" y2="${(chartH - 20) * 0.25 + 10}" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
            <line x1="0" y1="${(chartH - 20) * 0.5 + 10}" x2="${chartW}" y2="${(chartH - 20) * 0.5 + 10}" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
            <line x1="0" y1="${(chartH - 20) * 0.75 + 10}" x2="${chartW}" y2="${(chartH - 20) * 0.75 + 10}" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>

            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#7B61FF"/>
                <stop offset="100%" stop-color="#7B61FF" stop-opacity="0"/>
              </linearGradient>
            </defs>

            <polyline points="0,${chartH - 10} ${points} ${chartW},${chartH - 10}" fill="url(#chartGradient)" opacity="0.10"/>
            <polyline points="${points}" fill="none" stroke="#7B61FF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
          </svg>

          ${dotsHtml}
        </div>

        <div class="flex justify-between font-mono text-[9px] text-white/25">
          <span>${firstDate}</span>
          <span>${lastDate}</span>
        </div>
      </div>
    `;
  },

  renderList(history) {
    const self = this;
    let html = `
      <div class="space-y-3 mt-6">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="w-4 h-px bg-holo/40"></span>
            <span class="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-holo/70">Все тесты (${history.length})</span>
          </div>
          <span class="font-mono text-[9px] text-white/20">Макс. 30</span>
        </div>
    `;

    history.forEach(function (test, idx) {
      html += self.renderTestCard(test, idx, history);
    });

    html += "</div>";
    return html;
  },

  renderTestCard(test, idx, history) {
    const date = new Date(test.date);
    const dateStr = date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeStr = date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const health = test.overallHealth || "—";
    const isLast = idx === 0;

    // Тренд
    let trendHtml = "";
    if (idx < history.length - 1) {
      const prev = history[idx + 1];
      const diff = (test.overallHealth || 0) - (prev.overallHealth || 0);
      if (diff > 0) {
        trendHtml =
          '<span class="font-mono text-[10px] font-bold text-st-pos">+' +
          diff +
          "%</span>";
      } else if (diff < 0) {
        trendHtml =
          '<span class="font-mono text-[10px] font-bold text-st-neg">' +
          diff +
          "%</span>";
      } else {
        trendHtml =
          '<span class="font-mono text-[10px] font-bold text-white/30">0%</span>';
      }
    }

    // Сводка
    const s = test.summary || {};
    const esc =
      typeof App !== "undefined" && App.escapeHtml
        ? App.escapeHtml
        : function (x) {
            return x || "";
          };

    const chips = [];
    if (s.worstCenter && s.worstCenter !== "?") {
      chips.push(
        '<span class="font-mono text-[10px] text-st-neg/80">' +
          esc(s.worstCenter) +
          " " +
          s.worstHealth +
          "%</span>",
      );
    }
    if (s.pattern) {
      chips.push(
        '<span class="font-mono text-[10px] text-white/40">«' +
          esc(s.pattern) +
          "»</span>",
      );
    }
    if (s.childAge) {
      chips.push(
        '<span class="font-mono text-[10px] text-holo/70">👤 ' +
          esc(s.childAge) +
          "</span>",
      );
    }
    const summaryHtml =
      chips.length > 0
        ? '<div class="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">' +
          chips.join("") +
          "</div>"
        : "";

    // Мини-схема 9 центров (если есть данные)
    let miniSchemaHtml = "";
    if (test.centersMini) {
      const colors = [
        "#EF4444",
        "#F97316",
        "#EAB308",
        "#22C55E",
        "#EC4899",
        "#A855F7",
        "#38BDF8",
        "#2563EB",
        "#8B5CF6",
      ];
      let dots = "";
      for (let i = 0; i < 9; i++) {
        const h = test.centersMini[i] || 50;
        const c = h >= 75 ? "#4ADE80" : h >= 50 ? "#EAB308" : "#FB7185";
        dots +=
          '<div class="w-1.5 h-1.5 rounded-full" style="background:' +
          c +
          ";box-shadow:0 0 3px " +
          c +
          '60;"></div>';
      }
      miniSchemaHtml = '<div class="flex gap-1 mt-1.5">' + dots + "</div>";
    }

    return `
      <div class="glass rounded-2xl px-5 py-4 flex items-center justify-between gap-3 ${isLast ? "border-holo/20" : ""}">
        <div class="flex items-center gap-4 flex-1 min-w-0">
          <div class="text-center min-w-[40px] flex-shrink-0">
            <div class="font-sora text-[20px] font-extralight ${isLast ? "text-white" : "text-white/60"} leading-none">${health}</div>
            <div class="font-mono text-[8px] font-bold text-white/25 uppercase mt-1">%</div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-[13px] ${isLast ? "text-white" : "text-white/70"} tracking-[-0.02em]">
              ${isLast ? "Последний тест" : "Тест"}
            </div>
            <div class="font-mono text-[10px] text-white/30 mt-0.5">${dateStr} · ${timeStr}</div>
            ${summaryHtml}
            ${miniSchemaHtml}
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          ${trendHtml}
          <button class="chronology-delete w-8 h-8 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/20 hover:text-st-neg hover:border-st-neg/30 transition-all"
                  data-id="${test.id}" title="Удалить">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  },

  bindDeleteButtons(container) {
    const self = this;
    container.querySelectorAll(".chronology-delete").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const id = btn.dataset.id;

        if (typeof App !== "undefined" && App.showConfirm) {
          App.showConfirm({
            title: "Удалить тест?",
            message: "Этот результат будет удалён из истории безвозвратно.",
            confirmText: "Удалить",
            cancelText: "Отмена",
            onConfirm: function () {
              Storage.deleteTest(id);
              self.render();
              if (App.updateHomeScreen) App.updateHomeScreen();
            },
          });
        } else {
          if (confirm("Удалить этот тест из истории?")) {
            Storage.deleteTest(id);
            self.render();
            if (typeof App !== "undefined" && App.updateHomeScreen)
              App.updateHomeScreen();
          }
        }
      });
    });
  },
};
