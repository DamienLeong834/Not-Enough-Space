/* ============================================================
   Not Enough Space — "The Deep Space Dive" game engine
   Inspired by krillion.io: open-ended prompts, your answer's
   rarity decides how deep you sink. Kid-friendly: gentle
   optional timer, hints, retries, no shame states.
   The dive is a journey: every depth zone you cross is named,
   so the score reads like a descent through space.
   ============================================================ */
(function () {
  "use strict";
  const D = window.NES_DATA;
  const S = window.NES_STATE;
  const TTS = window.NES_TTS;
  const SFX = window.NES_SFX;
  const UI = window.NES_UI;
  const el = UI.el;
  const L = window.NES_I18N.t;
  // module-level so navigation can never leak a running timer
  let activeTimer = null;
  function clearActiveTimer() {
    if (activeTimer) {
      window.clearInterval(activeTimer);
      activeTimer = null;
    }
  }
  // ---------- answer matching (Krillion-style generous aliases) ----------
  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[’‘'`]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length;
    const n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = new Array(n + 1);
    let cur = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      cur[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      const t = prev;
      prev = cur;
      cur = t;
    }
    return prev[n];
  }
  /**
   * Returns { entry, depth, tier } or null
   * Exact matches always win. For fuzzy matches we prefer the DEEPEST
   * entry within the edit budget, so a kid who types the rare answer with
   * a typo is still credited with the rare answer.
   */
  function judge(guess, answers) {
    const g = normalize(guess);
    if (!g) return null;
    // 1) exact match (normalised) — highest priority
    for (let i = 0; i < answers.length; i++) {
      const entry = answers[i];
      for (let j = 0; j < entry.aliases.length; j++) {
        const a = normalize(entry.aliases[j]);
        if (a && a === g) return entry;
      }
    }
    // 2) fuzzy match — collect every candidate, then take the deepest
    let best = null;
    for (let i = 0; i < answers.length; i++) {
      const entry = answers[i];
      for (let j = 0; j < entry.aliases.length; j++) {
        const a = normalize(entry.aliases[j]);
        if (!a) continue;
        const maxD = a.length <= 2 ? 0 : a.length <= 4 ? 1 : 2;
        if (maxD === 0) continue;
        const d = lev(g, a);
        if (d <= maxD) {
          if (
            !best ||
            entry.depth > best.entry.depth ||
            (entry.depth === best.entry.depth && d < best.d)
          ) {
            best = { entry: entry, d: d };
          }
        }
      }
    }
    return best ? best.entry : null;
  }
  function commonAnswers(answers) {
    return answers.filter(function (a) {
      return a.tier === "common";
    });
  }
  // ---------- stars ----------
  function starsFor(total, targets) {
    if (total < targets.pass) return 0;
    let s = 1;
    if (total >= targets.star2) s++;
    if (total >= targets.star3) s++;
    return s;
  }
  function starString(n) {
    let out = "";
    for (let i = 0; i < 3; i++) out += i < n ? "⭐" : "☆";
    return out;
  }
  function reducedMotion() {
    if (S.lessMotion()) return true;
    return !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
  function confetti(host) {
    if (reducedMotion()) return;
    const colors = ["#ffd166", "#4cc9f0", "#ff6b6b", "#9b5de5", "#48e0c2", "#f7f9ff"];
    const layer = el("div", { class: "confetti", "aria-hidden": "true" }, []);
    for (let i = 0; i < 44; i++) {
      const p = el("span", { class: "confetti-bit" }, []);
      p.style.left = Math.random() * 100 + "%";
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.8 + "s";
      p.style.animationDuration = 1.8 + Math.random() * 1.6 + "s";
      layer.appendChild(p);
    }
    host.appendChild(layer);
    window.setTimeout(function () {
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    }, 4500);
  }
  /* ============================================================
     PUBLIC: start(container, chapter, ctx)
     ctx: { goChapter(id), goHome(), goCertificate() }
     ============================================================ */
  function start(container, chapter, ctx) {
    const targets = D.targetsFor(chapter);
    container.innerHTML = "";
    renderIntro(container, chapter, targets, ctx);
  }
  // ---------- Stage 1: level intro ----------
  function renderIntro(container, chapter, targets, ctx) {
    container.innerHTML = "";
    // --- timer on/off chips ---
    const timerChips = el("div", { class: "choice-chips", role: "group", "aria-label": L("set.timer") }, []);
    function paintTimer() {
      timerChips.innerHTML = "";
      [
        { label: L("game.timerOn"), val: true },
        { label: L("game.timerOff"), val: false },
      ].forEach(function (opt) {
        timerChips.appendChild(
          el(
            "button",
            {
              type: "button",
              class: "chip" + (S.isTimerOn() === opt.val ? " chip-on" : ""),
              "aria-pressed": String(S.isTimerOn() === opt.val),
              text: opt.label,
              onclick: function () {
                S.setSetting("timer", opt.val);
                paintTimer();
                SFX.click();
              },
            },
            []
          )
        );
      });
    }
    paintTimer();
    // --- timer length chips ---
    const speedChips = el("div", { class: "choice-chips", role: "group", "aria-label": L("game.timerSpeed") }, []);
    function paintSpeed() {
      speedChips.innerHTML = "";
      [
        { label: L("game.speedRelaxed"), val: 40 },
        { label: L("game.speedNormal"), val: 25 },
        { label: L("game.speedQuick"), val: 15 },
      ].forEach(function (opt) {
        speedChips.appendChild(
          el(
            "button",
            {
              type: "button",
              class: "chip" + (S.timerSeconds() === opt.val ? " chip-on" : ""),
              "aria-pressed": String(S.timerSeconds() === opt.val),
              text: opt.label,
              onclick: function () {
                S.setSetting("timerSpeed", opt.val);
                S.setSetting("timer", true);
                paintSpeed();
                paintTimer();
                SFX.click();
              },
            },
            []
          )
        );
      });
    }
    paintSpeed();
    const speedRow = el("div", { class: "intro-speed" }, [
      el("span", { class: "intro-speed-label", text: L("game.timerSpeed") }, []),
      speedChips,
    ]);
    container.appendChild(
      el("div", { class: "game-intro card" }, [
        el("div", { class: "game-kicker", text: L("game.kicker") }),
        el("h2", { class: "game-title", text: chapter.title }),
        el("p", { class: "game-sub", text: chapter.brief }),
        el("ul", { class: "game-rules" }, [
          el("li", { text: L("game.rules1", { n: chapter.prompts.length }) }),
          el("li", { text: L("game.rules2") }),
          el("li", { text: L("game.rules3", { p: targets.pass }) }),
          el("li", { text: L("game.rules4") }),
        ]),
        el("div", { class: "intro-goal" }, [
          el("span", { class: "goal-badge", text: L("game.goal", { p: targets.pass }) }),
          el("span", {
            class: "goal-badge",
            text: L("game.best", {
              b: S.result(chapter.id) ? S.result(chapter.id).bestDepth + " m" : "—",
            }),
          }),
          el("span", {
            class: "goal-badge goal-stars",
            text: "⭐ " + L("game.starsLabel", { s: targets.star3 >= targets.max ? 3 : 3 }),
          }),
        ]),
        el("div", { class: "intro-zones" }, [
          el("span", { class: "intro-speed-label", text: "🌊 " + L("mc.fields") }),
        ]),
        el("div", { class: "zone-strip" }, D.ZONES.map(function (z) {
          return el("span", { class: "zone-chip", title: z.name }, [
            el("span", { class: "zone-chip-icon", text: z.icon, "aria-hidden": "true" }, []),
            el("span", { class: "zone-chip-name", text: z.name }, []),
            el("span", { class: "zone-chip-depth", text: z.min + " m" }, []),
          ]);
        })),
        el("div", { class: "intro-timer" }, [
          el("span", { class: "intro-speed-label", text: "⏱️ " + L("set.timer") }, []),
          timerChips,
        ]),
        speedRow,
        el("div", { class: "btn-row" }, [
          el(
            "button",
            {
              class: "btn btn-primary btn-big",
              type: "button",
              text: L("game.start"),
              onclick: function () {
                SFX.click();
                renderRound(container, chapter, targets, ctx, 0, [], 0, null);
              },
            },
            []
          ),
          el(
            "button",
            {
              class: "btn btn-ghost",
              type: "button",
              text: L("game.back"),
              onclick: function () {
                SFX.click();
                ctx.goChapter(chapter.id);
              },
            },
            []
          ),
        ]),
      ])
    );
    focusHeading(container);
  }
  // ---------- Stage 2: one round per prompt ----------
  function renderRound(container, chapter, targets, ctx, index, log, depth, lastZone) {
    const prompt = chapter.prompts[index];
    container.innerHTML = "";
    // --- top bar: back, progress dots, depth ---
    const dots = el("div", { class: "dots", role: "list", "aria-label": L("game.question", { i: index + 1, n: chapter.prompts.length }) }, []);
    chapter.prompts.forEach(function (_, i) {
      dots.appendChild(
        el("span", {
          class:
            "dot" +
            (i < index ? "dot-done" : "") +
            (i === index ? "dot-now" : ""),
          role: "listitem",
          "aria-label": i === index ? "current question" : i < index ? "answered" : "not yet",
        }, [])
      );
    });
    const zone = D.zoneFor(depth);
    const depthFill = el("span", { class: "depth-fill" }, []);
    depthFill.style.width =
      Math.min(100, Math.round((depth / targets.star3) * 100)) + "%";
    const depthLabel = el("span", {
      class: "depth-label",
      text: L("game.depth", { d: depth, p: targets.pass }),
    });
    const zoneLabel = el("span", {
      class: "zone-label",
      text: zone.icon + " " + zone.name,
    });
    // mute toggle in the HUD (sound is otherwise buried in settings)
    const muteBtn = el(
      "button",
      {
        class: "btn btn-ghost btn-small hud-mute",
        type: "button",
        text: S.isSoundOn() ? L("game.mute") : L("game.unmute"),
        title: L("game.muteLabel"),
        "aria-label": L("game.muteLabel"),
        "aria-pressed": String(!S.isSoundOn()),
        onclick: function () {
          S.setSetting("sound", !S.isSoundOn());
          muteBtn.textContent = S.isSoundOn() ? L("game.mute") : L("game.unmute");
          muteBtn.setAttribute("aria-pressed", String(!S.isSoundOn()));
          if (S.isSoundOn()) SFX.click();
        },
      },
      []
    );
    container.appendChild(
      el("div", { class: "game-hud" }, [
        el("button", {
          class: "btn btn-ghost btn-small",
          type: "button",
          text: L("game.quit"),
          onclick: function () {
            UI.confirm({
              icon: "🫧",
              title: L("game.quitTitle"),
              body: L("game.quitBody"),
              ok: L("game.quit"),
              cancel: L("common.cancel"),
            }).then(function (yes) {
              if (yes) ctx.goChapter(chapter.id);
            });
          },
        }, []),
        dots,
        el("div", { class: "depth-meter", "aria-live": "polite" }, [
          el("div", { class: "depth-track" }, [depthFill]),
          el("div", { class: "depth-meta" }, [zoneLabel, depthLabel]),
        ]),
        muteBtn,
      ])
    );
    // --- timer (optional) — deadline based so it never drifts ---
    clearActiveTimer();
    let timerWrap = null;
    if (S.isTimerOn()) {
      const total = S.timerSeconds();
      const fill = el("span", { class: "timer-fill" }, []);
      const num = el("span", { class: "timer-num", text: String(total) }, []);
      timerWrap = el("div", { class: "timer", role: "timer", "aria-label": "Time left" }, [
        el("div", { class: "timer-track" }, [fill]),
        num,
      ]);
      const endAt = Date.now() + total * 1000;
      let lastTick = total;
      activeTimer = window.setInterval(function () {
        const left = Math.max(0, (endAt - Date.now()) / 1000);
        const pct = (left / total) * 100;
        fill.style.width = pct + "%";
        num.textContent = String(Math.ceil(left));
        if (left <= 5) timerWrap.classList.add("low");
        if (left <= 5.05 && Math.ceil(left) < lastTick) {
          lastTick = Math.ceil(left);
          SFX.tick();
        }
        if (left <= 0) {
          clearActiveTimer();
          submit(true);
        }
      }, 100);
    }
    // --- question card ---
    const input = el("input", {
      class: "answer-input",
      type: "text",
      id: "answer-box",
      placeholder: L("game.input"),
      autocomplete: "off",
      autocorrect: "off",
      autocapitalize: "off",
      spellcheck: "false",
      "aria-label": L("game.inputLabel"),
      maxlength: "60",
    }, []);
    const hintBox = el("div", { class: "hint-box" }, []);
    const commons = commonAnswers(prompt.answers);
    let hintUsed = false;
    const hintBtn = commons.length
      ? el(
          "button",
          {
            class: "btn btn-ghost btn-small",
            type: "button",
            text: L("game.hint"),
            onclick: function () {
              if (hintUsed) return;
              hintUsed = true;
              SFX.click();
              const row = el("div", { class: "hint-row" }, [
                el("span", { class: "hint-label", text: L("game.hintLabel") }, []),
              ]);
              commons.forEach(function (a) {
                row.appendChild(
                  el(
                    "button",
                    {
                      class: "chip chip-tap",
                      type: "button",
                      text: a.text,
                      onclick: function () {
                        input.value = a.text;
                        input.focus();
                        SFX.click();
                      },
                    },
                    []
                  )
                );
              });
              hintBox.appendChild(row);
              hintBtn.disabled = true;
              hintBtn.textContent = L("game.hintUsed");
            },
          },
          []
        )
      : null;
    const skipBtn = el(
      "button",
      {
        class: "btn btn-ghost btn-small",
        type: "button",
        text: L("game.skip"),
        onclick: function () {
          submit(false, "__skip__");
        },
      },
      []
    );
    function clearTimer() {
      clearActiveTimer();
    }
    function submit(fromTimer, forceValue) {
      clearTimer();
      SFX.submit();
      const raw =
        forceValue === "__skip__"
          ? ""
          : forceValue !== undefined
          ? forceValue
          : input.value;
      let entry = null;
      if (forceValue !== "__skip__") entry = judge(raw, prompt.answers);
      const gained = entry ? entry.depth : 0;
      log.push({
        q: prompt.q,
        guess: forceValue === "__skip__" ? "(skipped)" : raw.trim(),
        entry: entry,
        gained: gained,
      });
      const newDepth = depth + gained;
      const newZone = D.zoneFor(newDepth);
      const zoneChanged = lastZone && newZone.name !== lastZone.name;
      renderFeedback(container, chapter, targets, ctx, index, log, newDepth, {
        entry: entry,
        gained: gained,
        timedOut: !!fromTimer && !raw.trim(),
        skipped: forceValue === "__skip__",
        guess: raw.trim(),
        zoneChanged: zoneChanged,
        zone: newZone,
      });
    }
    const form = el(
      "form",
      {
        class: "answer-form",
        onsubmit: function (e) {
          e.preventDefault();
          submit(false);
        },
      },
      [input]
    );
    container.appendChild(
      el("div", { class: "question-card card" }, [
        timerWrap,
        el("div", { class: "q-head" }, [
          el("span", {
            class: "q-num",
            text: L("game.question", { i: index + 1, n: chapter.prompts.length }),
          }, []),
          readAloudBtn(prompt.q),
        ]),
        el("h2", { class: "q-text", text: prompt.q }, []),
        form,
        hintBox,
        el("div", { class: "btn-row" }, [
          el(
            "button",
            {
              class: "btn btn-primary btn-big",
              type: "button",
              text: L("game.dive"),
              onclick: function (e) {
                e.preventDefault();
                submit(false);
              },
            },
            []
          ),
          hintBtn,
          skipBtn,
        ].filter(Boolean)),
      ])
    );
    input.focus();
  }
  // ---------- feedback between rounds ----------
  function renderFeedback(container, chapter, targets, ctx, index, log, depth, info) {
    container.innerHTML = "";
    let tierBlock = null;
    if (info.entry) {
      const t = D.TIERS[info.entry.tier];
      tierBlock = el("div", { class: "verdict verdict-good" }, [
        el("div", { class: "verdict-tier" }, [
          el("span", { class: "tier-icon", text: t.icon }, []),
          el("span", { class: "tier-name", text: t.label }, []),
        ]),
        el("div", { class: "verdict-depth", text: "+" + info.gained + " m" }),
        el("div", {
          class: "verdict-answer",
          text: L("game.yourAnswer", { g: info.guess }),
        }),
      ]);
      if (info.entry.tier === "gem") SFX.gem();
      else if (info.entry.depth >= 45) SFX.deep();
      else SFX.shallow();
    } else {
      tierBlock = el("div", { class: "verdict verdict-bad" }, [
        el("div", { class: "verdict-tier" }, [
          el("span", { class: "tier-icon", text: "🫧" }, []),
          el("span", {
            class: "tier-name",
            text: info.skipped
              ? L("game.verdictSkip")
              : info.timedOut
              ? L("game.verdictTimeout")
              : L("game.verdictMiss"),
          }, []),
        ]),
        el("div", { class: "verdict-depth", text: "+0 m" }),
        el("div", {
          class: "verdict-answer",
          text:
            info.skipped || info.timedOut
              ? L("game.noWorry")
              : L("game.yourAnswer", { g: info.guess || "…" }),
        }),
      ]);
      SFX.miss();
    }
    const depthFill = el("span", { class: "depth-fill" }, []);
    depthFill.style.width =
      Math.min(100, Math.round((depth / targets.star3) * 100)) + "%";
    const zone = info.zone || D.zoneFor(depth);
    container.appendChild(
      el("div", { class: "feedback card" }, [
        tierBlock,
        el("div", { class: "depth-meter big" }, [
          el("div", { class: "depth-track" }, [depthFill]),
          el("div", { class: "depth-meta" }, [
            el("span", { class: "zone-label", text: zone.icon + " " + zone.name }, []),
            el("span", {
              class: "depth-label",
              text: L("game.depthBig", { d: depth, p: targets.pass }),
            }),
          ]),
        ]),
        el("div", { class: "btn-row" }, [
          index + 1 < chapter.prompts.length
            ? el(
                "button",
                {
                  class: "btn btn-primary btn-big",
                  type: "button",
                  text: L("game.nextQ"),
                  onclick: function () {
                    SFX.click();
                    renderRound(
                      container,
                      chapter,
                      targets,
                      ctx,
                      index + 1,
                      log,
                      depth,
                      zone.name
                    );
                  },
                },
                []
              )
            : el(
                "button",
                {
                  class: "btn btn-primary btn-big",
                  type: "button",
                  text: L("game.seeDepth"),
                  onclick: function () {
                    SFX.click();
                    renderResults(container, chapter, targets, ctx, log, depth);
                  },
                },
                []
              ),
        ]),
      ])
    );
    focusHeading(container);
  }
  // ---------- Stage 3: results + debrief ----------
  function renderResults(container, chapter, targets, ctx, log, depth) {
    container.innerHTML = "";
    const stars = starsFor(depth, targets);
    const passed = stars >= 1;
    const gemFound = log.some(function (r) {
      return r.entry && r.entry.tier === "gem";
    });
    const rec = S.recordDive(chapter.id, depth, stars, passed, gemFound);
    const isLast = chapter.id >= D.CHAPTERS[D.CHAPTERS.length - 1].id;
    const zone = D.zoneFor(depth);
    if (passed) {
      SFX.win();
      if (rec.unlockedNew) window.setTimeout(SFX.unlock, 500);
      confetti(container);
    } else {
      SFX.fail();
    }
    // --- headline ---
    const headline = passed
      ? isLast
        ? L("game.resultsFinal")
        : L("game.resultsUnlocked", { n: chapter.id + 1 })
      : L("game.resultsClose");
    // --- review list ---
    const review = el("ul", { class: "review" }, []);
    log.forEach(function (r, i) {
      const items = el("li", { class: "review-item" }, [
        el("div", { class: "review-q" }, [
          el("span", { class: "review-num", text: "Q" + (i + 1) }, []),
          el("span", { text: r.q }, []),
        ]),
        el("div", {
          class: "review-you " + (r.entry ? "ok" : "no"),
          text: r.entry
            ? "✓ " + L("game.yourAnswer", { g: r.guess || "—" }) + "  +" + r.gained + " m"
            : "✗ " + L("game.yourAnswer", { g: r.guess || "—" }) + "  +0 m",
        }),
        el("div", { class: "review-answers" }, [
          el("span", { class: "review-answers-label", text: L("game.accepted") }, []),
        ]),
      ]);
      const ansRow = items.querySelector(".review-answers");
      const prompt = chapter.prompts[i];
      prompt.answers
        .slice()
        .sort(function (a, b) {
          return b.depth - a.depth;
        })
        .forEach(function (a) {
          const t = D.TIERS[a.tier];
          ansRow.appendChild(
            el("span", {
              class: "ans-pill tier-" + a.tier,
              text: t.icon + " " + a.text + " (+" + a.depth + " m)",
            }, [])
          );
        });
      review.appendChild(items);
    });
    // --- official facts (verbatim from the challenge Resources tab) ---
    const facts = el("div", { class: "facts" }, [
      el("h3", { class: "facts-title", text: L("game.factsTitle") }, []),
      el("button", {
        class: "tts-btn",
        type: "button",
        title: L("game.factsBtn"),
        "aria-label": L("game.factsBtn"),
        "aria-pressed": "false",
        text: "🔊",
        onclick: function (e) {
          TTS.speak(chapter.facts.join(" "), e.currentTarget);
        },
      }, []),
    ]);
    chapter.facts.forEach(function (f) {
      facts.appendChild(el("p", { class: "fact", text: f }, []));
    });
    // --- action buttons ---
    const actions = [];
    if (passed && !isLast) {
      actions.push(
        el(
          "button",
          {
            class: "btn btn-primary btn-big",
            type: "button",
            text: L("game.winNext", { n: chapter.id + 1 }),
            onclick: function () {
              SFX.click();
              ctx.goChapter(chapter.id + 1);
            },
          },
          []
        )
      );
    }
    if (passed && isLast) {
      if (ctx.goCertificate) {
        actions.push(
          el(
            "button",
            {
              class: "btn btn-primary btn-big glow",
              type: "button",
              text: L("game.winFinal"),
              onclick: function () {
                SFX.unlock();
                ctx.goCertificate();
              },
            },
            []
          )
        );
      }
      actions.push(
        el(
          "button",
          {
            class: "btn btn-ghost",
            type: "button",
            text: L("game.winHome"),
            onclick: function () {
              SFX.click();
              ctx.goHome();
            },
          },
          []
        )
      );
    }
    if (!passed) {
      actions.push(
        el(
          "button",
          {
            class: "btn btn-primary btn-big",
            type: "button",
            text: L("game.retry"),
            onclick: function () {
              SFX.click();
              start(container, chapter, ctx);
            },
          },
          []
        )
      );
    } else {
      actions.push(
        el(
          "button",
          {
            class: "btn btn-ghost",
            type: "button",
            text: L("game.replay"),
            onclick: function () {
              SFX.click();
              start(container, chapter, ctx);
            },
          },
          []
        )
      );
    }
    actions.push(
      el(
        "button",
        {
          class: "btn btn-ghost",
          type: "button",
          text: L("game.map"),
          onclick: function () {
            SFX.click();
            ctx.goHome();
          },
        },
        []
      )
    );
    container.appendChild(
      el("div", { class: "results card" }, [
        el("div", { class: "results-top" }, [
          el("h2", { class: "results-headline", text: headline }, []),
          el("div", {
            class: "results-stars",
            text: starString(stars),
            "aria-label": L("game.starsLabel", { s: stars }),
          }),
          el("div", {
            class: "results-depth",
            text: L("game.sank", { d: depth, b: rec.bestDepth }),
          }),
          el("div", { class: "results-zone", text: zone.icon + " " + zone.name }, []),
          el("div", {
            class: "results-goal",
            text: passed
              ? L("game.goalReached", { p: targets.pass })
              : L("game.goalMiss", { p: targets.pass }),
          }),
          rec.starlightGained > 0
            ? el("div", { class: "results-starlight", text: L("game.starlightEarned", { n: rec.starlightGained }) }, [])
            : null,
        ]),
        review,
        facts,
        el("div", { class: "btn-row" }, actions),
      ])
    );
    focusHeading(container);
    container.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    // --- celebrations ---
    if (rec.unlockedNew) {
      window.setTimeout(function () {
        UI.toast({
          icon: "🔓",
          tone: "gold",
          title: L("toast.chapterUnlocked", { n: chapter.id + 1 }),
          body: L("toast.newChapter"),
          duration: 5200,
        });
      }, 700);
    }
    if (rec.starlightGained > 0) {
      window.setTimeout(function () {
        UI.toast({
          icon: "✨",
          tone: "good",
          title: L("game.starlightEarned", { n: rec.starlightGained }),
          body: L("home.starlight", { n: S.starlight() }),
        });
      }, rec.unlockedNew ? 1500 : 800);
    }
  }
  function readAloudBtn(text) {
    if (!TTS.supported) return null;
    return el(
      "button",
      {
        class: "tts-btn",
        type: "button",
        title: L("common.readAloud"),
        "aria-label": L("game.qBtn"),
        "aria-pressed": "false",
        text: "🔊",
        onclick: function (e) {
          e.preventDefault();
          TTS.speak(text, e.currentTarget);
        },
      },
      []
    );
  }
  function focusHeading(container) {
    const h = container.querySelector("h2");
    if (h) {
      h.setAttribute("tabindex", "-1");
      try {
        h.focus({ preventScroll: false });
      } catch (e) {}
    }
  }
  window.NES_GAME = {
    start: start,
    judge: judge,
    normalize: normalize,
    stopAll: function () {
      clearActiveTimer();
      if (TTS) TTS.stop();
    },
  };
})();
