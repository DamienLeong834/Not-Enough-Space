/* ============================================================
   Not Enough Space — NSSDCA lookup layer
   The NASA Space Apps challenge points at the NASA Space
   Science Data Coordinated Archive (NSSDCA) for "mission
   parameters, final resting place and operational status".

   NSSDCA has no CORS-enabled public API, so the records below
   are a local, cited snapshot of NASA's own catalogue entries.
   Every record links straight back to the live NSSDCA page so
   kids (and judges) can always see the original.
   ============================================================ */
(function () {
  "use strict";

  const DATA = window.NES_NSSDCA_DATA || { records: [] };

  function all() {
    return DATA.records || [];
  }

  /** Find a record by its stable key (matches js/data.js MUSEUM keys). */
  function find(key) {
    if (!key) return null;
    const list = all();
    for (let i = 0; i < list.length; i++) {
      if (list[i].key === key) return list[i];
    }
    return null;
  }

  /** Free-text search across name, id, mission, vehicle and description. */
  function search(query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return all();
    return all().filter(function (r) {
      const hay = [
        r.name,
        r.nssdcId,
        r.mission,
        r.launchVehicle,
        r.launchSite,
        r.disciplines,
        r.where,
        r.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  /** Live NSSDCA record URL for a given NSSDC ID. */
  function recordUrl(id) {
    return (
      "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=" +
      encodeURIComponent(id)
    );
  }

  /** Extra NASA/NSSDCA source documents (e.g. Pioneer 11 operations end). */
  function extraLinks() {
    return DATA.extraLinks || [];
  }

  window.NES_NSSDCA = {
    all: all,
    find: find,
    search: search,
    recordUrl: recordUrl,
    extraLinks: extraLinks,
    source: DATA.source || "NASA Space Science Data Coordinated Archive (NSSDCA)",
    verifiedOn: DATA.verifiedOn || "",
  };
})();
