/* SAVED TROPICAL LIBRARY · TL1.0 (Sep 24 2026)
   The Tropical Saved Library's data module. Tropical pages only; never loaded by Vedic or
   Compare pages. Same shape as saved-vedic-library.js, its own payload name ("tropical").

   CAPTURE (at save time, through CozSaved.registerPayload): snapshot the finished
   six-section Tropical reading (the record's own cozTropicalReading) and the rendered
   Rising Sign copy (window.COZ_TROPICAL_RISING, the one-line hook in tropical-reading.html)
   into rec.library.tropical of the existing cozSavedCharts record. Current Transits is
   not captured yet: that reading does not exist. A saved document stays the exact version
   the customer saved.

   READ (on the Saved Library pages): CozSavedTropical.load() returns the selected record
   (?id=..., else the record of the run now on this device), its chart and its library.
   An explicit id that is not found fails closed.

   Requires coz-saved.js CS1.3 loaded first. Never calculates. Never calls the model. */
(function () {
  if (window.CozSavedTropical || !window.CozSaved) return;
  var SECTIONS = [
    { id: "at-your-core",           number: 1, title: "At Your Core" },
    { id: "love-desire-creativity", number: 2, title: "Love, Desire & Creativity" },
    { id: "work-money-expression",  number: 3, title: "Work, Money & Expression" },
    { id: "wisdom-purpose-legacy",  number: 4, title: "Wisdom, Purpose & Legacy" },
    { id: "challenges-resilience",  number: 5, title: "Challenges & Resilience" },
    { id: "essential-takeaway",     number: 6, title: "Your Essential Takeaway" }
  ];
  function parse(s){ try { return JSON.parse(s || "null"); } catch (e) { return null; } }
  function runMatches(run, rec){
    if (!run || !rec || !rec.runId || run.runId !== rec.runId) return false;
    if (run.fingerprint && rec.fingerprint && run.fingerprint !== rec.fingerprint) return false;
    return true;
  }
  /* the record's OWN Tropical chart, never the live key */
  function recordChart(rec){
    var c = parse(rec && rec.snapshot && rec.snapshot.cozTropicalChartJSON);
    if (!c || !Array.isArray(c.bodies) || !c.angles || !c.angles.ascendant) return null;
    return runMatches(c.run, rec) ? c : null;
  }
  function ascSign(chart){
    var s = chart && chart.angles && chart.angles.ascendant && chart.angles.ascendant.sign;
    return s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase() : null;
  }
  function sectionList(){
    var live = null;
    try { live = (typeof vedicReadingSections !== "undefined" && Array.isArray(vedicReadingSections)) ? vedicReadingSections : null; } catch (e) {}
    return (live || SECTIONS).map(function (s) { return { id: s.id, number: s.number, title: s.title }; });
  }
  function mapFromContract(obj){
    if (!obj || typeof obj !== "object") return null;
    if (Array.isArray(obj.sections)) { var m = {}; obj.sections.forEach(function (sec) { if (sec && sec.id && Array.isArray(sec.body)) m[sec.id] = sec.body; }); return m; }
    return obj;
  }

  /* ---- capture ---- */
  function captureReading(rec){
    /* the record's own stored reading first; the page's live object only if it carries the same run */
    var src = parse(rec && rec.snapshot && rec.snapshot.cozTropicalReading);
    if (!src || src.fixture === true || src.sample === true || !runMatches(src.run, rec)) src = null;
    if (!src) { var live = window.COZ_TROPICAL_READING; if (live && live.fixture !== true && live.sample !== true && runMatches(live.run, rec)) src = live; }
    if (!src) return null;
    var map = mapFromContract(src), order = sectionList(), sections = {}, complete = true;
    order.forEach(function (s) {
      var paras = Array.isArray(map && map[s.id]) ? map[s.id].filter(function (p) { return typeof p === "string" && p.trim(); }) : [];
      if (!paras.length) complete = false;
      sections[s.id] = paras;
    });
    if (!complete) return null;
    return { order: order, sections: sections, capturedAt: new Date().toISOString() };
  }
  function captureAscendant(rec){
    var bank = window.COZ_TROPICAL_RISING;
    var chart = recordChart(rec);
    var sign = ascSign(chart);
    if (!bank || !bank.signs || !sign) return null;
    var T = bank.signs[sign.toLowerCase()];
    if (!T) return null;
    var out = {
      sign: sign, title: T.title, traditionalRuler: T.traditionalRuler || null, modernRuler: T.modernRuler || null,
      shared: (bank.shared || []).slice(), meet: (T.meet || []).slice(),
      degree: chart.angles.ascendant.degree, minute: chart.angles.ascendant.minute,
      capturedAt: new Date().toISOString()
    };
    /* the chart-ruler layer is composed by tropical-reading.html from the live record; it is
       taken only when that live record is this same run, so it can never belong to another chart */
    try {
      var liveChart = parse(localStorage.getItem("cozTropicalChartJSON"));
      if (typeof bank.rulerLayer === "function" && liveChart && runMatches(liveChart.run, rec)) {
        var L = bank.rulerLayer(sign.toLowerCase());
        if (L && !L.unavailable) { out.ruler = L.ruler.slice(); out.notice = L.notice.slice(); out.status = L.status || null; }
      }
    } catch (e) {}
    return out;
  }
  window.CozSaved.registerPayload("tropical", function (rec) {
    if (!rec || !rec.systems || !rec.systems.tropical) return null;
    return { reading: captureReading(rec), ascendant: captureAscendant(rec) };
  });

  /* ---- read ---- */
  function load(){
    var id = null; try { id = new URLSearchParams(location.search).get("id"); } catch (e) {}
    var rec = null;
    if (id) { rec = window.CozSaved.get(id); if (!rec) return null; }
    else rec = window.CozSaved.currentRecord();
    if (!rec || !rec.snapshot) return null;
    var chart = parse(rec.snapshot.cozTropicalChartJSON);
    var lib = (rec.library && rec.library.tropical) || {};
    var cl = (chart && chart.client) || {};
    return {
      rec: rec, id: rec.id, chart: chart, library: lib,
      has: { reading: !!(lib.reading && lib.reading.sections), ascendant: !!(lib.ascendant && lib.ascendant.sign), transits: !!(chart && chart.run) },
      name: rec.name || cl.displayName || "",
      birth: { date: cl.birthDate || "", time: cl.birthTime || "", location: cl.locationLabel || "" }
    };
  }
  function href(page, id){ return page + "?saved=1&id=" + encodeURIComponent(id || ""); }
  window.CozSavedTropical = { load: load, href: href, SECTIONS: SECTIONS };
})();
