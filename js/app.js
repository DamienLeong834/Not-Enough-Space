/* ============================================================
   Not Enough Space — App shell, router, home map, comic reader
   Routes:
     #/                → home
     #/c/{id}          → comic reader
     #/c/{id}/play     → Deep Space Dive
     #/museum          → Space Junk Museum
     #/certificate     → Explorer Certificate
     #/control         → Mission Control (NSSDCA)
     #/album           → Collection Album
     #/compare         → Compare two derelicts
     #/report          → Grown-up progress report
   ============================================================ */
(function () {
  "use strict";
  const D = window.NES_DATA;
  const S = window.NES_STATE;
  const TTS = window.NES_TTS;
  const SFX = window.NES_SFX;
  const UI = window.NES_UI;
  const I18N = window.NES_I18N;
  const NC = window.NES_NSSDCA;
  const el = UI.el;
  const L = I18N.t;
  const app = document.getElementById("app");
  const settingsBtn = document.getElementById("settings-btn");
  const langBtn = document.getElementById("lang-btn");
  const installBtn = document.getElementById("install-btn");
  /* ---------- preferences applied to <html> ---------- */
  function applyPrefs() {
    const h = document.documentElement;
    h.setAttribute("data-contrast", S.highContrast() ? "high" : "normal");
    h.setAttribute("data-motion", S.lessMotion() ? "less" : "full");
    h.setAttribute("data-read", S.easyRead() ? "easy" : "normal");
    h.setAttribute("data-textscale", String(S.textScale()));
    h.setAttribute("lang", I18N.getLang());
  }
  /* ---------- tiny helpers ---------- */
  // Helpers shared by renderHome (how-it-works + mission map): declared as
  // IIFE-scoped vars so they are always reachable from any render function.
  var step = function (icon, title, text) {
    return el("div", { class: "how-step" }, [
      el("div", { class: "how-icon", text: icon, "aria-hidden": "true" }, []),
      el("h3", { class: "how-title", text: title }),
      el("p", { class: "how-text", text: text }),
    ]);
  };
  var chapterCard = function (c) {
    const unlocked = S.isUnlocked(c.id);
    const read = S.chapterRead(c.id);
    const res = S.result(c.id);
    const status = !unlocked
      ? L("map.locked")
      : res && res.done
      ? L("map.finished")
      : read
      ? L("map.ready")
      : L("map.new");
    const statusClass = !unlocked
      ? "st-locked"
      : res && res.done
      ? "st-done"
      : read
      ? "st-ready"
      : "st-new";
    return el(
      "button",
      {
        class: "chapter-card reveal " + statusClass + (unlocked ? "" : " locked"),
        type: "button",
        style: "--d:" + ((c.id - 1) % 4) * 0.08 + "s",
        "aria-label": L("map.chapter", { n: c.id, title: c.title }),
        onclick: function () {
          SFX.click();
          if (unlocked) goChapter(c.id);
          else {
            UI.confirm({
              icon: "🔒",
              title: L("map.locked"),
              body: L("map.lockedBody", { n: c.id, p: c.id - 1 }),
              ok: L("locked.go", { p: c.id - 1 }),
              cancel: L("common.cancel"),
            }).then(function (yes) {
              if (yes) goChapter(c.id - 1);
            });
          }
        },
      },
      [
        el("div", { class: "cc-top" }, [
          el("span", { class: "cc-num", text: "Ch " + c.id }, []),
          el("span", { class: "cc-status", text: status }, []),
        ]),
        el("div", { class: "cc-pin", text: c.pin, "aria-hidden": "true" }, []),
        el("h4", { class: "cc-title", text: c.title }),
        el("p", { class: "cc-equip", text: c.equipment.join(" · ") }),
        el("div", { class: "cc-foot" }, [
          el("span", { class: "cc-stars", text: starString(res ? res.stars : 0) }, []),
          el("span", {
            class: "cc-depth",
            text: res ? "🌊 " + res.bestDepth + " m" : "",
          }, []),
        ]),
      ]
    );
  };
  function starString(n) {
    let out = "";
    for (let i = 0; i < 3; i++) out += i < n ? "⭐" : "☆";
    return out;
  }
  /* ---------- shared home / map helpers (hoisted to IIFE scope) ---------- */
  function ttsBtn(text, label) {
    if (!TTS.supported) return null;
    return el(
      "button",
      {
        class: "tts-btn",
        type: "button",
        title: L("common.readAloud"),
        "aria-label": label || L("common.readAloud"),
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
  function pageHead(backLabel, backFn, kicker) {
    return el("div", { class: "page-head" }, [
      el(
        "button",
        {
          class: "btn btn-ghost btn-small",
          type: "button",
          text: backLabel,
          onclick: function () {
            SFX.click();
            backFn();
          },
        },
        []
      ),
      el("span", { class: "comic-kicker", text: kicker }, []),
    ]);
  }
  /* ============================================================
     ROUTER
     ============================================================ */
  function route() {
    TTS.stop();
    if (window.NES_GAME && window.NES_GAME.stopAll) window.NES_GAME.stopAll();
    const hash = location.hash || "#/";
    const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (parts[0] === "about") renderAbout();
    else if (parts[0] === "museum") renderMuseum();
    else if (parts[0] === "certificate") renderCertificate();
    else if (parts[0] === "control") renderControl();
    else if (parts[0] === "album") renderAlbum();
    else if (parts[0] === "compare") renderCompare();
    else if (parts[0] === "report") renderReport();
    else if (parts[0] === "c") {
      const id = parseInt(parts[1], 10);
      const chapter = D.CHAPTERS.find(function (c) {
        return c.id === id;
      });
      if (!chapter) { goHome(); return; }
      if (!S.isUnlocked(id)) renderLocked(chapter);
      else if (parts[2] === "play") renderPlay(chapter);
      else renderComic(chapter);
    } else renderHome();
    // attribution footer on every view
    app.appendChild(renderFooter());
  }
  function goHome() {
    location.hash = "#/";
  }
  function goChapter(id) {
    location.hash = "#/c/" + id;
  }
  function goPlay(id) {
    location.hash = "#/c/" + id + "/play";
  }
  function goMuseum() {
    location.hash = "#/museum";
  }
  function goCertificate() {
    location.hash = "#/certificate";
  }
  function goControl() {
    location.hash = "#/control";
  }
  function goAlbum() {
    location.hash = "#/album";
  }
  function goCompare() {
    location.hash = "#/compare";
  }
  function goReport() {
    location.hash = "#/report";
  }
  const CTX = {
    goChapter: goChapter,
    goHome: goHome,
    goMuseum: goMuseum,
    goCertificate: goCertificate,
  };
  /* ---- Achievement badges (all derived from saved progress) ---- */
  const ACHIEVEMENTS = [
    {
      key: "storyStarter",
      icon: "📖",
      name: "ach.storyStarter",
      desc: "ach.storyStarterDesc",
      test: function (s) {
        return s.chapterRead(1);
      },
    },
    {
      key: "firstPlunge",
      icon: "🤿",
      name: "ach.firstPlunge",
      desc: "ach.firstPlungeDesc",
      test: function (s) {
        return s.completedCount() >= 1;
      },
    },
    {
      key: "gemHunter",
      icon: "💎",
      name: "ach.gemHunter",
      desc: "ach.gemHunterDesc",
      test: function (s) {
        return s.anyGem();
      },
    },
    {
      key: "deepDiver",
      icon: "⭐",
      name: "ach.deepDiver",
      desc: "ach.deepDiverDesc",
      test: function (s) {
        return s.anyThreeStars();
      },
    },
    {
      key: "moonExplorer",
      icon: "🌙",
      name: "ach.moonExplorer",
      desc: "ach.moonExplorerDesc",
      test: function (s) {
        return s.rangeDone(0, 4);
      },
    },
    {
      key: "marsExplorer",
      icon: "🔴",
      name: "ach.marsExplorer",
      desc: "ach.marsExplorerDesc",
      test: function (s) {
        return s.rangeDone(5, 10);
      },
    },
    {
      key: "voyager",
      icon: "🪐",
      name: "ach.voyager",
      desc: "ach.voyagerDesc",
      test: function (s) {
        return s.chapterDone(D.CHAPTERS[D.CHAPTERS.length - 1].id);
      },
    },
    {
      key: "grandChampion",
      icon: "🏆",
      name: "ach.grandChampion",
      desc: "ach.grandChampionDesc",
      test: function (s) {
        return s.completedCount() >= D.CHAPTERS.length;
      },
    },
    {
      key: "historian",
      icon: "📚",
      name: "ach.historian",
      desc: "ach.historianDesc",
      test: function (s) {
        return s.allRead();
      },
    },
    {
      key: "rescuer",
      icon: "🛠️",
      name: "ach.rescuer",
      desc: "ach.rescuerDesc",
      test: function (s) {
        return s.restoredCount() >= 5;
      },
    },
    {
      key: "archivist",
      icon: "🔭",
      name: "ach.archivist",
      desc: "ach.archivistDesc",
      test: function (s) {
        return s.usedArchive();
      },
    },
  ];
  /** Announce newly earned badges — one toast for a single badge,
      a single summary toast when several arrive at once. */
  function checkBadges() {
    const fresh = [];
    ACHIEVEMENTS.forEach(function (a) {
      let earned = false;
      try {
        earned = a.test(S);
      } catch (e) {
        earned = false;
      }
      if (earned && !S.seenBadge(a.key)) {
        S.markBadgeSeen(a.key);
        fresh.push(a);
      }
    });
    if (!fresh.length) return;
    window.setTimeout(function () {
      SFX.badge();
      if (fresh.length === 1) {
        UI.toast({
          icon: fresh[0].icon,
          tone: "gold",
          title: L("ach.unlocked"),
          body: L(fresh[0].name) + " — " + L(fresh[0].desc),
          duration: 5200,
        });
      } else {
        UI.toast({
          icon: fresh[0].icon,
          tone: "gold",
          title: L("ach.unlocked") + " (" + fresh.length + ")",
          body: fresh
            .map(function (a) {
              return a.icon + " " + L(a.name);
            })
            .join("  ·  "),
          duration: 6000,
        });
      }
    }, 900);
  }
  /* ============================================================
     HOME
     ============================================================ */
  function renderHome() {
    const done = S.completedCount();
    const next = S.nextChapter();
    const anyProgress = done > 0 || S.get().unlocked > 1;
    app.innerHTML = "";
    const descText = L("home.desc");
    const hero = el("header", { class: "hero" }, [
      el("div", { class: "hero-decor", "aria-hidden": "true" }, [
        el("span", { class: "deco d1", text: "🪐" }),
        el("span", { class: "deco d2", text: "🌙" }),
        el("span", { class: "deco d3", text: "🛰️" }),
        el("span", { class: "deco d4", text: "✨" }),
        el("span", { class: "deco d5", text: "☄️" }),
      ]),
      el("div", { class: "hero-badge", text: L("home.badge") }),
      el("h1", { class: "hero-title", text: L("home.title") }),
      el("p", { class: "hero-tag", text: L("home.tag") }),
      S.explorer()
        ? el("p", { class: "hero-hi", text: L("home.greeting", { name: S.explorer() }) })
        : null,
      el("div", { class: "hero-desc-row" }, [
        el("p", { class: "hero-desc", text: descText }),
        ttsBtn(descText, L("common.readAloud")) || document.createTextNode(""),
      ]),
      el("div", { class: "hero-actions" }, [
        el(
          "button",
          {
            class: "btn btn-primary btn-big",
            type: "button",
            text: anyProgress ? L("home.continue") : L("home.start"),
            onclick: function () {
              SFX.click();
              goChapter(next);
            },
          },
          []
        ),
        el(
          "button",
          {
            class: "btn btn-ghost",
            type: "button",
            text: L("home.map"),
            onclick: function () {
              SFX.click();
              const map = document.getElementById("map");
              if (map) map.scrollIntoView({ behavior: "smooth", block: "start" });
            },
          },
          []
        ),
        el(
          "button",
          {
            class: "btn btn-ghost",
            type: "button",
            text: L("home.museum"),
            onclick: function () {
              SFX.click();
              goMuseum();
            },
          },
          []
        ),
      ]),
      el("div", { class: "hero-progress" }, [
        el("span", {
          class: "hp-text",
          text: L("home.progress", { done: done, stars: S.totalStars() }),
        }),
        S.starlight() > 0
          ? el("span", {
              class: "hp-starlight",
              text: L("home.starlight", { n: S.starlight() }),
            })
          : null,
        el("div", { class: "hp-bar" }, [
          el("span", {
            class: "hp-fill",
            style: "width:" + Math.round((done / D.CHAPTERS.length) * 100) + "%",
          }, []),
        ]),
      ]),
      S.sandboxActive()
        ? el("div", { class: "hero-sandbox", role: "status" }, [
            el("span", { class: "sb-badge", text: L("set.sandboxBadge") }, []),
            el("span", { class: "sb-text", text: L("home.sandbox") }, []),
          ])
        : null,
    ]);
    app.appendChild(hero);
    // ---- DAILY MISSION FACT ----
    const factEntry = D.MUSEUM[D.dailyFactIndex()];
    if (factEntry) {
      app.appendChild(
        el("section", { class: "daily-fact card reveal", "aria-label": L("home.factTitle") }, [
          el("div", { class: "df-head" }, [
            el("h2", { class: "df-title", text: L("home.factTitle") }, []),
            el("span", { class: "df-new", text: L("home.factNew") }, []),
          ]),
          el("p", { class: "df-name", text: factEntry.pin + " " + factEntry.name }, []),
          el("p", { class: "df-text", text: factEntry.fact }, []),
          el("div", { class: "df-foot" }, [
            ttsBtn(factEntry.name + ". " + factEntry.fact, L("common.readAloud")) ||
              document.createTextNode(""),
            el("span", { class: "df-src", text: "NSSDCA · " + L("mc.source") }, []),
          ]),
        ])
      );
    }
    // ---- HOW IT WORKS ----
    app.appendChild(
      el("section", { class: "how card reveal", "aria-label": L("home.howTitle") }, [
        el("h2", { class: "section-title", text: L("home.howTitle") }, []),
        el("div", { class: "how-grid" }, [
          step("1️⃣", L("home.how1t"), L("home.how1d")),
          step("2️⃣", L("home.how2t"), L("home.how2d")),
          step("3️⃣", L("home.how3t"), L("home.how3d")),
        ]),
      ])
    );
    // ---- MISSION MAP ----
    const map = el("section", { class: "map-section reveal", id: "map", "aria-label": L("home.mapTitle") }, [
      el("h2", { class: "section-title", text: L("home.mapTitle") }, []),
      el("p", { class: "section-sub", text: L("home.mapSub") }, []),
    ]);
    const locations = [
      { name: "The Moon", pin: "🌙", key: "moon" },
      { name: "Mars", pin: "🔴", key: "mars" },
      { name: "Deep Space", pin: "🪐", key: "deep" },
    ];
    locations.forEach(function (loc) {
      const grid = el("div", { class: "map-group loc-" + loc.key }, [
        el("h3", { class: "map-loc" }, [
          el("span", { class: "loc-pin", text: loc.pin, "aria-hidden": "true" }),
          document.createTextNode(" " + loc.name),
        ]),
        el("div", { class: "map-grid" }, []),
      ]);
      const g = grid.querySelector(".map-grid");
      D.CHAPTERS.filter(function (c) {
        return c.location === loc.name;
      }).forEach(function (c) {
        g.appendChild(chapterCard(c));
      });
      map.appendChild(grid);
    });
    app.appendChild(map);
    // ---- MUSEUM + MISSION CONTROL PROMO ----
    const found = D.MUSEUM.filter(function (e) {
      return S.chapterDone(e.chapter);
    }).length;
    app.appendChild(
      el("section", { class: "promo-row reveal" }, [
        promoCard("🛰️", L("home.museum"), L("mus.sub"), found, D.MUSEUM.length, goMuseum),
        promoCard("🛰️", L("home.control"), L("mc.sub"), null, null, goControl),
        promoCard("👨‍👩‍👧", L("home.report"), L("rep.sub"), null, null, goReport),
      ])
    );
    // ---- ACHIEVEMENTS ----
    const allDone = done >= D.CHAPTERS.length;
    const ach = el(
      "section",
      { class: "ach-section reveal", id: "achievements", "aria-label": L("home.achTitle") },
      [
        el("h2", { class: "section-title", text: L("home.achTitle") }),
        el("p", { class: "section-sub", text: L("home.achSub") }),
        el(
          "div",
          { class: "ach-grid" },
          ACHIEVEMENTS.map(function (a) {
            const got = a.test(S);
            return el("div", { class: "ach-card" + (got ? " got" : "") }, [
              el("div", { class: "ach-icon", text: got ? a.icon : "🔒", "aria-hidden": "true" }, []),
              el("h3", { class: "ach-name", text: L(a.name) }),
              el("p", { class: "ach-desc", text: L(a.desc) }),
            ]);
          })
        ),
      ]
    );
    if (allDone) {
      ach.appendChild(
        el("div", { class: "cert-cta" }, [
          el(
            "button",
            {
              class: "btn btn-primary btn-big glow",
              type: "button",
              text: L("home.certCta"),
              onclick: function () {
                SFX.click();
                goCertificate();
              },
            },
            []
          ),
        ])
      );
    }
    app.appendChild(ach);
    // ---- FOR GROWN-UPS (verified challenge info only) ----
    const ch = D.CHALLENGE;
    app.appendChild(
      el("section", { class: "grown card reveal", id: "grown-ups" }, [
        el("h2", { class: "section-title", text: L("home.grownTitle") }, []),
        el("p", { class: "grown-title", text: L("home.grownChallenge", { title: ch.title }) }),
        el("div", { class: "tag-row" }, [
          ...ch.difficulty.map(function (t) {
            return el("span", { class: "tag", text: "Difficulty: " + t });
          }),
          ...ch.subjects.map(function (t) {
            return el("span", { class: "tag", text: t });
          }),
        ]),
        el("p", { class: "grown-blurb", text: ch.blurb }),
        el("h3", { class: "grown-h3", text: L("home.grownSources") }, []),
        el("p", { class: "grown-src", text: ch.dataSource }),
        el("p", { class: "grown-src" }, [
          document.createTextNode(L("home.grownFull")),
          el("a", {
            href: ch.url,
            target: "_blank",
            rel: "noopener noreferrer",
            text: L("home.grownLink"),
          }, []),
          document.createTextNode("."),
        ]),
        el("p", { class: "grown-src" }, [
          document.createTextNode(L("home.grownInspired")),
          el("a", {
            href: "https://krillion.io/",
            target: "_blank",
            rel: "noopener noreferrer",
            text: L("home.grownKrillion"),
          }, []),
          document.createTextNode(L("home.grownRare")),
        ]),
      ])
    );
    // (attribution footer is added globally by route())
    initReveal(app);
    focusMain();
    checkBadges();
  }
  /* ---------- global attribution footer (every view) ---------- */
  function renderFooter() {
    const ch = D.CHALLENGE;
    return el("footer", { class: "site-footer" }, [
      el("div", { class: "footer-links" }, [
        el("a", { class: "footer-link", href: "#/about", text: L("foot.about") }, []),
      ]),
      el("p", { text: L("home.footer1") }),
      el("p", { class: "footer-fund", text: ch.funding }),
      el("p", { class: "footer-note", text: L("foot.note") }),
    ]);
  }

  /* ---------- About & Sources + accessibility + team ---------- */
  function renderAbout() {
    app.innerHTML = "";
    const ch = D.CHALLENGE;
    const sources = [
      { label: L("about.srcChallenge"), url: ch.url },
      { label: L("about.srcNssdca"), url: "https://nssdc.gsfc.nasa.gov/" },
      { label: L("about.srcKrillion"), url: "https://krillion.io/" },
      { label: L("about.srcSpacePlace"), url: "https://spaceplace.nasa.gov/" },
    ];
    const TEAM = [
      { name: "Damien", role: L("team.leadRole"), lead: true },
      { name: "Keane", role: L("team.roleArt") },
      { name: "Chung Hang", role: L("team.roleGame") },
      { name: "Sean", role: L("team.roleResearch") },
    ];
    app.appendChild(pageHead(L("about.back"), goHome, L("about.kicker")));
    app.appendChild(el("section", { class: "about card reveal" }, [
      el("h1", { class: "section-title", text: L("about.title") }),
      el("p", { class: "section-sub", text: L("about.sub") }),
      el("h2", { class: "about-h2", text: L("about.project") }),
      el("p", { class: "about-p", text: L("about.projectBody") }),
      el("h2", { class: "about-h2", text: L("about.who") }),
      el("p", { class: "about-p", text: L("about.whoBody") }),
      el("h2", { class: "about-h2", text: L("about.sources") }),
      el("p", { class: "about-p", text: L("about.sourcesIntro") }),
      el("ul", { class: "about-list" }, sources.map(function (s) {
        return el("li", {}, [
          el("a", { href: s.url, target: "_blank", rel: "noopener noreferrer", text: s.label }, []),
        ]);
      })),
      el("p", { class: "about-p", text: L("about.sourcesNote") }),
      el("h2", { class: "about-h2", text: L("about.accessibility") }),
      el("p", { class: "about-p", text: L("about.accessibilityBody") }),
      el("h2", { class: "about-h2", text: L("about.privacy") }),
      el("p", { class: "about-p", text: L("about.privacyBody") }),
      el("h2", { class: "about-h2", text: L("about.team") }),
      el("p", { class: "about-p", text: L("about.teamNote") }),
      el("ul", { class: "team-list" }, TEAM.map(function (m) {
        return el("li", { class: "team-item" + (m.lead ? " lead" : "") }, [
          el("span", { class: "team-name", text: m.name + (m.lead ? "  \u2605" : "") }),
          el("span", { class: "team-role", text: m.role }),
        ]);
      })),
      el("h2", { class: "about-h2", text: L("about.credits") }),
      el("p", { class: "about-p", text: L("about.creditsBody") }),
      el("p", { class: "about-fund", text: ch.funding }),
    ]));
    initReveal(app);
    focusMain();
  }

  function promoCard(icon, title, body, found, total, onClick) {
    return el("div", { class: "promo card reveal" }, [
      el("div", { class: "promo-icon", text: icon, "aria-hidden": "true" }, []),
      el("h3", { class: "promo-title", text: title }, []),
      el("p", { class: "promo-text", text: body }, []),
      found !== null && found !== undefined
        ? el("div", { class: "promo-count", text: "🔎 " + found + " / " + total }, [])
        : null,
      el(
        "button",
        {
          class: "btn btn-ghost btn-small",
          type: "button",
          text: "▶",
          "aria-label": title,
          onclick: function () {
            SFX.click();
            onClick();
          },
        },
        []
      ),
    ]);
  }
  // fade-up reveal on scroll (with safe fallbacks) — listeners are cleaned up
  let revealIO = null;
  let revealCleanups = [];
  function initReveal(root) {
    revealCleanups.forEach(function (fn) {
      try {
        fn();
      } catch (e) {}
    });
    revealCleanups = [];
    if (revealIO) {
      revealIO.disconnect();
      revealIO = null;
    }
    const items = Array.from((root || document).querySelectorAll(".reveal"));
    const reduced =
      S.lessMotion() ||
      (window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach(function (i) {
        i.classList.add("in");
      });
      return;
    }
    let pending = items.slice();
    function check() {
      if (!pending.length) return;
      const vh = window.innerHeight;
      pending = pending.filter(function (i) {
        if (i.classList.contains("in")) return false;
        const r = i.getBoundingClientRect();
        if (r.top < vh - 30) {
          i.classList.add("in");
          return false;
        }
        return true;
      });
    }
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    revealCleanups.push(function () {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    });
    window.setTimeout(check, 900);
    check();
    revealIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            revealIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    items.forEach(function (i) {
      revealIO.observe(i);
    });
  }
  /* ============================================================
     LOCKED screen
     ============================================================ */
  function renderLocked(chapter) {
    app.innerHTML = "";
    app.appendChild(
      el("div", { class: "locked card" }, [
        el("div", { class: "locked-icon", text: "🔒" }),
        el("h1", { text: L("locked.title", { n: chapter.id }) }),
        el("p", { text: L("locked.body", { p: chapter.id - 1 }) }),
        el("div", { class: "btn-row" }, [
          el(
            "button",
            {
              class: "btn btn-primary btn-big",
              type: "button",
              text: L("locked.go", { p: chapter.id - 1 }),
              onclick: function () {
                SFX.click();
                goChapter(chapter.id - 1);
              },
            },
            []
          ),
          el(
            "button",
            {
              class: "btn btn-ghost",
              type: "button",
              text: L("locked.map"),
              onclick: goHome,
            },
            []
          ),
        ]),
      ])
    );
    focusMain();
  }
  /* ============================================================
     COMIC READER
     ============================================================ */
  function renderComic(chapter) {
    app.innerHTML = "";
    const total = chapter.pages.length;
    const wasRead = S.chapterRead(chapter.id);
    // resume where they stopped, unless they already finished the chapter
    let page = wasRead ? 0 : Math.min(S.lastPage(chapter.id) || 0, total - 1);
    const stage = el("div", { class: "comic-stage" }, []);
    const captionBox = el("div", { class: "comic-caption" }, []);
    const narrationBox = el("div", { class: "comic-narration" }, []);
    const dots = el("div", { class: "comic-dots", "aria-label": "Comic pages" }, []);
    const prevBtn = el("button", { class: "btn btn-ghost comic-nav", type: "button", text: L("comic.back") }, []);
    const nextBtn = el("button", { class: "btn btn-primary comic-nav", type: "button", text: L("comic.next") }, []);
    const playWrap = el("div", { class: "comic-play" }, []);
    const zoomBar = el("div", { class: "comic-zoom" }, []);
    let zoom = 1;
    function showPlay() {
      playWrap.innerHTML = "";
      playWrap.appendChild(
        el(
          "button",
          {
            class: "btn btn-primary btn-big glow",
            type: "button",
            text:
              chapter.id >= D.CHAPTERS[D.CHAPTERS.length - 1].id
                ? L("comic.finalPlay")
                : L("comic.play", { n: chapter.id + 1 }),
            onclick: function () {
              SFX.click();
              goPlay(chapter.id);
            },
          },
          []
        )
      );
    }
    function paintZoom() {
      zoomBar.innerHTML = "";
      zoomBar.appendChild(
        el(
          "button",
          {
            class: "btn btn-ghost btn-small",
            type: "button",
            text: "🔍 −",
            "aria-label": L("comic.zoomOut"),
            disabled: zoom <= 1,
            onclick: function () {
              zoom = Math.max(1, +(zoom - 0.25).toFixed(2));
              SFX.click();
              applyZoom();
            },
          },
          []
        )
      );
      zoomBar.appendChild(
        el("span", { class: "zoom-pct", text: Math.round(zoom * 100) + "%" }, [])
      );
      zoomBar.appendChild(
        el(
          "button",
          {
            class: "btn btn-ghost btn-small",
            type: "button",
            text: "🔍 +",
            "aria-label": L("comic.zoomIn"),
            disabled: zoom >= 2.5,
            onclick: function () {
              zoom = Math.min(2.5, +(zoom + 0.25).toFixed(2));
              SFX.click();
              applyZoom();
            },
          },
          []
        )
      );
      zoomBar.appendChild(
        el(
          "button",
          {
            class: "btn btn-ghost btn-small",
            type: "button",
            text: "↺",
            "aria-label": L("comic.zoomReset"),
            onclick: function () {
              zoom = 1;
              SFX.click();
              applyZoom();
            },
          },
          []
        )
      );
    }
    function applyZoom() {
      const img = stage.querySelector(".comic-img");
      if (img) img.style.transform = "scale(" + zoom + ")";
      paintZoom();
    }
    function paint() {
      stage.innerHTML = "";
      const p = chapter.pages[page];
      const img = el("img", {
        class: "comic-img",
        src: p.src,
        alt:
          L("comic.kicker", { pin: chapter.pin, n: chapter.id, loc: chapter.location }) +
          " — " +
          (p.narration || L("comic.placeholderTitle", { n: page + 1, total: total })),
        loading: "eager",
      }, []);
      img.style.transform = "scale(" + zoom + ")";
      img.addEventListener("error", function () {
        if (img.parentNode === stage) {
          stage.innerHTML = "";
          stage.appendChild(
            el("div", { class: "comic-placeholder" }, [
              el("div", { class: "cp-icon", text: "🎨", "aria-hidden": "true" }, []),
              el("p", { class: "cp-title", text: L("comic.placeholderTitle", { n: page + 1, total: total }) }),
              el("p", { class: "cp-sub", text: L("comic.placeholderSub", { src: p.src }) }),
            ])
          );
        }
      });
      stage.appendChild(img);
      // caption (short line under the art)
      captionBox.innerHTML = "";
      if (p.caption) {
        captionBox.appendChild(el("p", { class: "caption-text", text: p.caption }, []));
      }
      // narration (the read-aloud story text for this page)
      narrationBox.innerHTML = "";
      if (p.narration) {
        narrationBox.appendChild(
          el("div", { class: "narration-row" }, [
            el("span", { class: "narration-label", text: "💬 " + L("comic.narration") }, []),
            ttsBtn(p.narration, L("comic.captionBtn")) || document.createTextNode(""),
          ])
        );
        narrationBox.appendChild(el("p", { class: "narration-text", text: p.narration }, []));
      }
      // dots
      dots.innerHTML = "";
      for (let i = 0; i < total; i++) {
        dots.appendChild(
          el("span", {
            class: "comic-dot" + (i === page ? " on" : "") + (i < page ? " seen" : ""),
            "aria-label": "Page " + (i + 1),
          }, [])
        );
      }
      prevBtn.disabled = page === 0;
      nextBtn.textContent = page === total - 1 ? L("comic.done") : L("comic.next");
      S.setLastPage(chapter.id, page);
      if (page === total - 1) {
        S.markRead(chapter.id);
        showPlay();
      } else {
        playWrap.innerHTML = "";
        if (wasRead) showPlay();
      }
    }
    prevBtn.addEventListener("click", function () {
      if (page > 0) {
        page--;
        SFX.page();
        paint();
      }
    });
    nextBtn.addEventListener("click", function () {
      if (page < total - 1) {
        page++;
        SFX.page();
        paint();
      } else {
        S.markRead(chapter.id);
        SFX.click();
        showPlay();
        playWrap.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
    // swipe to turn the page
    let touchX = 0;
    let touchY = 0;
    stage.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches.length !== 1) return;
        touchX = e.touches[0].clientX;
        touchY = e.touches[0].clientY;
      },
      { passive: true }
    );
    stage.addEventListener(
      "touchend",
      function (e) {
        if (!e.changedTouches.length) return;
        const dx = e.changedTouches[0].clientX - touchX;
        const dy = e.changedTouches[0].clientY - touchY;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          if (dx < 0) nextBtn.click();
          else prevBtn.click();
        }
      },
      { passive: true }
    );
    // header
    const head = el("div", { class: "comic-head" }, [
      el("div", { class: "comic-head-left" }, [
        el(
          "button",
          {
            class: "btn btn-ghost btn-small",
            type: "button",
            text: L("comic.map"),
            onclick: function () {
              SFX.click();
              goHome();
            },
          },
          []
        ),
        el("span", {
          class: "comic-kicker",
          text: L("comic.kicker", { pin: chapter.pin, n: chapter.id, loc: chapter.location }),
        }, []),
      ]),
      el("div", { class: "comic-head-right" }, [
        el("span", { class: "comic-title", text: chapter.title }, []),
        ttsBtn(chapter.brief, L("comic.briefBtn")) || document.createTextNode(""),
      ]),
    ]);
    const equip = el("div", { class: "comic-equip" }, [
      el("span", { class: "equip-label", text: L("comic.inStory") }, []),
      ...chapter.equipment.map(function (e) {
        return el("span", { class: "equip-pill", text: e });
      }),
    ]);
    const pager = el("div", { class: "comic-pager" }, [prevBtn, dots, nextBtn]);
    app.appendChild(head);
    app.appendChild(
      el("div", { class: "comic card" }, [
        el("h1", { class: "sr-only", text: L("map.chapter", { n: chapter.id, title: chapter.title }) }, []),
        el("div", { class: "comic-brief" }, [
          el("p", { class: "brief-text", text: chapter.brief }, []),
          ttsBtn(chapter.brief, L("comic.briefBtn")) || document.createTextNode(""),
        ]),
        equip,
        stage,
        captionBox,
        narrationBox,
        pager,
        el("div", { class: "comic-tools" }, [
          zoomBar,
          el("span", { class: "comic-swipe-hint", text: L("comic.hintSwipe") }, []),
        ]),
        playWrap,
      ])
    );
    paintZoom();
    paint();
    focusMain();
    app.__keys = function (e) {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowLeft") prevBtn.click();
      if (e.key === "ArrowRight") nextBtn.click();
    };
    document.addEventListener("keydown", app.__keys);
  }
  /* ============================================================
     PLAY (Deep Space Dive)
     ============================================================ */
  function renderPlay(chapter) {
    if (app.__keys) {
      document.removeEventListener("keydown", app.__keys);
      app.__keys = null;
    }
    app.innerHTML = "";
    const head = el("div", { class: "comic-head play-head" }, [
      el(
        "button",
        {
          class: "btn btn-ghost btn-small",
          type: "button",
          text: L("game.back"),
          onclick: function () {
            SFX.click();
            goChapter(chapter.id);
          },
        },
        []
      ),
      el("span", {
        class: "comic-kicker",
        text: chapter.pin + " Chapter " + chapter.id + " · " + L("game.kicker"),
      }),
    ]);
    app.appendChild(head);
    const holder = el("div", { class: "game-holder" }, []);
    app.appendChild(holder);
    focusMain();
    window.NES_GAME.start(holder, chapter, CTX);
  }
  /* ============================================================
     SPACE JUNK MUSEUM
     ============================================================ */
  function nssdcLink(id) {
    return (
      "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=" + encodeURIComponent(id)
    );
  }
  function museumCard(e) {
    const unlocked = S.chapterDone(e.chapter);
    if (!unlocked) {
      return el("div", { class: "museum-card undiscovered" }, [
        el("div", { class: "mc-pin", text: "🔒", "aria-hidden": "true" }, []),
        el("h4", { class: "mc-name", text: L("mus.undiscovered") }),
        el("p", { class: "mc-fact", text: L("mus.finishTo", { n: e.chapter }) }),
        el("span", { class: "mc-chip", text: "Chapter " + e.chapter }, []),
      ]);
    }
    const recs = (e.nssdcKeys || [])
      .map(function (k) {
        return NC ? NC.find(k) : null;
      })
      .filter(Boolean);
    const restored = S.isRestored(e.key);
    const kids = [
      el("div", { class: "mc-top" }, [
        el("span", { class: "mc-pin", text: restored ? "🚀" : e.pin, "aria-hidden": "true" }, []),
        el("h4", { class: "mc-name", text: e.name }, []),
        el("span", { class: "mc-chip", text: "Ch " + e.chapter }, []),
      ]),
      el("p", { class: "mc-fact", text: e.fact }, []),
    ];
    if (recs.length) {
      recs.forEach(function (rec) {
        kids.push(
          el("div", { class: "mc-nssdc" }, [
            el("span", { class: "mc-nssdc-id", text: L("mus.nssdc", { id: rec.nssdcId }) }, []),
            el("span", { class: "mc-nssdc-date", text: "🚀 " + (rec.launchDate || "") }, []),
          ])
        );
      });
    }
    if (e.nssdcNote) {
      kids.push(el("p", { class: "mc-nssdc-note", text: e.nssdcNote }, []));
    }
    kids.push(
      el("div", { class: "mc-foot" }, [
        el("span", { class: "mc-src", text: L("mus.official") }, []),
        ttsBtn(e.name + ". " + e.fact, L("mus.readBtn")) || document.createTextNode(""),
      ])
    );
    if (restored) {
      kids.push(el("div", { class: "mc-restored", text: L("mus.restored") }, []));
    } else if (S.starlight() > 0) {
      kids.push(
        el(
          "button",
          {
            class: "btn btn-primary btn-small mc-restore",
            type: "button",
            text: L("mus.restore"),
            onclick: function () {
              if (S.restoreExhibit(e.key)) {
                SFX.restore();
                UI.toast({
                  icon: "🚀",
                  tone: "gold",
                  title: L("toast.restored"),
                  body: e.name + " — " + L("mus.starlight", { n: S.starlight() }),
                });
                renderMuseum();
                checkBadges();
              }
            },
          },
          []
        )
      );
    } else {
      kids.push(el("div", { class: "mc-lockhint", text: L("mus.starlight", { n: 0 }) }, []));
    }
    recs.forEach(function (rec) {
      kids.push(
        el(
          "a",
          {
            class: "mc-link",
            href: nssdcLink(rec.nssdcId),
            target: "_blank",
            rel: "noopener noreferrer",
            text: L("mus.viewRecord") + " · " + rec.name,
          },
          []
        )
      );
    });
    if (NC && NC.extraLinks) {
      NC.extraLinks().forEach(function (x) {
        kids.push(
          el(
            "a",
            {
              class: "mc-link",
              href: x.url,
              target: "_blank",
              rel: "noopener noreferrer",
              text: "📄 " + x.label,
            },
            []
          )
        );
      });
    }
    return el("div", { class: "museum-card discovered" + (restored ? " is-restored" : "") }, kids);
  }
  function renderMuseum() {
    app.innerHTML = "";
    const total = D.MUSEUM.length;
    const found = D.MUSEUM.filter(function (e) {
      return S.chapterDone(e.chapter);
    }).length;
    const restored = S.restoredCount();
    app.appendChild(pageHead(L("locked.map"), goHome, L("mus.title")));
    app.appendChild(
      el("div", { class: "museum-head card reveal" }, [
        el("h1", { class: "section-title", text: L("mus.title") }),
        el("p", { class: "section-sub", text: L("mus.sub") }),
        el("div", { class: "museum-count", text: L("mus.count", { f: found, t: total }) }),
        el("div", { class: "hp-bar museum-bar" }, [
          el("span", {
            class: "hp-fill",
            style: "width:" + Math.round((found / total) * 100) + "%",
          }, []),
        ]),
        el("div", { class: "museum-tools" }, [
          el("span", { class: "hp-starlight", text: L("mus.starlight", { n: S.starlight() }) }, []),
          el("span", { class: "museum-restored-count", text: "🛠️ " + restored + " / " + total }, []),
          el(
            "button",
            {
              class: "btn btn-ghost btn-small",
              type: "button",
              text: L("mus.control"),
              onclick: function () {
                SFX.click();
                goControl();
              },
            },
            []
          ),
        ]),
        el("p", { class: "museum-blurb", text: L("mus.missionControlBlurb") }, []),
      ])
    );
    const groups = [
      { name: "The Moon", pin: "🌙" },
      { name: "Mars", pin: "🔴" },
      { name: "Deep Space", pin: "🪐" },
    ];
    groups.forEach(function (g) {
      const section = el("section", { class: "map-group" }, [
        el("h3", { class: "map-loc" }, [
          el("span", { class: "loc-pin", text: g.pin, "aria-hidden": "true" }),
          document.createTextNode(" " + g.name),
        ]),
        el("div", { class: "museum-grid" }, []),
      ]);
      const grid = section.querySelector(".museum-grid");
      D.MUSEUM.filter(function (e) {
        return e.location === g.name;
      }).forEach(function (e) {
        grid.appendChild(museumCard(e));
      });
      app.appendChild(section);
    });
    app.appendChild(el("p", { class: "museum-src", text: L("mus.src") }));
    initReveal(app);
    focusMain();
  }
  /* ============================================================
     MISSION CONTROL — NSSDCA records
     ============================================================ */
  function renderControl() {
    app.innerHTML = "";
    app.appendChild(pageHead(L("locked.map"), goHome, L("topbar.missionControl")));
    const results = el("div", { class: "mc-results" }, []);
    const searchInput = el("input", {
      class: "mc-search",
      type: "search",
      placeholder: L("mc.search"),
      "aria-label": L("mc.search"),
      autocomplete: "off",
      spellcheck: "false",
    }, []);
    function draw(list, query) {
      results.innerHTML = "";
      results.appendChild(
        el("p", {
          class: "mc-count",
          text: query ? L("mc.results", { n: list.length }) : L("mc.browse"),
        }, [])
      );
      if (!list.length) {
        results.appendChild(el("p", { class: "mc-empty", text: L("mc.noResults") }, []));
        return;
      }
      const grid = el("div", { class: "mc-grid" }, []);
      list.forEach(function (rec) {
        grid.appendChild(
          el("div", { class: "mc-card" }, [
            el("h3", { class: "mc-card-name", text: rec.name }, []),
            el("p", { class: "mc-card-id", text: L("mc.nssdc") + ": " + rec.nssdcId }, []),
            el("dl", { class: "mc-fields" }, [
              el("dt", { text: L("mc.launch") }, []),
              el("dd", { text: rec.launchDate || L("mc.unknown") }, []),
              el("dt", { text: L("mc.mass") }, []),
              el("dd", { text: rec.mass || L("mc.unknown") }, []),
              el("dt", { text: L("mc.status") }, []),
              el("dd", { text: rec.where || rec.disciplines || L("mc.unknown") }, []),
            ]),
            rec.description
              ? el("p", { class: "mc-card-desc", text: rec.description }, [])
              : null,
            el(
              "a",
              {
                class: "btn btn-ghost btn-small mc-card-link",
                href: nssdcLink(rec.nssdcId),
                target: "_blank",
                rel: "noopener noreferrer",
                text: L("mc.open"),
                onclick: function () {
                  S.markArchiveUsed();
                  checkBadges();
                },
              },
              []
            ),
          ])
        );
      });
      results.appendChild(grid);
    }
    const all = NC ? NC.all() : [];
    searchInput.addEventListener("input", function () {
      const q = searchInput.value.trim();
      draw(q ? NC.search(q) : all, q);
    });
    app.appendChild(
      el("div", { class: "mc-head card reveal" }, [
        el("h1", { class: "section-title", text: L("mc.title") }),
        el("p", { class: "section-sub", text: L("mc.sub") }),
        el("div", { class: "mc-search-row" }, [
          searchInput,
          el(
            "button",
            {
              class: "btn btn-primary",
              type: "button",
              text: L("mc.searchBtn"),
              onclick: function () {
                const q = searchInput.value.trim();
                draw(q ? NC.search(q) : all, q);
              },
            },
            []
          ),
        ]),
        el("p", { class: "mc-offline-note", text: L("mc.offline") }, []),
      ])
    );
    app.appendChild(results);
    draw(all, "");
    initReveal(app);
    focusMain();
  }
  /* ============================================================
     COLLECTION ALBUM
     ============================================================ */
  function renderAlbum() {
    app.innerHTML = "";
    app.appendChild(pageHead(L("locked.map"), goHome, L("topbar.album")));
    const found = D.MUSEUM.filter(function (e) {
      return S.chapterDone(e.chapter);
    }).length;
    app.appendChild(
      el("div", { class: "album-head card reveal" }, [
        el("h1", { class: "section-title", text: L("alb.title") }),
        el("p", { class: "section-sub", text: L("alb.sub") }),
        el("div", { class: "album-count", text: L("alb.ring", { f: found, t: D.MUSEUM.length }) }, []),
        el("div", { class: "hp-bar" }, [
          el("span", {
            class: "hp-fill",
            style: "width:" + Math.round((found / D.MUSEUM.length) * 100) + "%",
          }, []),
        ]),
      ])
    );
    const grid = el("div", { class: "album-grid" }, []);
    D.MUSEUM.forEach(function (e, i) {
      const known = S.chapterDone(e.chapter);
      const restored = S.isRestored(e.key);
      const rec = NC ? NC.find(e.key) : null;
      const ringPct = restored ? 100 : known ? 55 : 8;
      grid.appendChild(
        el("div", {
          class:
            "album-card" + (known ? " known" : " unknown") + (restored ? " restored" : ""),
          style: "--ring:" + ringPct + "%;--i:" + i,
        }, [
          el("div", { class: "album-ring", "aria-hidden": "true" }, [
            el("span", { class: "album-ring-icon", text: known ? (restored ? "🚀" : e.pin) : "🔒" }, []),
          ]),
          el("h3", { class: "album-name", text: known ? e.name : L("alb.locked") }, []),
          el("p", {
            class: "album-state",
            text: restored ? L("alb.restored") : known ? L("alb.discovered") : L("alb.empty"),
          }, []),
          rec ? el("p", { class: "album-id", text: rec.nssdcId }, []) : null,
          known
            ? el(
                "button",
                {
                  class: "btn btn-ghost btn-small",
                  type: "button",
                  text: L("alb.open"),
                  onclick: function () {
                    SFX.click();
                    goMuseum();
                  },
                },
                []
              )
            : null,
        ])
      );
    });
    app.appendChild(grid);
    app.appendChild(
      el("div", { class: "btn-row" }, [
        el(
          "button",
          {
            class: "btn btn-primary",
            type: "button",
            text: L("cmp.title"),
            onclick: function () {
              SFX.click();
              goCompare();
            },
          },
          []
        ),
      ])
    );
    initReveal(app);
    focusMain();
  }
  /* ============================================================
     COMPARE TWO DERELICTS
     ============================================================ */
  function renderCompare() {
    app.innerHTML = "";
    app.appendChild(pageHead(L("cmp.back"), goHome, L("topbar.missionControl")));
    const all = NC ? NC.all() : [];
    const sel1 = el("select", { class: "cmp-select", "aria-label": L("cmp.pick") }, []);
    const sel2 = el("select", { class: "cmp-select", "aria-label": L("cmp.pick2") }, []);
    all.forEach(function (r) {
      sel1.appendChild(el("option", { value: r.key, text: r.name }, []));
      sel2.appendChild(el("option", { value: r.key, text: r.name }, []));
    });
    if (all.length > 1) {
      sel1.value = all[0].key;
      sel2.value = all[1].key;
    }
    const table = el("div", { class: "cmp-table" }, []);
    function fieldRow(label, a, b) {
      return el("div", { class: "cmp-row" }, [
        el("div", { class: "cmp-cell" }, [el("span", { class: "cmp-label", text: label }, []), el("span", { class: "cmp-value", text: a || L("mc.unknown") }, [])]),
        el("div", { class: "cmp-cell" }, [el("span", { class: "cmp-label", text: label }, []), el("span", { class: "cmp-value", text: b || L("mc.unknown") }, [])]),
      ]);
    }
    function draw() {
      const a = NC ? NC.find(sel1.value) : null;
      const b = NC ? NC.find(sel2.value) : null;
      table.innerHTML = "";
      if (!a || !b) {
        table.appendChild(el("p", { class: "mc-empty", text: L("cmp.empty") }, []));
        return;
      }
      table.appendChild(
        el("div", { class: "cmp-heads" }, [
          el("div", { class: "cmp-cell cmp-name" }, [el("h2", { text: a.name }, []), el("p", { text: a.nssdcId }, [])]),
          el("div", { class: "cmp-cell cmp-name" }, [el("h2", { text: b.name }, []), el("p", { text: b.nssdcId }, [])]),
        ])
      );
      table.appendChild(fieldRow(L("mc.launch"), a.launchDate, b.launchDate));
      table.appendChild(fieldRow(L("mc.mass"), a.mass, b.mass));
      table.appendChild(fieldRow(L("mc.status"), a.where || a.disciplines, b.where || b.disciplines));
      table.appendChild(
        el("div", { class: "cmp-row" }, [
          el("div", { class: "cmp-cell cmp-desc" }, [el("p", { text: a.description || "" }, [])]),
          el("div", { class: "cmp-cell cmp-desc" }, [el("p", { text: b.description || "" }, [])]),
        ])
      );
    }
    sel1.addEventListener("change", draw);
    sel2.addEventListener("change", draw);
    app.appendChild(
      el("div", { class: "cmp-head card reveal" }, [
        el("h1", { class: "section-title", text: L("cmp.title") }),
        el("p", { class: "section-sub", text: L("cmp.sub") }),
        el("div", { class: "cmp-pickers" }, [
          el("label", { class: "cmp-label" }, [
            document.createTextNode(L("cmp.pick")),
            sel1,
          ]),
          el(
            "button",
            {
              class: "btn btn-ghost btn-small cmp-swap",
              type: "button",
              text: L("cmp.swap"),
              "aria-label": L("cmp.swap"),
              onclick: function () {
                const t = sel1.value;
                sel1.value = sel2.value;
                sel2.value = t;
                SFX.click();
                draw();
              },
            },
            []
          ),
          el("label", { class: "cmp-label" }, [
            document.createTextNode(L("cmp.pick2")),
            sel2,
          ]),
        ]),
      ])
    );
    app.appendChild(table);
    draw();
    initReveal(app);
    focusMain();
  }
  /* ============================================================
     GROWN-UP PROGRESS REPORT
     ============================================================ */
  function renderReport() {
    app.innerHTML = "";
    app.appendChild(pageHead(L("rep.back"), goHome, L("topbar.report")));
    const done = S.completedCount();
    const stars = S.totalStars();
    const found = D.MUSEUM.filter(function (e) {
      return S.chapterDone(e.chapter);
    }).length;
    const badges = ACHIEVEMENTS.filter(function (a) {
      return a.test(S);
    });
    app.appendChild(
      el("div", { class: "report card reveal" }, [
        el("h1", { class: "section-title", text: L("rep.title") }),
        el("p", { class: "section-sub", text: L("rep.sub") }),
        el("p", { class: "report-name" }, [
          el("strong", { text: L("rep.name") + ": " }, []),
          document.createTextNode(S.explorer() || "—"),
        ]),
        el("div", { class: "report-stats" }, [
          statTile("📖", L("rep.comics"), done + " / " + D.CHAPTERS.length),
          statTile("🤿", L("rep.dives"), done + " / " + D.CHAPTERS.length),
          statTile("⭐", L("rep.stars"), stars + " / " + (D.CHAPTERS.length * 3)),
          statTile("🔎", L("rep.exhibits"), found + " / " + D.MUSEUM.length),
          statTile("🛠️", L("rep.restored"), S.restoredCount() + " / " + D.MUSEUM.length),
          statTile("🏅", L("rep.badges"), badges.length + " / " + ACHIEVEMENTS.length),
        ]),
        el("h2", { class: "report-h2", text: L("rep.chapterTable") }, []),
        el("table", { class: "report-table" }, [
          el("thead", {}, [
            el("tr", {}, [
              el("th", { text: L("rep.chapter") }, []),
              el("th", { text: L("rep.equipment") }, []),
              el("th", { text: L("rep.read") }, []),
              el("th", { text: L("rep.dive") }, []),
              el("th", { text: L("rep.starsCol") }, []),
            ]),
          ]),
          el(
            "tbody",
            {},
            D.CHAPTERS.map(function (c) {
              const res = S.result(c.id);
              return el("tr", {}, [
                el("td", { text: c.id + ". " + c.title }, []),
                el("td", { text: c.equipment.join(", ") }, []),
                el("td", { text: S.chapterRead(c.id) ? "✅" : "—" }, []),
                el("td", { text: res && res.done ? "✅ " + res.bestDepth + " m" : "—" }, []),
                el("td", { text: starString(res ? res.stars : 0) }, []),
              ]);
            })
          ),
        ]),
        el("h2", { class: "report-h2", text: L("rep.badges") }, []),
        el("div", { class: "report-badges" }, badges.map(function (a) {
          return el("span", { class: "report-badge" }, [
            el("span", { class: "rb-icon", text: a.icon, "aria-hidden": "true" }, []),
            el("span", { text: L(a.name) }, []),
          ]);
        })),
        el("p", { class: "report-privacy", text: L("rep.privacy") }),
        el("div", { class: "btn-row" }, [
          el(
            "button",
            {
              class: "btn btn-primary btn-big",
              type: "button",
              text: L("rep.print"),
              onclick: function () {
                SFX.click();
                window.print();
              },
            },
            []
          ),
        ]),
      ])
    );
    initReveal(app);
    focusMain();
  }
  function statTile(icon, label, value) {
    return el("div", { class: "stat-tile" }, [
      el("div", { class: "st-icon", text: icon, "aria-hidden": "true" }, []),
      el("div", { class: "st-value", text: value }, []),
      el("div", { class: "st-label", text: label }, []),
    ]);
  }
  /* ============================================================
     EXPLORER CERTIFICATE
     ============================================================ */
  function renderCertificate() {
    app.innerHTML = "";
    const allDone = S.completedCount() >= D.CHAPTERS.length;
    app.appendChild(pageHead(L("cert.map"), goHome, L("cert.title")));
    if (!allDone) {
      const done = S.completedCount();
      app.appendChild(
        el("div", { class: "locked card" }, [
          el("div", { class: "locked-icon", text: "📜" }),
          el("h1", { text: L("cert.lockedTitle") }),
          el("p", { text: L("cert.lockedBody", { d: done }) }),
          el("div", { class: "btn-row" }, [
            el(
              "button",
              {
                class: "btn btn-primary btn-big",
                type: "button",
                text: L("cert.continue"),
                onclick: function () {
                  SFX.click();
                  goChapter(S.nextChapter());
                },
              },
            ),
            el(
              "button",
              {
                class: "btn btn-ghost",
                type: "button",
                text: L("cert.map"),
                onclick: goHome,
              },
              []
            ),
          ]),
        ])
      );
      focusMain();
      return;
    }
    const name = S.explorer() || "Young Space Explorer";
    const today = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const cert = el("div", { class: "certificate card" }, [
      el("div", { class: "cert-ribbon", text: "🏆", "aria-hidden": "true" }),
      el("p", { class: "cert-kicker", text: L("cert.kicker") }),
      el("p", { class: "cert-lead", text: L("cert.lead") }),
      el("h1", { class: "cert-name", text: name }),
      el("p", { class: "cert-body", text: L("cert.body") }),
      el("div", { class: "cert-stats" }, [
        el("span", { text: L("cert.stars", { s: S.totalStars() }) }),
        el("span", { text: L("cert.comics") }),
        el("span", { text: L("cert.exhibits", { n: D.MUSEUM.length }) }),
      ]),
      el("div", { class: "cert-stats" }, [
        el("span", { text: L("cert.restored", { n: S.restoredCount() }) }),
      ]),
      el("div", { class: "cert-date", text: L("cert.issued", { d: today }) }),
      el("div", { class: "cert-sign" }, [
        el("span", { class: "cert-sign-name", text: L("cert.signName") }),
        el("span", { class: "cert-sign-role", text: L("cert.signRole") }),
      ]),
      el("div", { class: "cert-stamps", "aria-hidden": "true" }, [
        el("span", { text: "🚀" }),
        el("span", { text: "🌙" }),
        el("span", { text: "🔴" }),
        el("span", { text: "🪐" }),
      ]),
    ]);
    app.appendChild(cert);
    app.appendChild(
      el("div", { class: "btn-row" }, [
        el(
          "button",
          {
            class: "btn btn-primary btn-big",
            type: "button",
            text: L("cert.print"),
            onclick: function () {
              SFX.click();
              window.print();
            },
          },
          []
        ),
        el(
          "button",
          {
            class: "btn btn-ghost",
            type: "button",
            text: L("cert.museum"),
            onclick: function () {
              SFX.click();
              goMuseum();
            },
          },
          []
        ),
        el(
          "button",
          {
            class: "btn btn-ghost",
            type: "button",
            text: L("cert.map"),
            onclick: goHome,
          },
          []
        ),
      ])
    );
    initReveal(app);
    focusMain();
  }
  /* ============================================================
     SETTINGS MODAL
     ============================================================ */
  const modal = document.getElementById("settings-modal");
  const modalBox = document.getElementById("settings-box");
  function openSettings() {
    paintSettings();
    modal.hidden = false;
    const first = modalBox.querySelector("button");
    if (first) first.focus();
  }
  function closeSettings() {
    modal.hidden = true;
    settingsBtn.focus();
  }
  function paintSettings() {
    modalBox.innerHTML = "";
    function toggle(label, sub, key, onToggle) {
      const on = S.get().settings[key];
      return el("div", { class: "set-row" }, [
        el("div", { class: "set-text" }, [
          el("span", { class: "set-label", text: label }),
          el("span", { class: "set-sub", text: sub }),
        ]),
        el(
          "button",
          {
            class: "toggle" + (on ? " on" : ""),
            type: "button",
            role: "switch",
            "aria-checked": String(on),
            "aria-label": label,
            text: on ? L("common.on") : L("common.off"),
            onclick: function () {
              S.setSetting(key, !S.get().settings[key]);
              SFX.click();
              if (onToggle) onToggle();
              applyPrefs();
              paintSettings();
            },
          },
          []
        ),
      ]);
    }
    function chips(label, sub, options, current, onPick) {
      const row = el("div", { class: "choice-chips set-chips", role: "group", "aria-label": label }, []);
      options.forEach(function (o) {
        row.appendChild(
          el(
            "button",
            {
              type: "button",
              class: "chip" + (current() === o.val ? " chip-on" : ""),
              "aria-pressed": String(current() === o.val),
              text: o.label,
              onclick: function () {
                onPick(o.val);
                SFX.click();
                applyPrefs();
                paintSettings();
              },
            },
            []
          )
        );
      });
      return el("div", { class: "set-row" }, [
        el("div", { class: "set-text" }, [
          el("span", { class: "set-label", text: label }),
          el("span", { class: "set-sub", text: sub }),
        ]),
        row,
      ]);
    }
    modalBox.appendChild(el("h2", { id: "settings-title", text: L("set.title") }));
    /* ---- explorer name ---- */
    const nameInput = el("input", {
      class: "name-input",
      type: "text",
      maxlength: "16",
      value: S.explorer(),
      placeholder: "Nova",
      "aria-label": L("set.explorer"),
    }, []);
    modalBox.appendChild(
      el("div", { class: "set-row" }, [
        el("div", { class: "set-text" }, [
          el("span", { class: "set-label", text: L("set.explorer") }),
          el("span", { class: "set-sub", text: L("set.explorerSub") }),
        ]),
        el("div", { class: "name-row" }, [
          nameInput,
          el(
            "button",
            {
              class: "btn btn-primary btn-small",
              type: "button",
              text: L("set.save"),
              onclick: function () {
                S.setExplorer(nameInput.value);
                SFX.click();
                paintSettings();
              },
            },
            []
          ),
        ]),
      ])
    );
    /* ---- sandbox status ---- */
    modalBox.appendChild(
      el("div", { class: "set-row sandbox-row" + (S.sandboxActive() ? " on" : "") }, [
        el("div", { class: "set-text" }, [
          el("span", { class: "set-label", text: L("set.sandbox") }),
          el("span", { class: "set-sub", text: L("set.sandboxSub") }),
        ]),
        el("span", {
          class: "sandbox-state",
          text: S.sandboxActive() ? L("set.sandboxOn") : L("set.sandboxOff"),
        }, []),
      ])
    );
    if (S.sandboxActive()) {
      modalBox.appendChild(
        el("p", { class: "set-note sandbox-hint", text: L("set.sandboxHint") })
      );
    }
    /* ---- timer ---- */
    modalBox.appendChild(
      toggle(L("set.timer"), L("set.timerSub", { n: S.timerSeconds() }), "timer")
    );
    modalBox.appendChild(
      chips(
        L("set.timerSpeed"),
        L("set.timerSpeedSub"),
        [
          { label: L("game.speedRelaxed"), val: 40 },
          { label: L("game.speedNormal"), val: 25 },
          { label: L("game.speedQuick"), val: 15 },
        ],
        function () {
          return S.timerSeconds();
        },
        function (v) {
          S.setSetting("timerSpeed", v);
        }
      )
    );
    /* ---- sound ---- */
    modalBox.appendChild(toggle(L("set.sound"), L("set.soundSub"), "sound", function () {
      SFX.syncVolume();
    }));
    const vol = el("input", {
      class: "vol-slider",
      type: "range",
      min: "0",
      max: "100",
      step: "5",
      value: String(Math.round(S.volume() * 100)),
      "aria-label": L("set.volume"),
      oninput: function (e) {
        S.setSetting("volume", Number(e.target.value) / 100);
        SFX.syncVolume();
      },
    }, []);
    modalBox.appendChild(
      el("div", { class: "set-row" }, [
        el("div", { class: "set-text" }, [
          el("span", { class: "set-label", text: L("set.volume") }),
          el("span", { class: "set-sub", text: L("set.volumeSub") }),
        ]),
        el("div", { class: "name-row" }, [vol]),
      ])
    );
    /* ---- language ---- */
    modalBox.appendChild(
      chips(
        L("set.lang"),
        L("set.langSub"),
        [
          { label: "English", val: "en" },
          { label: "Español", val: "es" },
        ],
        function () {
          return I18N.getLang();
        },
        function (v) {
          I18N.setLang(v);
          S.setSetting("lang", v);
          applyPrefs();
          route();
        }
      )
    );
    /* ---- accessibility ---- */
    modalBox.appendChild(
      toggle(L("set.motion"), L("set.motionSub"), "lessMotion")
    );
    modalBox.appendChild(
      toggle(L("set.contrast"), L("set.contrastSub"), "highContrast")
    );
    modalBox.appendChild(
      toggle(L("set.dyslexia"), L("set.dyslexiaSub"), "easyRead")
    );
    modalBox.appendChild(
      chips(
        L("set.textSize"),
        L("set.textSizeSub"),
        [
          { label: "90%", val: 0.9 },
          { label: "100%", val: 1 },
          { label: "115%", val: 1.15 },
          { label: "130%", val: 1.3 },
        ],
        function () {
          return S.textScale();
        },
        function (v) {
          S.setSetting("textScale", v);
        }
      )
    );
    /* ---- app / offline ---- */
    if (installBtn && !installBtn.hidden) {
      modalBox.appendChild(
        el("div", { class: "set-row" }, [
          el("div", { class: "set-text" }, [
            el("span", { class: "set-label", text: L("set.install") }),
            el("span", { class: "set-sub", text: L("set.installSub") }),
          ]),
          el(
            "button",
            {
              class: "btn btn-primary btn-small",
              type: "button",
              text: L("topbar.install"),
              onclick: function () {
                promptInstall();
              },
            },
            []
          ),
        ])
      );
    }
    modalBox.appendChild(
      el("div", { class: "set-row" }, [
        el("div", { class: "set-text" }, [
          el("span", { class: "set-label", text: L("set.offline") }),
          el("span", { class: "set-sub", id: "offline-state", text: L("set.offlineWait") }),
        ]),
      ])
    );
    /* ---- export / import ---- */
    modalBox.appendChild(
      el("div", { class: "set-row" }, [
        el("div", { class: "set-text" }, [
          el("span", { class: "set-label", text: L("set.export") }),
          el("span", { class: "set-sub", text: L("set.exportSub") }),
        ]),
        el(
          "button",
          {
            class: "btn btn-primary btn-small",
            type: "button",
            text: L("set.export"),
            onclick: function () {
              const code = S.exportCode();
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(code).then(
                  function () {
                    UI.toast({ icon: "📤", tone: "good", title: L("toast.exported") });
                  },
                  function () {
                    window.prompt(L("set.export"), code);
                  }
                );
              } else {
                window.prompt(L("set.export"), code);
              }
            },
          },
          []
        ),
      ])
    );
    modalBox.appendChild(
      el("div", { class: "set-row" }, [
        el("div", { class: "set-text" }, [
          el("span", { class: "set-label", text: L("set.import") }),
          el("span", { class: "set-sub", text: L("set.importSub") }),
        ]),
        el(
          "button",
          {
            class: "btn btn-ghost btn-small",
            type: "button",
            text: L("set.import"),
            onclick: function () {
              const code = window.prompt(L("set.importTitle"), "");
              if (code === null) return;
              if (S.importCode(code)) {
                SFX.unlock();
                UI.toast({ icon: "📥", tone: "good", title: L("toast.imported") });
                closeSettings();
                route();
              } else {
                UI.toast({ icon: "⚠️", tone: "info", title: L("set.importBad") });
              }
            },
          },
          []
        ),
      ])
    );
    /* ---- reset ---- */
    modalBox.appendChild(
      el("div", { class: "set-row set-row-danger" }, [
        el("div", { class: "set-text" }, [
          el("span", { class: "set-label", text: L("set.reset") }),
          el("span", { class: "set-sub", text: L("set.resetSub") }),
        ]),
        el(
          "button",
          {
            class: "btn btn-danger btn-small",
            type: "button",
            text: L("set.resetBtn"),
            onclick: function () {
              UI.confirm({
                icon: "🗑️",
                title: L("set.resetTitle"),
                body: L("set.resetBody"),
                ok: L("set.resetBtn"),
                cancel: L("common.cancel"),
                danger: true,
              }).then(function (yes) {
                if (!yes) return;
                S.reset();
                SFX.click();
                closeSettings();
                goHome();
                route();
              });
            },
          },
          []
        ),
      ])
    );
    if (!TTS.supported) {
      modalBox.appendChild(el("p", { class: "set-note", text: L("set.noTts") }));
    }
    modalBox.appendChild(
      el(
        "button",
        {
          class: "btn btn-primary btn-full",
          type: "button",
          text: L("set.done"),
          onclick: closeSettings,
        },
        []
      )
    );
  }
  settingsBtn.addEventListener("click", openSettings);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeSettings();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeSettings();
  });
  /* ============================================================
     LANGUAGE TOGGLE + INSTALL PROMPT
     ============================================================ */
  if (langBtn) {
    langBtn.addEventListener("click", function () {
      const next = I18N.getLang() === "en" ? "es" : "en";
      I18N.setLang(next);
      S.setSetting("lang", next);
      applyPrefs();
      SFX.click();
      route();
    });
  }
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });
  function promptInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () {
      deferredPrompt = null;
      if (installBtn) installBtn.hidden = true;
    });
  }
  if (installBtn) {
    installBtn.addEventListener("click", promptInstall);
    installBtn.hidden = true;
  }
  /* ============================================================
     BOOT
     ============================================================ */
  function focusMain() {
    const h = app.querySelector("h1, h2");
    if (h) {
      h.setAttribute("tabindex", "-1");
      try {
        h.focus({ preventScroll: true });
      } catch (err) {}
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    if (app.__keys) {
      document.removeEventListener("keydown", app.__keys);
      app.__keys = null;
    }
  }
  window.addEventListener("hashchange", route);
  I18N.setLang(S.lang());
  applyPrefs();
  route();
  window.NES_APP = {
    route: route,
    checkBadges: checkBadges,
    applyPrefs: applyPrefs,
  };
})();
