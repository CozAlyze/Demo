/* COZ SAVED · CS1.1 (Sep 23 2026)
   One Saved Charts store for every page (localStorage "cozSavedCharts").

   - The center bookmark in the bottom nav is the save control on every page that shows it
     (his Sep 23 ruling). Tapping it saves the chart that page is showing, then opens
     saved-charts.html. Compare pages save a Compare record, Tropical pages a chart record
     with Tropical, the Vedic pages a chart record with Vedic. Saving the same chart run
     again refreshes that record; it never creates a second one.
   - A record is a snapshot of that chart run: the single-slot keys the pages read
     (emergeBirthData, cozChartJSON, ...) plus every finished reading stored for that run
     (Combined, its step 1, the Ascendant readings, the Vedic sections 3-6 draft).
   - Reopening restores the snapshot into the ordinary keys and opens the existing page.
     HARD RULE: a reopened saved chart never calls the model. While the current chart run
     is a restored one, every request to api.anthropic.com from a page that loads this
     file is refused before it is sent.
   - The Compare purchase includes one saved Compare slot (compareSlots: 1). Extra slots
     ($5 each) are not wired; the data model keeps compareSlots for that later.
   - Each record lists which of its readings were finished when it was saved
     (rec.readings, rec.complete). A record saved too early shows "Incomplete" on its card,
     and the unfinished reading says it hadn't finished when the chart was saved.
   - Records live on this device only. */
