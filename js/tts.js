/* ============================================================
   Not Enough Space — Read-Aloud (Text-to-Speech)
   Made friendly for kids:
   - picks the most natural/expressive voice available
     (prefers "Natural / Neural / Online / Enhanced" voices)
   - reads sentence-by-sentence, speaking each one only after the
     previous finishes, so the story gets real pauses instead of
     one long monotone run
   - slightly slower rate + a gentle, non-chipmunky pitch
   - plays a soft chime when it starts (respects the sound setting)
   - follows the app language (English / Spanish voices)
   Nothing is sent anywhere — works offline.
   ============================================================ */
(function () {
  "use strict";

  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  let currentBtn = null;
  let pending = 0; // utterances left in the current read-aloud
  let cancelToken = 0;

  // ---------- voice picking ----------
  const NICE = [
    "natural",
    "neural",
    "online",
    "enhanced",
    "premium",
    "siri",
    "aria",
    "jenny",
    "sonia",
    "amy",
    "libby",
    "paulina",
    "monica",
    "helena",
    "google us english",
    "google uk english",
    "google español",
    "google espanol",
  ];
  const ROBOTIC = [
    "server speech",
    "desktop",
    "legacy",
    "compact",
    "david",
    "mark",
    "hzky",
    "sam",
  ];

  function targetLang() {
    const st = window.NES_STATE;
    const l = st && st.lang ? st.lang : "en";
    return l === "es" ? "es" : "en";
  }

  function scoreVoice(v) {
    const name = (v.name || "").toLowerCase();
    const lang = (v.lang || "").toLowerCase().replace("_", "-");
    let score = 0;
    const want = targetLang();
    // language fit — never read Spanish text with an English voice
    if (lang.indexOf(want) === 0) score += 8;
    else if (want === "en" && lang.indexOf("en") === 0) score += 8;
    else if (want === "es" && (lang.indexOf("es") === 0 || lang.indexOf("mx") === 0)) score += 8;
    else score -= 100; // wrong language → never pick
    // friendliness
    NICE.forEach(function (n, i) {
      if (name.indexOf(n) !== -1) score += 20 - i;
    });
    ROBOTIC.forEach(function (n, i) {
      if (name.indexOf(n) !== -1) score -= 25 - i * 2;
    });
    // a gentle bias toward voices often liked by children
    if (/female|zira|libby|susan|heather|fiona|karen|moira|tessa|veena|paulina|monica/.test(name))
      score += 3;
    return score;
  }

  function pickVoice() {
    let voices = [];
    try {
      voices = window.speechSynthesis.getVoices() || [];
    } catch (e) {
      voices = [];
    }
    if (!voices.length) return null;
    const ranked = voices
      .map(function (v) {
        return { v: v, s: scoreVoice(v) };
      })
      .filter(function (x) {
        return x.s > -50;
      })
      .sort(function (a, b) {
        return b.s - a.s;
      });
    return ranked.length ? ranked[0].v : voices[0];
  }

  // ---------- sentence splitting (natural pauses) ----------
  function splitSentences(text) {
    const parts = String(text)
      .replace(/\s+/g, " ")
      .trim()
      .split(/(?<=[.!?…])\s+/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    if (parts.length <= 1) {
      const long = String(text)
        .trim()
        .split(/(?<=[,;:])\s+/)
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      if (long.length > 1) return long;
    }
    return parts.length ? parts : [String(text)];
  }

  function clearBtn(btn) {
    if (currentBtn === btn) {
      btn.classList.remove("speaking");
      btn.setAttribute("aria-pressed", "false");
      currentBtn = null;
    }
  }

  function stop() {
    cancelToken++;
    if (!supported) return;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    pending = 0;
    if (currentBtn) {
      currentBtn.classList.remove("speaking");
      currentBtn.setAttribute("aria-pressed", "false");
      currentBtn = null;
    }
  }

  function speak(text, btn) {
    if (!supported || !text) return;
    // toggle off if the same button is pressed again
    if (currentBtn === btn && window.speechSynthesis.speaking) {
      stop();
      return;
    }
    stop();

    const sentences = splitSentences(text);
    if (!sentences.length) return;

    // friendly start chime (respects the sound setting)
    if (window.NES_SFX && window.NES_SFX.readChime) {
      window.NES_SFX.readChime();
    }

    const voice = pickVoice();
    const token = ++cancelToken;
    pending = sentences.length;

    if (btn) {
      btn.classList.add("speaking");
      btn.setAttribute("aria-pressed", "true");
      currentBtn = btn;
    }

    // Speak one sentence at a time. Waiting for each to finish gives the
    // reader real pauses between sentences — that is what makes it sound
    // like a person reading a story instead of a robot reading a list.
    function speakAt(i) {
      if (token !== cancelToken || pending <= 0) return;
      const u = new SpeechSynthesisUtterance(sentences[i]);
      // kid-friendly prosody: clear, warm, a little story-time lilt
      u.rate = 0.92;
      u.pitch = 1.06;
      u.volume = 1;
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = targetLang() === "es" ? "es-ES" : "en-US";
      }
      u.onend = function () {
        pending = Math.max(0, pending - 1);
        if (token !== cancelToken) return;
        if (pending === 0) {
          clearBtn(btn);
          return;
        }
        // a tiny breath between sentences
        window.setTimeout(function () {
          speakAt(i + 1);
        }, 120);
      };
      u.onerror = function () {
        pending = Math.max(0, pending - 1);
        if (pending === 0) clearBtn(btn);
      };
      try {
        window.speechSynthesis.speak(u);
      } catch (e) {
        pending = Math.max(0, pending - 1);
        if (pending === 0) clearBtn(btn);
      }
    }

    speakAt(0);

    // Safety net: if the browser never fires onend (headless, bugs,
    // background throttling), clear the speaking state so a button
    // can't stay stuck in "speaking" forever.
    const estMs = String(text).length * 170 + 8000;
    window.setTimeout(function () {
      if (pending > 0 && token === cancelToken) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
        pending = 0;
        clearBtn(btn);
      }
    }, estMs);
  }

  // Voices load async in some browsers — warm the cache.
  if (supported) {
    try {
      window.speechSynthesis.getVoices();
      if (typeof window.speechSynthesis.addEventListener === "function") {
        window.speechSynthesis.addEventListener("voiceschanged", function () {
          window.speechSynthesis.getVoices();
        });
      } else {
        window.speechSynthesis.onvoiceschanged = function () {
          window.speechSynthesis.getVoices();
        };
      }
    } catch (e) {}
  }

  window.NES_TTS = {
    supported: supported,
    speak: speak,
    stop: stop,
    pickVoice: pickVoice,
  };
})();
