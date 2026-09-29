/* COZ TROPICAL SERVER · TSA1.2 (Stage 2A, Sep 28 2026)
   TSA1.2 also: a device can be pointed at the Netlify "test" BRANCH deploy of the same server for free testing, by
   setting localStorage "cozTropicalServerBase" to https://test--cozalyze-tropical-server.netlify.app (that exact
   address only, matching index.html's CSP; anything else falls back to production). A job keeps the server it was
   started on for every request, including a retried start that never got a job id.
   TSA1.2: a restored (reopened Saved) chart still NEVER starts a job, but it FOLLOWS a job this device already
   holds for the exact same run (runId + fingerprint): status reads only, never a POST. A completed job whose
   reading was removed by the restore is written back to cozTropicalReading for that run.
   TSA1.1 (Sep 27 2026)
   TSA1.1: a page that is not the poller also checks the saved progress itself on every tick and
   tells its page when it changed. Safari did not deliver the storage event into the reading page
   inside index.html's frame, so an open section stayed on "still being written" (first Demo run).
   The Demo's link to the CozAlyze Tropical server (cozalyze-tropical-server.netlify.app).
   Tropical only. Loaded by index.html (starts the job) and tropical-reading.html (shows it).
   Never loaded by Vedic or Compare pages. Never talks to Anthropic; no server secret lives here.

   START: only when the Tropical product is released (the reveal's GOTO_TROPICAL message to
   index.html). Sends the chart this device already calculated (cozTropicalChartJSON) after
   checking it belongs to the current run (emergeBirthData runId + fingerprint). The server
   returns the same job for the same chart, so a repeated start never pays twice. A restored
   saved chart never starts or polls anything.
   FOLLOW: polls the job's status, keeps one small record per run in localStorage
   "cozTropicalServerJob" (job id, overall state, each section passed / pending / failed with
   the passed text). One page polls at a time (a heartbeat lock); the others follow through the
   storage event. Leaving or closing a page never stops the server; any page that loads this
   file picks the same job up again.
   FINISH: when all six sections have passed, writes "cozTropicalReading" in the existing reading
   contract with this run's identity, so the reading page, Saved and the Tropical library work
   exactly as before. A reading with a section that could not be completed is not written there.
   DEMO ACCESS: the tester key is entered once on this device and kept in localStorage
   "cozTropicalServerKey". Production authentication is a later stage. */
