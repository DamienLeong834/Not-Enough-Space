/* ============================================================
   Not Enough Space — Sound effects (WebAudio, no audio files)
   All sounds are generated in-browser. One master gain node
   controls the volume, and every sound respects the on/off
   setting. Toggle + volume live in Settings.
   ============================================================ */
(function () {
  "use strict";

  let ctx = null;
  let master = null;

  function ac() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = currentVolume();
    master.connect(ctx.destination);
    return ctx;
  }

  function currentVolume() {
    const st = window.NES_STATE;
    if (!st) return 0.8;
    return st.volume();
  }

  function on() {
    const st = window.NES_STATE;
    if (!st) return true;
    return st.isSoundOn();
  }

  /** Push the current volume into the master gain (called when settings change). */
  function syncVolume() {
    if (!ctx || !master) return;
    try {
      master.gain.setTargetAtTime(currentVolume(), ctx.currentTime, 0.02);
    } catch (e) {
      /* ignore */
    }
  }

  // One tone note
  function note(freq, start, dur, type, vol) {
    const c = ac();
    if (!c) return;
    if (c.state === "suspended") c.resume();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    const t = c.currentTime + (start || 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.18));
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + (dur || 0.18) + 0.05);
  }

  // A short arpeggio from a list of frequencies
  function arp(freqs, step, dur, type, vol) {
    freqs.forEach(function (f, i) {
      note(f, i * step, dur, type, vol);
    });
  }

  const SFX = {
    /* keep the audio graph in sync with the settings panel */
    syncVolume: syncVolume,

    click: function () {
      if (!on()) return;
      note(660, 0, 0.08, "triangle", 0.12);
    },
    submit: function () {
      if (!on()) return;
      note(520, 0, 0.1, "square", 0.1);
      note(780, 0.08, 0.14, "square", 0.1);
    },
    shallow: function () {
      if (!on()) return;
      note(392, 0, 0.16, "sine", 0.16);
      note(494, 0.1, 0.2, "sine", 0.14);
    },
    deep: function () {
      if (!on()) return;
      arp([523, 659, 784], 0.09, 0.16, "triangle", 0.16);
    },
    gem: function () {
      if (!on()) return;
      arp([659, 784, 988, 1319, 1568], 0.07, 0.3, "triangle", 0.16);
    },
    miss: function () {
      if (!on()) return;
      note(220, 0, 0.2, "sine", 0.12);
      note(180, 0.12, 0.26, "sine", 0.1);
    },
    win: function () {
      if (!on()) return;
      arp([523, 659, 784, 1047, 784, 1047, 1319], 0.11, 0.34, "triangle", 0.17);
    },
    fail: function () {
      if (!on()) return;
      note(330, 0, 0.2, "sine", 0.13);
      note(262, 0.16, 0.3, "sine", 0.12);
    },
    unlock: function () {
      if (!on()) return;
      arp([784, 988, 1175, 1568], 0.09, 0.32, "square", 0.11);
    },
    tick: function () {
      if (!on()) return;
      note(880, 0, 0.05, "square", 0.07);
    },
    readChime: function () {
      if (!on()) return;
      note(988, 0, 0.12, "sine", 0.09);
      note(1319, 0.1, 0.24, "sine", 0.08);
    },
    /* new: a badge is earned */
    badge: function () {
      if (!on()) return;
      arp([784, 988, 1319], 0.08, 0.26, "triangle", 0.15);
      arp([1568, 2093], 0.16, 0.3, "sine", 0.1);
    },
    /* new: a derelict is restored */
    restore: function () {
      if (!on()) return;
      arp([392, 523, 659, 784, 1047], 0.07, 0.24, "sine", 0.14);
      note(1568, 0.38, 0.4, "triangle", 0.1);
    },
    /* new: a new depth zone is reached */
    zone: function () {
      if (!on()) return;
      note(330, 0, 0.22, "sine", 0.12);
      note(440, 0.12, 0.26, "sine", 0.12);
      note(587, 0.26, 0.3, "sine", 0.12);
    },
    /* new: a soft page turn for the comic */
    page: function () {
      if (!on()) return;
      note(1200, 0, 0.05, "sine", 0.05);
      note(900, 0.04, 0.07, "sine", 0.04);
    },
  };

  window.NES_SFX = SFX;
})();
