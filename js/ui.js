/* ============================================================
   Not Enough Space — shared UI primitives
   - el(): tiny DOM builder (shared by app.js + game.js)
   - toast(): non-blocking celebration / info popups
   - confirmDialog(): in-app replacement for window.confirm
   - announce(): screen-reader live region
   ============================================================ */
(function () {
  "use strict";
  /* ---------- DOM builder ----------
     props: class | text | html | style | dataset | aria-* | data-* |
            any attribute | on<Event> -> addEventListener
  */
  function el(tag, props, kids) {
    const n = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === "class") n.className = props[k];
        else if (k === "text") n.textContent = props[k];
        else if (k === "html") n.innerHTML = props[k];
        else if (k === "style") n.setAttribute("style", props[k]);
        else if (k === "dataset")
          Object.keys(props[k]).forEach(function (d) {
            n.dataset[d] = props[k][d];
          });
        else if (k.startsWith("on") && typeof props[k] === "function")
          n.addEventListener(k.slice(2), props[k]);
        else if (props[k] === true) n.setAttribute(k, "");
        else if (props[k] !== false && props[k] != null)
          n.setAttribute(k, props[k]);
      });
    }
    (kids || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }
  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }
  /* ---------- live region ---------- */
  let liveRegion = null;
  function announce(text) {
    if (!liveRegion) {
      liveRegion = document.getElementById("live-region");
      if (!liveRegion) {
        liveRegion = el("div", { id: "live-region", class: "sr-only", "aria-live": "polite", "aria-atomic": "true" }, []);
        document.body.appendChild(liveRegion);
      }
    }
    liveRegion.textContent = "";
    window.setTimeout(function () {
      liveRegion.textContent = text;
    }, 40);
  }
  /* ---------- toasts ----------
     Only a few toasts are visible at once — the rest queue up, so a
     pile of badges never buries the page.
  */
  let toastHost = null;
  let toastQueue = [];
  function maxToasts() {
    return window.innerWidth < 720 ? 2 : 3;
  }
  function toastHostEl() {
    if (!toastHost) {
      toastHost = document.getElementById("toast-host");
      if (!toastHost) {
        toastHost = el("div", { id: "toast-host", class: "toast-host", "aria-live": "polite" }, []);
        document.body.appendChild(toastHost);
      }
    }
    return toastHost;
  }
  function pumpToasts() {
    const host = toastHostEl();
    while (toastQueue.length && host.children.length < maxToasts()) {
      showToast(toastQueue.shift());
    }
  }
  /**
   * toast({ icon, title, body, tone, duration })
   * tone: "good" | "gold" | "info"
   */
  function toast(opts) {
    const o = opts || {};
    const host = toastHostEl();
    if (host.children.length >= maxToasts()) {
      toastQueue.push(o);
      return function () {};
    }
    return showToast(o);
  }
  function showToast(o) {
    const host = toastHostEl();
    const node = el(
      "div",
      {
        class: "toast toast-" + (o.tone || "info"),
        role: "status",
      },
      [
        el("div", { class: "toast-icon", text: o.icon || "✨", "aria-hidden": "true" }, []),
        el("div", { class: "toast-body" }, [
          el("p", { class: "toast-title", text: o.title || "" }, []),
          o.body ? el("p", { class: "toast-text", text: o.body, "aria-hidden": "true" }, []) : null,
        ]),
        el(
          "button",
          {
            class: "toast-x",
            type: "button",
            "aria-label": "Close",
            text: "✕",
            onclick: function () {
              dismiss();
            },
          },
          []
        ),
      ]
    );
    let done = false;
    function dismiss() {
      if (done) return;
      done = true;
      node.classList.add("toast-out");
      window.setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
        pumpToasts();
      }, 320);
    }
    host.appendChild(node);
    window.setTimeout(dismiss, o.duration || 4200);
    if (o.title) announce(o.title + (o.body ? ". " + o.body : ""));
    return dismiss;
  }
  /* ---------- in-app confirm dialog ----------
     Replaces window.confirm / window.alert with a styled, kid-safe dialog.
     Returns a Promise<boolean>.
  */
  function confirmDialog(opts) {
    const o = opts || {};
    return new Promise(function (resolve) {
      const host = document.getElementById("dialog-host");
      if (!host) {
        resolve(window.confirm(o.body || "Are you sure?"));
        return;
      }
      let settled = false;
      function finish(v) {
        if (settled) return;
        settled = true;
        document.removeEventListener("keydown", onKey);
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        resolve(v);
      }
      function onKey(e) {
        if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
        }
      }
      const okBtn = el(
        "button",
        {
          class: "btn " + (o.danger ? "btn-danger" : "btn-primary") + " btn-big",
          type: "button",
          text: o.ok || "Yes",
          onclick: function () {
            finish(true);
          },
        },
        []
      );
      const box = el(
        "div",
        {
          class: "modal-box dialog-box card",
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "dialog-title",
        },
        [
          el("div", { class: "dialog-icon", text: o.icon || "❓", "aria-hidden": "true" }, []),
          el("h2", { id: "dialog-title", class: "dialog-title", text: o.title || "Are you sure?" }, []),
          el("p", { class: "dialog-text", text: o.body || "" }, []),
          el("div", { class: "btn-row" }, [
            okBtn,
            el(
              "button",
              {
                class: "btn btn-ghost",
                type: "button",
                text: o.cancel || "Cancel",
                onclick: function () {
                  finish(false);
                },
              },
              []
            ),
          ]),
        ]
      );
      const backdrop = el(
        "div",
        {
          class: "modal dialog-backdrop",
          onclick: function (e) {
            if (e.target === backdrop) finish(false);
          },
        },
        [box]
      );
      host.appendChild(backdrop);
      document.addEventListener("keydown", onKey);
      window.setTimeout(function () {
        okBtn.focus();
      }, 30);
    });
  }
  window.NES_UI = {
    el: el,
    clear: clear,
    toast: toast,
    confirm: confirmDialog,
    announce: announce,
  };
})();