(function () {
  if (window.CozSaved) return;
  var STORE = "cozSavedCharts", RESTORED = "cozRestoredRunId", BACKUP = "cozWorkingBackup";
  var FIXED = ["emergeBirthData", "cozChartJSON", "cozTropicalChartJSON", "cozTropicalReading", "cozCompareReading",
               "cozAscendantPair", "cozVedicReadingComplete", "cozTropicalReadingComplete"];
  var RUN_PREFIX = ["cozCombinedReadingDEV:", "cozCombinedStep1DEV:", "cozAscReading:"];
  var COMPARE_PAGES = ["compare-reading", "combined-reading", "your-ascendants", "ascendant-reading",
                       "compare-current-timing", "compare-current-timing-reading", "compare-birth-charts"];
  var TROPICAL_PAGES = ["tropical-reading"];

  function lsGet(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsJSON(k){ try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function pageName(){ return (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, ""); }
  function uid(){ return "sc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7); }

  /* throws when the store exists but cannot be read, so the page can show its error state */
  function readStore(){
    var raw = localStorage.getItem(STORE);
    if (!raw) return { version: 1, compareSlots: 1, records: [] };
    var s = JSON.parse(raw);
    if (!s || !Array.isArray(s.records)) throw new Error("saved charts store is damaged");
    if (typeof s.compareSlots !== "number") s.compareSlots = 1;
    return s;
  }
  function writeStore(s){ localStorage.setItem(STORE, JSON.stringify(s)); }

  function runIdOf(v){
    try { var o = JSON.parse(v); return o && ((o.run && o.run.runId) || o.runId || (o.inputs && o.inputs.runId)) || null; } catch (e) { return null; }
  }
  /* everything stored for one chart run */
  function snapshotFor(runId){
    var snap = {}, i, k, v;
    FIXED.forEach(function (key) {
      var val = lsGet(key); if (val == null) return;
      var r = runIdOf(val);
      if (r && r !== runId) return;                 /* belongs to a different chart run */
      snap[key] = val;
    });
    for (i = 0; i < localStorage.length; i++) {
      k = localStorage.key(i); if (!k) continue;
      if (RUN_PREFIX.some(function (p) { return k.indexOf(p) === 0; }) && k.indexOf(runId) >= 0) snap[k] = lsGet(k);
      else if (k.indexOf("cozGenDraft:") === 0) { v = lsGet(k); if (runIdOf(v) === runId) snap[k] = v; }
    }
    return snap;
  }
  /* S1.1 (his ruling): which readings were finished when the record was saved, so a record
     saved too early is marked incomplete instead of looking broken later */
  function readingsFor(kind, systems, snap, runId){
    function has(test){ return Object.keys(snap).some(function (k) { try { return test(k, JSON.parse(snap[k])); } catch (e) { return false; } }); }
    function asc(sys){ return has(function (k, o) { return k.indexOf("cozAscReading:") === 0 && k.split("|")[2] === sys && o && Array.isArray(o.paragraphs); }); }
    var r = {};
    if (kind === "compare") {
      r.combined = has(function (k, o) { return k.indexOf("cozCombinedReadingDEV:") === 0 && o && o.sharedThemes && o.integratedView; });
      r.ascTropical = asc("tropical"); r.ascVedic = asc("vedic"); r.ascCombined = asc("combined");
    } else if (systems && systems.vedic) {
      r.vedic36 = has(function (k, o) { return k.indexOf("cozGenDraft:") === 0 && o && o.sections && o.inputs && o.inputs.runId === runId; });
    }
    return r;
  }
  function kindForPage(p){ return COMPARE_PAGES.indexOf(p) >= 0 ? "compare" : "chart"; }
  function systemForPage(p){ return TROPICAL_PAGES.indexOf(p) >= 0 ? "tropical" : "vedic"; }

  function saveCurrent(kind, system){
    var bd = lsJSON("emergeBirthData");
    if (!bd || !bd.runId) return { ok: false, reason: "no_chart" };
    var s; try { s = readStore(); } catch (e) { return { ok: false, reason: "store_error" }; }
    var rec = null;
    s.records.forEach(function (r) { if (r.runId === bd.runId && r.kind === kind) rec = r; });
    if (!rec && kind === "compare") {
      var used = s.records.filter(function (r) { return r.kind === "compare"; }).length;
      if (used >= s.compareSlots) return { ok: false, reason: "slots_full" };
    }
    var now = new Date().toISOString();
    if (!rec) { rec = { id: uid(), kind: kind, runId: bd.runId, savedAt: now, systems: {} }; s.records.unshift(rec); }
    rec.fingerprint = bd.fingerprint || null;
    rec.name = bd.name || "";
    rec.birthDate = bd.birthDate || "";
    if (kind === "chart") rec.systems[system || "vedic"] = true;
    rec.updatedAt = now;
    rec.snapshot = snapshotFor(bd.runId);
    rec.readings = readingsFor(kind, rec.systems, rec.snapshot, bd.runId);
    rec.complete = Object.keys(rec.readings).every(function (k) { return rec.readings[k]; });
    try { writeStore(s); } catch (e) { return { ok: false, reason: "storage_full" }; }
    return { ok: true, record: rec };
  }

  function list(){ return new Promise(function (res, rej) { try { res(readStore().records.slice()); } catch (e) { rej(e); } }); }
  function remove(id){
    return new Promise(function (res, rej) {
      try { var s = readStore(); s.records = s.records.filter(function (r) { return r.id !== id; }); writeStore(s); res(true); } catch (e) { rej(e); }
    });
  }
  /* restores one record and returns the page to open; touches no other record */
  function restore(id, target){
    var s = readStore(), rec = null;
    s.records.forEach(function (r) { if (r.id === id) rec = r; });
    if (!rec) throw new Error("saved record not found");
    var cur = lsJSON("emergeBirthData");
    if (cur && cur.runId && cur.runId !== rec.runId && !s.records.some(function (r) { return r.runId === cur.runId; })) {
      var keep = {}; FIXED.forEach(function (k) { var v = lsGet(k); if (v != null) keep[k] = v; });
      try { localStorage.setItem(BACKUP, JSON.stringify({ at: new Date().toISOString(), runId: cur.runId, keys: keep })); } catch (e) {}
    }
    var snap = rec.snapshot || {};
    FIXED.forEach(function (k) { if (Object.prototype.hasOwnProperty.call(snap, k)) localStorage.setItem(k, snap[k]); else localStorage.removeItem(k); });
    Object.keys(snap).forEach(function (k) { if (FIXED.indexOf(k) < 0) localStorage.setItem(k, snap[k]); });
    localStorage.setItem(RESTORED, rec.runId);
    if (target === "tropical") return "tropical-reading.html";
    if (target === "vedic") return "vedic-reading.html";
    if (rec.kind === "compare") return "compare-reading.html";
    return rec.systems && rec.systems.vedic ? "vedic-reading.html" : "tropical-reading.html";
  }

  /* HARD RULE: a reopened saved chart never calls the model */
  function isRestoredRun(){ var r = lsGet(RESTORED), bd = lsJSON("emergeBirthData"); return !!(r && bd && bd.runId === r); }
  if (window.fetch && !window.__cozSavedGuard) {
    window.__cozSavedGuard = true;
    var nativeFetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        if (/api\.anthropic\.com/.test(url) && isRestoredRun()) {
          console.log("[COZ SAVED] saved chart reopened: model request refused");
          var e = new Error("This reading hadn't finished when this chart was saved."); e.kind = "saved_no_regen";
          return Promise.reject(e);
        }
      } catch (x) {}
      return nativeFetch.apply(this, arguments);
    };
  }

  /* the center bookmark: save this page's chart, then open Saved Charts */
  var SEL = '[data-dash="saved"],[data-foot="saved"],.nav a.saved,a[aria-label="Saved"],button[aria-label="Saved"]';
  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest && ev.target.closest(SEL);
    var p = pageName();
    if (!t || p === "saved-charts" || p === "index") return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    var r = saveCurrent(kindForPage(p), systemForPage(p));
    if (!r.ok && r.reason === "slots_full") alert("Your Compare package includes one saved comparison. Remove the one on your Saved Charts page to save this one.");
    else if (!r.ok && r.reason === "storage_full") alert("There isn't enough space on this device to save this chart.");
    else if (!r.ok && r.reason === "store_error") alert("Your saved charts couldn't be read on this device.");
    location.href = "saved-charts.html";
  }, true);

  window.CozSaved = { list: list, remove: remove, restore: restore, saveCurrent: saveCurrent, isRestoredRun: isRestoredRun, _snapshotFor: snapshotFor, STORE: STORE };
})();
