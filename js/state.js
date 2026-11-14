/* ============================================================
   Not Enough Space — Progress State (localStorage only)
   No accounts, no data leaves the device — kid-privacy friendly.
   Schema v2 adds: comic page memory, starlight economy,
   restored exhibits, seen badges, a11y + language settings,
   progress export / import.
   ============================================================ */
(function () {
  "use strict";
  const KEY = "nes-progress-v2";
  const LEGACY_KEYS = ["nes-progress-v1"];
  const VERSION = 2;
  // The four sandbox explorers. Matching is CASE SENSITIVE.
  const SANDBOX_NAMES = ["Damien", "Keane", "Chung Hang", "Sean"];
  const DEFAULTS = {
    v: VERSION,
    unlocked: 1, // highest chapter number currently unlocked (1-based)
    read: {}, // { "1": true } — comic finished at least once
    results: {}, // { "1": { done, bestDepth, stars, gem } }
    pages: {}, // { "1": 3 } — last comic page the reader stopped on
    restored: {}, // { "apollo-lm": true } — exhibits rescued in the Museum
    seenBadges: {}, // { "gem-hunter": true } — badges already celebrated
    starlight: 0, // spendable currency earned from star improvements
    archived: false, // has used Mission Control (NSSDCA lookup)
    settings: {
      timer: true, // gentle countdown per prompt (player's choice)
      timerSpeed: 25, // seconds per prompt: 15 (quick) | 25 (normal) | 40 (relaxed)
      sound: true,
      volume: 0.8, // 0..1 master volume
      explorer: "", // kid-chosen explorer name (this device only)
      lang: "en", // "en" | "es"
      lessMotion: false, // user asks for calmer animations
      highContrast: false,
      easyRead: false, // dyslexia-friendly spacing
      textScale: 1, // 0.9 | 1 | 1.15 | 1.3
      sandbox: false, // sandbox mode switch
      sandboxName: "", // one of SANDBOX_NAMES (exact, case sensitive)
    },
  };
  let cache = null;
  function migrate(data) {
    if (!data || typeof data !== "object") return null;
    const out = Object.assign({}, DEFAULTS, data);
    out.v = VERSION;
    out.settings = Object.assign({}, DEFAULTS.settings, data.settings || {});
    out.read = data.read || {};
    out.results = data.results || {};
    out.pages = data.pages || {};
    out.restored = data.restored || {};
    out.seenBadges = data.seenBadges || {};
    out.starlight = typeof data.starlight === "number" ? data.starlight : 0;
    out.archived = !!data.archived;
    // legacy v1 had no pages/restored/starlight — nothing else to fix
    return out;
  }
  function load() {
    if (cache) return cache;
    let data = null;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        data = JSON.parse(raw);
      } else {
        // migrate from the v1 key if it exists
        for (let i = 0; i < LEGACY_KEYS.length; i++) {
          const old = window.localStorage.getItem(LEGACY_KEYS[i]);
          if (old) {
            data = JSON.parse(old);
            break;
          }
        }
      }
    } catch (e) {
      data = null; // private mode / storage blocked → in-memory only
    }
    cache = migrate(data) || migrate({}) || JSON.parse(JSON.stringify(DEFAULTS));
    if (!cache.settings) cache.settings = JSON.parse(JSON.stringify(DEFAULTS.settings));
    save();
    return cache;
  }
  function save() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(cache));
    } catch (e) {
      /* in-memory fallback */
    }
  }
  /* ============================================================
     SANDBOX MODE
     An overlay: every read returns the maximum possible value while
     the real progress underneath is left untouched, so switching
     sandbox off restores the player's own journey exactly.
     ============================================================ */
  function sandboxOn() {
    const s = load().settings;
    return (
      !!s.sandbox && SANDBOX_NAMES.indexOf(s.sandboxName || "") !== -1
    );
  }
  /** The "everything maxed out" record for one chapter. */
  function maxedResult(id) {
    const D = window.NES_DATA;
    let depth = 0;
    if (D && D.CHAPTERS) {
      const ch = D.CHAPTERS.find(function (c) {
        return c.id === id;
      });
      if (ch && D.maxDepthFor) depth = D.maxDepthFor(ch);
    }
    return { done: true, bestDepth: depth, stars: 3, gem: true };
  }
  function totalChapters() {
    const D = window.NES_DATA;
    return D && D.CHAPTERS ? D.CHAPTERS.length : 7;
  }
  function totalExhibits() {
    const D = window.NES_DATA;
    return D && D.MUSEUM ? D.MUSEUM.length : 13;
  }
  const State = {
    get: function () {
      return load();
    },
    /* ---------- settings ---------- */
    isTimerOn: function () {
      return load().settings.timer;
    },
    timerSeconds: function () {
      const v = load().settings.timerSpeed;
      return v === 15 || v === 40 ? v : 25;
    },
    timerLabel: function () {
      const s = State.timerSeconds();
      if (s === 15) return "quick";
      if (s === 40) return "relaxed";
      return "normal";
    },
    isSoundOn: function () {
      return load().settings.sound;
    },
    volume: function () {
      const v = load().settings.volume;
      if (typeof v !== "number" || isNaN(v)) return 0.8;
      return Math.max(0, Math.min(1, v));
    },
    setSetting: function (name, value) {
      const s = load();
      s.settings[name] = value;
      save();
    },
    lessMotion: function () {
      return !!load().settings.lessMotion;
    },
    highContrast: function () {
      return !!load().settings.highContrast;
    },
    easyRead: function () {
      return !!load().settings.easyRead;
    },
    textScale: function () {
      const v = load().settings.textScale;
      return typeof v === "number" && v >= 0.85 && v <= 1.35 ? v : 1;
    },
    lang: function () {
      return load().settings.lang === "es" ? "es" : "en";
    },
    explorer: function () {
      return (load().settings.explorer || "").slice(0, 16);
    },
    setExplorer: function (name) {
      // Outer whitespace is an accident; the match below is CASE SENSITIVE
      // and never touches the internal space in "Chung Hang".
      const raw = String(name || "")
        .replace(/[<>]/g, "")
        .trim()
        .slice(0, 16);
      const s = load();
      s.settings.explorer = raw;
      save();
      // Sandbox trigger: typing one of the four names (exact, case-sensitive)
      // flips sandbox mode on; any other name turns it back off again.
      if (State.isSandboxName(raw)) {
        State.enableSandbox(raw);
      } else if (s.settings.sandbox) {
        State.disableSandbox();
      }
      return raw;
    },
    /* ---------- sandbox mode ---------- */
    sandboxNames: function () {
      return SANDBOX_NAMES.slice();
    },
    isSandboxName: function (name) {
      return SANDBOX_NAMES.indexOf(name) !== -1;
    },
    sandboxActive: sandboxOn,
    sandboxName: function () {
      return load().settings.sandboxName || "";
    },
    /** Turn sandbox on. The name must be one of the four, exactly. */
    enableSandbox: function (name) {
      const s = load();
      if (SANDBOX_NAMES.indexOf(name) === -1) return false;
      s.settings.sandboxName = name;
      s.settings.sandbox = true;
      s.settings.explorer = name;
      save();
      return true;
    },
    disableSandbox: function () {
      const s = load();
      s.settings.sandbox = false;
      s.settings.sandboxName = "";
      save();
    },
    /* ---------- progress ---------- */
    chapterDone: function (id) {
      if (sandboxOn()) return true;
      const r = load().results[id];
      return !!(r && r.done);
    },
    gemFound: function (id) {
      if (sandboxOn()) return true;
      const r = load().results[id];
      return !!(r && r.gem);
    },
    anyGem: function () {
      if (sandboxOn()) return true;
      const s = load();
      const tc = totalChapters();
      for (let i = 1; i <= tc; i++) {
        if (s.results[i] && s.results[i].gem) return true;
      }
      return false;
    },
    anyThreeStars: function () {
      if (sandboxOn()) return true;
      const s = load();
      const tc = totalChapters();
      for (let i = 1; i <= tc; i++) {
        if (s.results[i] && s.results[i].stars >= 3) return true;
      }
      return false;
    },
    rangeDone: function (from, to) {
      if (sandboxOn()) return true;
      for (let i = from; i <= to; i++) {
        if (!this.chapterDone(i)) return false;
      }
      return true;
    },
    allRead: function () {
      if (sandboxOn()) return true;
      const s = load();
      const tc = totalChapters();
      for (let i = 1; i <= tc; i++) {
        if (!s.read[i]) return false;
      }
      return true;
    },
    isUnlocked: function (id) {
      if (sandboxOn()) return true;
      if (id === 0) return true; // Episode Zero is always available as an intro
      return id <= load().unlocked;
    },
    chapterRead: function (id) {
      if (sandboxOn()) return true;
      return !!load().read[id];
    },
    markRead: function (id) {
      if (sandboxOn()) return;
      const s = load();
      s.read[id] = true;
      save();
    },
    result: function (id) {
      if (sandboxOn()) return maxedResult(id);
      return load().results[id] || null;
    },
    /* ---------- comic page memory ---------- */
    lastPage: function (id) {
      const p = load().pages[id];
      return typeof p === "number" ? p : 0;
    },
    setLastPage: function (id, page) {
      const s = load();
      s.pages[id] = page;
      save();
    },
    /* ---------- starlight economy ---------- */
    starlight: function () {
      if (sandboxOn()) return 999; // "everything maxed" in sandbox
      return Math.max(0, load().starlight || 0);
    },
    awardStarlight: function (n) {
      const s = load();
      s.starlight = Math.max(0, (s.starlight || 0) + (n || 0));
      save();
      return s.starlight;
    },
    spendStarlight: function (n) {
      const s = load();
      if ((s.starlight || 0) < n) return false;
      s.starlight -= n;
      save();
      return true;
    },
    /* ---------- restored exhibits ---------- */
    isRestored: function (key) {
      if (sandboxOn()) return true; // everything unlocked in sandbox
      return !!load().restored[key];
    },
    restoreExhibit: function (key) {
      if (sandboxOn()) return true; // already "restored" in sandbox
      const s = load();
      if (s.restored[key]) return false;
      if ((s.starlight || 0) < 1) return false;
      s.starlight -= 1;
      s.restored[key] = true;
      save();
      return true;
    },
    restoredCount: function () {
      if (sandboxOn()) return totalExhibits();
      const r = load().restored;
      let n = 0;
      for (const k in r) if (r[k]) n++;
      return n;
    },
    /* ---------- badges ---------- */
    seenBadge: function (key) {
      return !!load().seenBadges[key];
    },
    markBadgeSeen: function (key) {
      const s = load();
      s.seenBadges[key] = true;
      save();
    },
    /* ---------- mission control ---------- */
    usedArchive: function () {
      if (sandboxOn()) return true;
      return !!load().archived;
    },
    markArchiveUsed: function () {
      if (sandboxOn()) return; // already "used" in sandbox
      const s = load();
      s.archived = true;
      save();
    },
    /* ---------- record a finished dive ---------- */
    // Returns { unlockedNew, stars, bestDepth, done, starlightGained }
    recordDive: function (id, depth, stars, passed, gemFound) {
      if (sandboxOn()) {
        // Pure overlay: never mutate the player's real progress.
        const m = maxedResult(id);
        return { unlockedNew: false, stars: m.stars, bestDepth: m.bestDepth, done: m.done, starlightGained: 0 };
      }
      const s = load();
      const prev = s.results[id] || { done: false, bestDepth: 0, stars: 0, gem: false };
      const rec = {
        done: prev.done || passed,
        bestDepth: Math.max(prev.bestDepth, depth),
        stars: Math.max(prev.stars, stars),
        gem: !!(prev.gem || gemFound),
      };
      s.results[id] = rec;
      // starlight is only ever *earned* by improving your best star count
      const gained = Math.max(0, rec.stars - prev.stars);
      if (gained > 0) s.starlight = (s.starlight || 0) + gained;
      let unlockedNew = false;
      if (passed && id + 1 <= totalChapters() && s.unlocked < id + 1) {
        s.unlocked = id + 1;
        unlockedNew = true;
      }
      save();
      return {
        unlockedNew: unlockedNew,
        stars: rec.stars,
        bestDepth: rec.bestDepth,
        done: rec.done,
        starlightGained: gained,
      };
    },
    nextChapter: function () {
      if (sandboxOn()) return totalChapters();
      const s = load();
      const tc = totalChapters();
      for (let i = 1; i <= tc; i++) {
        const r = s.results[i];
        if (!(r && r.done)) return Math.min(i, s.unlocked);
      }
      return tc;
    },
    completedCount: function () {
      if (sandboxOn()) return totalChapters();
      const s = load();
      let n = 0;
      const tc = totalChapters();
      for (let i = 1; i <= tc; i++) {
        const r = s.results[i];
        if (r && r.done) n++;
      }
      return n;
    },
    totalStars: function () {
      if (sandboxOn()) return totalChapters() * 3;
      const s = load();
      let n = 0;
      const tc = totalChapters();
      for (let i = 1; i <= tc; i++) {
        const r = s.results[i];
        if (r) n += r.stars || 0;
      }
      return n;
    },
    /* ---------- export / import ---------- */
    exportCode: function () {
      const s = load();
      const payload = {
        v: VERSION,
        u: s.unlocked,
        r: s.read,
        d: s.results,
        p: s.pages,
        x: s.restored,
        st: s.starlight,
        e: s.settings.explorer,
      };
      let json = JSON.stringify(payload);
      // btoa needs latin1 — escape non-ascii first
      try {
        json = unescape(encodeURIComponent(json));
      } catch (e) {
        /* keep raw */
      }
      return btoa(json);
    },
    importCode: function (code) {
      try {
        const raw = atob(String(code || "").trim());
        const data = JSON.parse(decodeURIComponent(escape(raw)));
        if (!data || typeof data !== "object" || !data.v) return false;
        const s = load();
        s.unlocked = Math.max(1, Math.min(totalChapters(), data.u || 1));
        s.read = data.r || {};
        s.results = data.d || {};
        s.pages = data.p || {};
        s.restored = data.x || {};
        s.starlight = data.st || 0;
        if (data.e) s.settings.explorer = String(data.e).slice(0, 16);
        save();
        return true;
      } catch (e) {
        return false;
      }
    },
    reset: function () {
      try {
        window.localStorage.removeItem(KEY);
        LEGACY_KEYS.forEach(function (k) {
          window.localStorage.removeItem(k);
        });
      } catch (e) {
        /* ignore */
      }
      cache = JSON.parse(JSON.stringify(DEFAULTS));
      cache.read = {};
      cache.results = {};
      cache.pages = {};
      cache.restored = {};
      cache.seenBadges = {};
      cache.starlight = 0;
      cache.archived = false;
      save();
    },
  };
  window.NES_STATE = State;
})();