(function () {
  if (window.CozTropicalServer) return;
  var BASE = "https://cozalyze-tropical-server.netlify.app/.netlify/functions";
  function chosenBase(){                                                /* TSA1.2: optional branch-deploy override, this device only */
    var o = null; try { o = localStorage.getItem("cozTropicalServerBase"); } catch (e) {}
    return (o === "https://test--cozalyze-tropical-server.netlify.app") ? o + "/.netlify/functions" : BASE;
  }
  var JOB = "cozTropicalServerJob", KEY = "cozTropicalServerKey", LOCK = "cozTropicalServerPoll";
  var POLL_MS = 4000, LOCK_STALE_MS = 12000;
  var OWNER = "tsa-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  var SECTIONS = [
    { id: "at-your-core",           number: 1, title: "At Your Core" },
    { id: "love-desire-creativity", number: 2, title: "Love, Desire & Creativity" },
    { id: "work-money-expression",  number: 3, title: "Work, Money & Expression" },
    { id: "wisdom-purpose-legacy",  number: 4, title: "Wisdom, Purpose & Legacy" },
    { id: "challenges-resilience",  number: 5, title: "Challenges & Resilience" },
    { id: "essential-takeaway",     number: 6, title: "Your Essential Takeaway" }
  ];
  var timer = null;

  function lsJSON(k){ try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function log(m){ try { console.log("[TROPICAL SERVER] " + m); } catch (e) {} }
  function notify(){ try { window.dispatchEvent(new CustomEvent("COZ_TROPICAL_SERVER_UPDATE")); } catch (e) {} }

  /* the current run, and the chart that belongs to it */
  function currentRun(){ var bd = lsJSON("emergeBirthData"); return bd && bd.runId && bd.fingerprint ? { runId: bd.runId, fingerprint: bd.fingerprint } : null; }
  function restored(){ var r = null; try { r = localStorage.getItem("cozRestoredRunId"); } catch (e) {} var run = currentRun(); return !!(r && run && run.runId === r); }
  function chartFor(run){
    var c = lsJSON("cozTropicalChartJSON");
    if (!c || !c.run || !run || c.run.runId !== run.runId || c.run.fingerprint !== run.fingerprint) return null;
    return c;
  }
  function record(){ var run = currentRun(), j = lsJSON(JOB); return (j && run && j.runId === run.runId && j.fingerprint === run.fingerprint) ? j : null; }
  function finalReadingExists(run){
    var r = lsJSON("cozTropicalReading");
    return !!(r && r.run && run && r.run.runId === run.runId && r.run.fingerprint === run.fingerprint && Array.isArray(r.sections) && r.sections.length === 6);
  }
  function key(ask){
    var k = null; try { k = localStorage.getItem(KEY); } catch (e) {}
    if (!k && ask) { try { k = (window.prompt("Tester key for the Tropical reading (this device only):") || "").trim(); } catch (e) { k = ""; } if (k) try { localStorage.setItem(KEY, k); } catch (e) {} }
    return k || null;
  }
  function api(path, opt){
    var k = key(false); opt = opt || {};
    var rec = record(), base = (rec && rec.base) ? rec.base : chosenBase();   /* a job (and any retried start) stays on its own server */
    var h = { "Authorization": "Bearer " + (k || "") }; if (opt.body) h["Content-Type"] = "application/json";
    return fetch(base + path, { method: opt.method || "GET", headers: h, body: opt.body || undefined, cache: "no-store" })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (b) { return { status: res.status, body: b }; }); });
  }

  /* ---------- start (index.html, on GOTO_TROPICAL) ---------- */
  function start(){
    var run = currentRun();
    if (!run) { log("no current run; nothing started"); return; }
    if (restored()) { log("saved chart reopened; never starts a reading"); return; }
    if (finalReadingExists(run)) { log("this run's reading is already complete"); return; }
    var rec = record();
    if (rec && rec.jobId) { log("job already exists for this run; following it"); follow(); return; }
    var chart = chartFor(run);
    if (!chart) { log("no Tropical chart for this run; nothing started"); return; }
    if (!key(true)) { log("no tester key on this device; nothing started"); return; }
    lsSet(JOB, { v: 1, runId: run.runId, fingerprint: run.fingerprint, jobId: null, state: "starting", sections: {}, base: (rec && rec.base) || chosenBase(), startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    notify();
    api("/tropical-start", { method: "POST", body: JSON.stringify({ chart: chart }) }).then(function (r) {
      var j = record(); if (!j) return;
      if ((r.status === 200 || r.status === 201) && r.body && r.body.jobId) {
        j.jobId = r.body.jobId; j.state = "writing"; j.updatedAt = new Date().toISOString(); lsSet(JOB, j); notify();
        log((r.status === 201 ? "new job " : "existing job ") + "started"); follow();
      } else if (r.status === 401) {
        try { localStorage.removeItem(KEY); } catch (e) {}
        j.state = "access"; lsSet(JOB, j); notify(); log("tester key refused; it will be asked for again next time");
      } else {
        j.state = "refused"; j.detail = String((r.body && r.body.error) || ("HTTP " + r.status)).slice(0, 200); lsSet(JOB, j); notify();
        log("start refused before any writing: " + j.detail);
      }
    }).catch(function (e) {
      var j = record(); if (!j) return;
      j.state = "retry"; j.updatedAt = new Date().toISOString(); lsSet(JOB, j); notify(); log("start did not reach the server; it retries while a page is open");
      follow();
    });
  }

  /* ---------- follow (any page) ---------- */
  function haveLock(){
    var l = lsJSON(LOCK), now = Date.now();
    if (l && l.owner !== OWNER && now - l.at < LOCK_STALE_MS) return false;
    lsSet(LOCK, { owner: OWNER, at: now }); return true;
  }
  function done(state){ return state === "complete" || state === "finished" || state === "refused" || state === "access"; }
  var lastSeen = null;
  function tick(){
    timer = null;
    var j = record();
    var seen = j ? (j.jobId || "") + "|" + j.state + "|" + (j.updatedAt || "") : "";
    if (seen !== lastSeen) { lastSeen = seen; notify(); }             /* TSA1.1: progress written by another page */
    if (j && j.state === "complete" && !finalReadingExists(currentRun())) writeFinal(j);   /* TSA1.2: e.g. removed by a restore */
    if (!j || done(j.state)) return;
    if (restored() && !j.jobId) return;                              /* TSA1.2: restored never starts or re-starts; it only follows */
    if (!haveLock()) { timer = setTimeout(tick, POLL_MS); return; }
    if (j.state === "retry" && !j.jobId) { lsSet(JOB, Object.assign(j, { state: "starting" })); restart(); return; }
    if (!j.jobId) { timer = setTimeout(tick, POLL_MS); return; }
    api("/tropical-status?job=" + encodeURIComponent(j.jobId)).then(function (r) {
      var cur = record(); if (!cur || cur.jobId !== j.jobId) return;
      if (r.status === 200 && r.body && Array.isArray(r.body.sections)) apply(cur, r.body);
      else if (r.status === 404) { cur.state = "refused"; cur.detail = "job no longer on the server"; lsSet(JOB, cur); notify(); }
      if (!done((record() || {}).state)) timer = setTimeout(tick, POLL_MS);
    }).catch(function () { timer = setTimeout(tick, POLL_MS * 2); });
  }
  function restart(){ var j = record(); if (j) { lsSet(JOB, Object.assign(j, { jobId: null })); } start(); }
  function follow(){ if (!timer) timer = setTimeout(tick, 50); }

  function apply(j, view){
    var final = view.state === "complete" || view.state === "finished" || view.state === "failed";
    var secs = {};
    view.sections.forEach(function (s) {
      if (s.state === "passed" && Array.isArray(s.body)) secs[s.id] = { state: "passed", body: s.body };
      else secs[s.id] = { state: final ? "failed" : "pending" };
    });
    j.sections = secs; j.state = final ? (view.state === "complete" ? "complete" : "finished") : "writing"; j.updatedAt = new Date().toISOString();
    lsSet(JOB, j); lastSeen = (j.jobId || "") + "|" + j.state + "|" + j.updatedAt;
    if (j.state === "complete") writeFinal(j);
    notify();
  }
  function writeFinal(j){
    var secs = j.sections || {};
    if (!SECTIONS.every(function (s) { return secs[s.id] && secs[s.id].state === "passed" && Array.isArray(secs[s.id].body); })) return;
    var reading = { system: "tropical", title: "Your Tropical Reading", source: "server", jobId: j.jobId,
      run: { runId: j.runId, fingerprint: j.fingerprint }, generatedAt: new Date().toISOString(),
      sections: SECTIONS.map(function (s) { return { id: s.id, number: s.number, title: s.title, body: secs[s.id].body }; }) };
    lsSet("cozTropicalReading", reading);
    try { window.COZ_TROPICAL_READING = reading; } catch (e) {}
    log("reading complete; stored for this run");
  }

  /* ---------- what a page shows for one section ---------- */
  var COPY = { writing: "Your reading is still being written\u2026", pending: "This section is still being written\u2026", failed: "This section couldn\u2019t be completed." };
  function sectionView(id){
    var j = record();
    if (!j) return null;                                           /* no server job for this run */
    if (j.state === "refused" || j.state === "access") return { state: "failed", paragraphs: [COPY.failed] };
    var s = j.sections && j.sections[id];
    if (s && s.state === "passed") return { state: "passed", paragraphs: s.body };
    if (s && s.state === "failed") return { state: "failed", paragraphs: [COPY.failed] };
    if (!j.sections || !Object.keys(j.sections).length) return { state: "writing", paragraphs: [COPY.writing] };
    return { state: "pending", paragraphs: [COPY.pending] };
  }

  /* index.html: the Tropical product release starts the job */
  window.addEventListener("message", function (ev) { var d = ev && ev.data; if (d && d.coz === "GOTO_TROPICAL") start(); });
  /* another page wrote progress: tell this page */
  window.addEventListener("storage", function (ev) { if (ev && (ev.key === JOB || ev.key === "cozTropicalReading")) notify(); });

  window.CozTropicalServer = { start: start, resume: follow, sectionView: sectionView, record: record, COPY: COPY };
  follow();                                                         /* pick up a job already under way */
})();
