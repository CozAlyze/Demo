/* SAVED VEDIC LIBRARY · SL1.2 (Sep 23 2026)
   The Vedic Saved Library's data module. One job in two halves:

   CAPTURE (at save time, through CozSaved.registerPayload): snapshot the finalized
   six-section reading (window.COZ_VEDIC_READING), the rendered deterministic Lagna copy
   (window.COZ_LAGNA_BANK, the one-line hook in vedic-reading.html) and the chart's
   lifeCycle block into rec.library.vedic of the existing cozSavedCharts record. Every
   piece is taken from the record's own snapshot chart after its run id and fingerprint
   are checked against the record.
   A saved document stays the exact version the customer saved: nothing is rebuilt later
   from whatever interpretation library is current.

   READ (on the Saved Library pages): CozSavedVedic.load() returns the selected record
   (?id=..., else the record of the run now on this device), its chart and its library.

   Requires coz-saved.js CS1.2 loaded first. Never calculates. Never calls the model. */
(function () {
  if (window.CozSavedVedic || !window.CozSaved) return;
  var SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  var SECTIONS = [
    { id: "essential-nature",     number: 1, title: "Your Essential Nature & Guiding Planet" },
    { id: "mind-intuition",       number: 2, title: "Your Mind, Intuition & Spiritual Patterning" },
    { id: "relationships-karmic", number: 3, title: "Relationships, Desire & Karmic Exchange" },
    { id: "dharma-direction",     number: 4, title: "Dharma, Work & Life Direction" },
    { id: "rahu-ketu",            number: 5, title: "Rahu & Ketu \u2014 Growth, Release & Balance" },
    { id: "essential-takeaway",   number: 6, title: "Your Essential Takeaway" }
  ];
  /* the record's OWN chart, never the live key: chart B can never be attached to record A */
  function recordChart(rec){
    var c = null; try { c = JSON.parse((rec && rec.snapshot && rec.snapshot.cozChartJSON) || "null"); } catch (e) {}
    if (!c || !Array.isArray(c.planets)) return null;
    if (!runMatches(c.run, rec)) return null;
    return c;
  }
  function runMatches(run, rec){
    if (!run || !rec || !rec.runId || run.runId !== rec.runId) return false;
    if (run.fingerprint && rec.fingerprint && run.fingerprint !== rec.fingerprint) return false;
    return true;
  }
  function ascSign(chart){
    if (!chart) return null;
    var a = Array.isArray(chart.planets) ? chart.planets.filter(function (p) { return p && p.name === "Ascendant"; })[0] : null;
    var n = a ? a.signNumber : chart.ascendantSignNumber;
    return (n >= 1 && n <= 12) ? SIGNS[n - 1] : null;
  }
  function sectionList(){
    var live = null;
    try { live = (typeof vedicReadingSections !== "undefined" && Array.isArray(vedicReadingSections)) ? vedicReadingSections : null; } catch (e) {}
    return (live || SECTIONS).map(function (s) { return { id: s.id, number: s.number, title: s.title }; });
  }

  /* ---- capture ---- */
  function captureReading(rec){
    var r = window.COZ_VEDIC_READING;
    if (!r || typeof r !== "object") return null;
    if (!runMatches(r.run, rec)) return null;         /* another run's reading, or no run identity */
    var order = sectionList(), sections = {}, complete = true;
    order.forEach(function (s) {
      var paras = Array.isArray(r[s.id]) ? r[s.id].filter(function (p) { return typeof p === "string" && p.trim(); }) : [];
      if (!paras.length) complete = false;
      sections[s.id] = paras;
    });
    if (!complete) return null;                       /* an unfinished reading is never saved as a document */
    return { order: order, sections: sections, capturedAt: new Date().toISOString() };
  }
  function captureLagna(rec){
    var bank = window.COZ_LAGNA_BANK;
    var sign = ascSign(recordChart(rec));
    if (!bank || !bank.signs || !sign) return null;
    var S = bank.signs[sign.toLowerCase()];
    if (!S) return null;
    return {
      sign: sign, ruler: S.ruler || null, title: S.title || (sign + " Rising").toUpperCase(),
      shared: (bank.shared || []).slice(), essence: (S.essence || []).slice(), dharma: (S.dharma || []).slice(),
      capturedAt: new Date().toISOString()
    };
  }
  function captureLifeCycle(rec){
    var chart = recordChart(rec);
    var lc = chart && chart.lifeCycle;
    if (!lc || !lc.mahadasha) return null;
    return { data: JSON.parse(JSON.stringify(lc)), capturedAt: new Date().toISOString() };
  }
  window.CozSaved.registerPayload("vedic", function (rec) {
    return { reading: captureReading(rec), lagna: captureLagna(rec), lifeCycle: captureLifeCycle(rec) };
  });

  /* ---- read ---- */
  function load(){
    var id = null; try { id = new URLSearchParams(location.search).get("id"); } catch (e) {}
    var rec = null;
    if (id) { rec = window.CozSaved.get(id); if (!rec) return null; }   /* an explicit id fails closed, never another person */
    else rec = window.CozSaved.currentRecord();
    if (!rec || !rec.snapshot) return null;
    var chart = null; try { chart = JSON.parse(rec.snapshot.cozChartJSON || "null"); } catch (e) {}
    var lib = (rec.library && rec.library.vedic) || {};
    return {
      rec: rec, id: rec.id, chart: chart, library: lib,
      has: { reading: !!(lib.reading && lib.reading.sections), lagna: !!(lib.lagna && lib.lagna.sign), lifeCycle: !!(lib.lifeCycle && lib.lifeCycle.data) },
      name: rec.name || (chart && chart.person && chart.person.name) || "",
      birth: (chart && chart.birth) || {}
    };
  }
  function href(page, id){ return page + "?saved=1&id=" + encodeURIComponent(id || ""); }
  window.CozSavedVedic = { load: load, href: href, SECTIONS: SECTIONS };
})();
