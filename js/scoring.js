/**
 * scoring.js — Алгоритм подсчёта результатов теста
 *
 * Принимает ответы и вопросы, возвращает полный объект результата.
 * Полностью безопасен, контекст "this" зафиксирован через "self".
 */

const Scoring = {
  // Максимумы баллов
  MAX_MAIN: 18, // 9 основных центров × 6 вопросов (3 нехватка + 3 переизбыток)
  MAX_PERIPH: 12, // 4 периферийных × 4 вопроса (2 + 2)

  CENTER_NAMES: {
    1: "Исток",
    2: "Зарод",
    3: "Живот",
    4: "Перси",
    5: "Лада",
    6: "Леля",
    7: "Уста",
    8: "Чело",
    9: "Родник",
    10: "Стопы",
    11: "Колени",
    12: "Локти",
    13: "Ладони",
  },

  CENTER_COLORS: {
    1: "#EF4444",
    2: "#F97316",
    3: "#EAB308",
    4: "#22C55E",
    5: "#EC4899",
    6: "#A855F7",
    7: "#38BDF8",
    8: "#2563EB",
    9: "#8B5CF6",
    10: "#EF4444",
    11: "#EF4444",
    12: "#EC4899",
    13: "#EC4899",
  },

  // ═══ ГЛАВНАЯ ФУНКЦИЯ ПОДЧЁТА ═══
  calculate(answers, allQuestions) {
    const result = {
      centers: {}, // Данные по каждому центру
      overallHealth: 0, // Общий % здоровья
      pattern: null, // Доминирующий паттерн
      child: null, // Внутренний ребёнок
      resources: {}, // Ресурсы
      controls: [], // Контрольные пары
      worlds: {
        // Среднее здоровье по мирам
        slav: 0,
        yav: 0,
        nav: 0,
      },
      centersMini: [], // Мини-схема 9 центров для истории
      summary: {}, // Сводка для истории
      date: new Date().toISOString(),
      id: Date.now().toString(36),
    };

    // 1. Считаем баллы по центрам (Блок 1)
    this.calcBlock1(answers, allQuestions, result);

    // 2. Считаем сценарии (Блок 2)
    this.calcBlock2(answers, allQuestions, result);

    // 3. Считаем ресурс (Блок 3)
    this.calcBlock3(answers, allQuestions, result);

    // 4. Определяем ребёнка (Блок 4)
    this.calcBlock4(answers, allQuestions, result);

    // 5. Проверяем контроль (Блок 5)
    this.calcBlock5(answers, allQuestions, result);

    // 6. Считаем общее здоровье
    this.calcOverall(result);

    // 7. Определяем паттерн
    this.calcPattern(result);

    // 8. Считаем миры
    this.calcWorlds(result);

    // 9. Собираем краткую сводку для истории
    this.buildSummary(result);

    return result;
  },

  // ═══ БЛОК 1: САМООЦЕНКА ═══
  calcBlock1(answers, allQuestions, result) {
    const b1 = App.questions.block1;

    // Инициализируем центры
    for (let c = 1; c <= 13; c++) {
      result.centers[c] = {
        name: this.CENTER_NAMES[c],
        color: this.CENTER_COLORS[c],
        deficit: 0,
        excess: 0,
        total: 0,
        max: c <= 9 ? this.MAX_MAIN : this.MAX_PERIPH,
        health: 100,
        scenarioDeficit: 0,
        scenarioBalance: 0,
        scenarioExcess: 0,
        isMain: c <= 9,
      };
    }

    // Считаем баллы
    b1.forEach(function (q) {
      const answer = answers[q.id];
      if (answer === undefined) return;

      const center = result.centers[q.center];
      if (!center) return;

      if (q.dir === "deficit") {
        center.deficit += answer;
      } else if (q.dir === "excess") {
        center.excess += answer;
      }
    });

    // Считаем total и health
    for (let c = 1; c <= 13; c++) {
      const center = result.centers[c];
      center.total = center.deficit + center.excess;
      center.health = Math.round(100 - (center.total / center.max) * 100);
      if (center.health < 0) center.health = 0;
    }
  },

  // ═══ БЛОК 2: СЦЕНАРИИ ═══
  calcBlock2(answers, allQuestions, result) {
    const b2 = App.questions.block2;

    b2.forEach(function (q) {
      const answer = answers[q.id];
      if (!answer) return;

      const center = result.centers[q.center];
      if (!center) return;

      const option = q.options.find(function (o) {
        return o.key === answer;
      });
      if (!option) return;

      if (option.dir === "deficit") center.scenarioDeficit++;
      else if (option.dir === "balance") center.scenarioBalance++;
      else if (option.dir === "excess") center.scenarioExcess++;
    });
  },

  // ═══ БЛОК 3: РЕСУРС ═══
  calcBlock3(answers, allQuestions, result) {
    const b3 = App.questions.block3;
    const self = this; // Фиксируем контекст Scoring

    b3.forEach(function (q) {
      const answer = answers[q.id];
      if (answer === undefined) return;

      result.resources[q.center] = {
        name: self.CENTER_NAMES[q.center], // Избегаем обращения через undefined this
        score: answer,
        max: 3,
      };
    });
  },

  // ═══ БЛОК 4: ИСТОРИЯ (РЕБЁНОК) ═══
  calcBlock4(answers, allQuestions, result) {
    const b4 = App.questions.block4;
    const self = this;

    let worstCenter = 1;
    let worstHealth = 100;
    for (let c = 1; c <= 9; c++) {
      if (result.centers[c].health < worstHealth) {
        worstHealth = result.centers[c].health;
        worstCenter = c;
      }
    }

    const historyQ = b4.find(function (q) {
      return q.center === worstCenter;
    });
    if (historyQ) {
      const answer = answers[historyQ.id];
      if (answer) {
        const option = historyQ.options.find(function (o) {
          return o.key === answer;
        });
        if (option) {
          result.child = {
            center: worstCenter,
            centerName: self.CENTER_NAMES[worstCenter],
            age: option.age,
            ageLabel: self.getAgeLabel(option.age),
            isEarly:
              ["0-3", "3-10", "7-10", "8-13", "10-15", "14-17"].indexOf(
                option.age,
              ) !== -1,
            isAcquired: option.age === "adult",
            isNone: option.age === "none",
          };
        }
      }
    }
  },

  getAgeLabel(age) {
    const labels = {
      "0-3": "0–3 года",
      "3-10": "3–10 лет",
      "7-10": "7–10 лет",
      "8-13": "8–13 лет",
      "10-15": "10–15 лет",
      "14-17": "14–17 лет",
      adult: "Взрослый возраст",
      none: "Не знакомо",
    };
    return labels[age] || age;
  },

  // ═══ БЛОК 5: КОНТРОЛЬ ═══
  calcBlock5(answers, allQuestions, result) {
    const b5 = App.questions.block5;
    const self = this;

    b5.forEach(function (q) {
      const controlAnswer = answers[q.id];
      if (controlAnswer === undefined) return;

      let isContradiction = false;
      if (q.checks && q.checks.length) {
        q.checks.forEach(function (checkId) {
          const checkAnswer = answers[checkId];
          if (checkAnswer !== undefined) {
            if (controlAnswer >= 2 && checkAnswer >= 2) {
              isContradiction = true;
            }
          }
        });
      }

      result.controls.push({
        center: q.center,
        centerName: self.CENTER_NAMES[q.center],
        controlScore: controlAnswer,
        isContradiction: isContradiction,
      });
    });
  },

  // ═══ ОБЩЕЕ ЗДОРОВЬЕ ═══
  calcOverall(result) {
    let totalHealth = 0;
    let count = 0;

    for (let c = 1; c <= 9; c++) {
      totalHealth += result.centers[c].health;
      count++;
    }

    result.overallHealth = Math.round(totalHealth / count);

    // Сбор данных мини-схемы (9 точек)
    result.centersMini = [];
    for (let c = 1; c <= 9; c++) {
      result.centersMini.push(result.centers[c].health);
    }
  },

  // ═══ ОПРЕДЕЛЕНИЕ ПАТТЕРНА ═══
  calcPattern(result) {
    const c = result.centers;
    const self = this;

    const patterns = [
      {
        name: "Голова в облаках, ноги в вате",
        check: function () {
          return c[1].deficit >= 5 && c[9].excess >= 5;
        },
        centers: [1, 9],
      },
      {
        name: "Думаю — значит, живу",
        check: function () {
          return c[2].deficit >= 5 && c[8].excess >= 5;
        },
        centers: [2, 8],
      },
      {
        name: "Делаю — значит, существую",
        check: function () {
          return c[7].deficit >= 5 && c[3].excess >= 5;
        },
        centers: [7, 3],
      },
      {
        name: "Люблю всех, кроме себя",
        check: function () {
          return c[4].excess + c[5].excess >= 8 && c[3].deficit >= 5;
        },
        centers: [4, 5, 3],
      },
      {
        name: "Крепость на болоте",
        check: function () {
          return c[1].excess >= 5 && c[4].deficit >= 5;
        },
        centers: [1, 4],
      },
      {
        name: "Всё принимаю, ничего не отдаю",
        check: function () {
          return c[6].excess >= 5 && c[5].deficit >= 5;
        },
        centers: [6, 5],
      },
      {
        name: "Всё отдаю, ничего не слышу",
        check: function () {
          return c[5].excess >= 5 && c[6].deficit >= 5;
        },
        centers: [5, 6],
      },
      {
        name: "Вечный подросток",
        check: function () {
          return c[7].deficit >= 5 && c[8].deficit >= 5;
        },
        centers: [7, 8],
      },
      {
        name: "Сердце в замке",
        check: function () {
          return c[4].deficit >= 5 && c[5].deficit >= 5;
        },
        centers: [4, 5],
      },
      {
        name: "Тихий перфекционист",
        check: function () {
          return c[7].excess >= 5 && c[7].deficit < 3 && c[3].deficit >= 4;
        },
        centers: [8, 3],
      },
      {
        name: "Замороженный фундамент",
        check: function () {
          return c[1].deficit >= 5 && c[2].deficit >= 5;
        },
        centers: [1, 2],
      },
      {
        name: "Голос без опоры",
        check: function () {
          return c[7].deficit >= 5 && c[1].deficit >= 4;
        },
        centers: [7, 1],
      },
    ];

    for (let i = 0; i < patterns.length; i++) {
      const p = patterns[i];
      if (p.check()) {
        result.pattern = {
          name: p.name,
          centers: p.centers.map(function (cNum) {
            return {
              num: cNum,
              name: self.CENTER_NAMES[cNum],
              color: self.CENTER_COLORS[cNum],
            };
          }),
        };
        return;
      }
    }

    // Универсальный шаблон
    const sorted = Object.entries(c)
      .filter(function (entry) {
        return parseInt(entry[0]) <= 9;
      })
      .sort(function (a, b) {
        return b[1].total - a[1].total;
      });

    if (sorted.length >= 2 && sorted[0][1].total >= 5) {
      result.pattern = {
        name: "Индивидуальный паттерн",
        centers: sorted.slice(0, 2).map(function (entry) {
          const k = parseInt(entry[0]);
          return {
            num: k,
            name: self.CENTER_NAMES[k],
            color: self.CENTER_COLORS[k],
          };
        }),
        isCustom: true,
      };
    }
  },

  // ═══ ВЫЧИСЛЕНИЕ СРЕДНЕГО ПО МИРАМ ═══
  calcWorlds(result) {
    const c = result.centers;
    result.worlds.slav = Math.round(
      (c[7].health + c[8].health + c[9].health) / 3,
    );
    result.worlds.yav = Math.round(
      (c[4].health + c[5].health + c[6].health) / 3,
    );
    result.worlds.nav = Math.round(
      (c[1].health + c[2].health + c[3].health) / 3,
    );
  },

  // ═══ СБОРКА СВОДКИ ДЛЯ ИСТОРИИ ═══
  buildSummary(result) {
    let worstCenter = 1;
    let worstHealth = 100;

    for (let c = 1; c <= 9; c++) {
      if (result.centers[c] && result.centers[c].health < worstHealth) {
        worstHealth = result.centers[c].health;
        worstCenter = c;
      }
    }

    const resArr = [];
    for (const key in result.resources) {
      if (result.resources.hasOwnProperty(key)) {
        resArr.push(result.resources[key]);
      }
    }
    resArr.sort(function (a, b) {
      return b.score - a.score;
    });

    const topResources = resArr.slice(0, 2).map(function (r) {
      return r.name;
    });

    result.summary = {
      worstCenter: this.CENTER_NAMES[worstCenter],
      worstHealth: worstHealth,
      pattern: result.pattern ? result.pattern.name : null,
      childAge: result.child ? result.child.ageLabel : null,
      topResources: topResources,
    };
  },
};
