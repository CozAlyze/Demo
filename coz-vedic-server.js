/* COZ VEDIC SERVER · VSA1.1 (Sep 29 2026, local build, not deployed)
   VSA1.1: pinned(run) = this device already holds a server job record for this run + fingerprint, so a run that
   started on the server keeps following it even if the switch is later turned OFF (OFF governs new runs only).
   Device-only link from vedic-reading.html to the isolated Vedic server (cozalyze-vedic-server). Vedic only;
   never touches Tropical keys or files. DEFAULT OFF: inert unless this device's localStorage
   "cozVedicServerBase" is EXACTLY https://cozalyze-vedic-server.netlify.app or
   https://test--cozalyze-vedic-server.netlify.app. OFF = the page runs today's locked writer unchanged.
   ON: Sections 1-2 stay in the browser (unchanged); Sections 3-6 come from the server job, each section shown as
   soon as the server releases it (VR1). One record per run in "cozVedicServerJob". A restored (reopened Saved)
   chart never starts a job; it only follows a job this device already holds for the same run + fingerprint.
   Tester key: "cozVedicServerKey", else the Tropical tester key on this device. No server secret here. */
(function () {
  if (window.CozVedicServer) return;
  var OK = ["https://cozalyze-vedic-server.netlify.app", "https://test--cozalyze-vedic-server.netlify.app"];
  var JOB = "cozVedicServerJob", POLL_MS = 3000;
  var IDS = ["relationships-karmic", "dharma-direction", "rahu-ketu", "essential-takeaway"];
  var COPY = { pending: "This section is still being written\u2026", failed: "This section couldn\u2019t be completed." };
  function ls(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsJSON(k){ try { return JSON.parse(ls(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function notify(){ try { window.dispatchEvent(new CustomEvent("COZ_VEDIC_SERVER_UPDATE")); } catch (e) {} }
  function base(){ var b = ls("cozVedicServerBase"); return OK.indexOf(b) >= 0 ? b + "/.netlify/functions" : null; }
  function key(){ return ls("cozVedicServerKey") || ls("cozTropicalServerKey"); }
  function restored(runId){ return !!runId && ls("cozRestoredRunId") === runId; }
  function recordFor(run){ var j = lsJSON(JOB); return j && run && j.runId === run.runId && j.fingerprint === run.fingerprint ? j : null; }
  function api(b, path, opt){ opt = opt || {};
    var h = { "Authorization": "Bearer " + (key() || "") }; if (opt.body) h["Content-Type"] = "application/json";
    return fetch(b + path, { method: opt.method || "GET", headers: h, body: opt.body, cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (x) { return { status: r.status, body: x }; }); }); }

  function write(chart, reading12, firstName){
    var run = chart && chart.run ? { runId: chart.run.runId, fingerprint: chart.run.fingerprint } : null;
    return new Promise(function (resolve, reject) {
      var rec = recordFor(run);
      var b = (rec && rec.base) || base();
      if (!run || !b) return reject(new Error("Vedic server not enabled on this device"));
      if (!key()) return reject(new Error("no tester key on this device"));
      var follow = function (jobId) {
        (function tick(){
          api(b, "/vedic-status?job=" + encodeURIComponent(jobId)).then(function (r) {
            var cur = recordFor(run) || { runId: run.runId, fingerprint: run.fingerprint, jobId: jobId, base: b };
            if (r.status !== 200 || !r.body || !Array.isArray(r.body.sections)) { if (r.status === 404) { cur.state = "failed"; lsSet(JOB, cur); notify(); return reject(new Error("job not found")); } return setTimeout(tick, POLL_MS * 2); }
            var v = r.body, secs = {}; v.sections.forEach(function (s) { secs[s.id] = s.state === "released" ? { state: "released", body: s.body } : { state: s.state }; });
            var changed = JSON.stringify(cur.sections) !== JSON.stringify(secs) || cur.state !== v.state;
            cur.sections = secs; cur.state = v.state; lsSet(JOB, cur); if (changed) notify();
            if (v.state === "complete") {
              var sections = {}; IDS.forEach(function (id) { sections[id] = secs[id].body; });
              return resolve({ sections: sections, inputs: { runId: run.runId, fingerprint: run.fingerprint, server: true },
                trace: { model: v.model, generatedAt: new Date().toISOString(), inputTokens: v.cost.inTokens, outputTokens: v.cost.outTokens, estimatedCostUSD: v.cost.estimateUSD, fromCache: false, server: v.version, jobId: v.jobId } });
            }
            if (v.state === "finished") return reject(new Error("some sections could not be completed"));
            setTimeout(tick, POLL_MS);
          }, function () { setTimeout(tick, POLL_MS * 2); });
        })();
      };
      if (rec && rec.jobId) return follow(rec.jobId);                         /* resume or restored: follow only */
      if (restored(run.runId)) return reject(new Error("saved chart reopened: no new writing"));
      lsSet(JOB, { runId: run.runId, fingerprint: run.fingerprint, jobId: null, base: b, state: "starting", sections: {} }); notify();
      api(b, "/vedic-start", { method: "POST", body: JSON.stringify({ chart: chart, reading12: { "essential-nature": reading12["essential-nature"] || [], "mind-intuition": reading12["mind-intuition"] || [] }, firstName: firstName || "" }) })
        .then(function (r) {
          if ((r.status === 200 || r.status === 201) && r.body && r.body.jobId) { var cur = recordFor(run); cur.jobId = r.body.jobId; cur.state = "writing"; lsSet(JOB, cur); notify(); return follow(r.body.jobId); }
          var c2 = recordFor(run); if (c2) { c2.state = "refused"; lsSet(JOB, c2); notify(); }
          reject(new Error("start refused: HTTP " + r.status));
        }, function (e) { reject(e); });
    });
  }
  function sectionView(run, id){
    var j = recordFor(run); if (!j) return null;
    var s = j.sections && j.sections[id];
    if (s && s.state === "released") return { state: "released", paragraphs: s.body };
    if ((s && s.state === "failed") || j.state === "refused" || j.state === "failed" || j.state === "finished") return { state: "failed", paragraphs: [COPY.failed] };
    return { state: "pending", paragraphs: [COPY.pending] };
  }
  window.addEventListener("storage", function (e) { if (e && e.key === JOB) notify(); });
  function pinned(run){ var j = recordFor(run); return !!(j && j.base && OK.some(function (o) { return j.base === o + "/.netlify/functions"; })); }
  window.CozVedicServer = { enabled: function () { return !!base(); }, pinned: pinned, write: write, sectionView: sectionView, COPY: COPY };
})();
