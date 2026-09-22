/* COZALYZE · COMBINED READING GENERATOR · CG0.2 · DEVELOPMENT ONLY · NOT APPROVED LANGUAGE
   INPUT: the validated chart-run pair + the Compare evidence manifest (compare-evidence.js).
     Vedic   = only claims that pass the CE1.2 eligibility gate (developmentEligible records,
               no BLOCKED/GAP/PROHIBITED status, sourced, claimConditions satisfied).
     Western = STRUCTURAL factors only. There are no approved Western meanings yet, so every
               Western-derived statement is an unreviewed model interpretation.
   ONE call returns all three sections + an internal evidence trace. Previews stay fixed in
   the page. One retry, reason logged. Cache namespace is DEV only and keyed by run,
   fingerprint, both engine versions, prompt, selection and taxonomy versions and the
   Western claim-system version ("none"), so it can never be reused as a production result
   and is invalidated when any of those change. */
(function(){
  var PROMPT_VERSION = "cmp-prompt 0.2-dev";
  var WESTERN_CLAIM_SYSTEM = "none";                     // bump when the Tropical claim system exists
  var RANGES = { sharedThemes: [325, 450, 5, 5], differentEmphases: [325, 450, 5, 5], integratedView: [375, 500, 5, 6] };
  var DEFAULT_MODEL = "claude-sonnet-4-6";
  var PLANETS = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto","Rahu","Ketu"];
  var NAKSHATRAS = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha",
    "Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha",
    "Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
  var SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

  var SYSTEM = [
    "You write the three-part Combined Reading for CozAlyze. It compares ONE person's Western chart (tropical zodiac) with their Vedic chart (sidereal zodiac). It is not another Western or Vedic reading and never pastes the two together.",
    "",
    "FRAMEWORK. CozAlyze organizes the comparison this way: the Western chart tends to describe visible expression and the outward way of engaging with life; the Vedic chart tends to describe the deeper inner blueprint and orientation. Present this as the product's organizing lens, not a fact, and do not force every sentence into it: either chart may describe a pattern that is lived both inwardly and outwardly. Neither system corrects, disproves, outranks or verifies the other. Never say one chart is right, real, superficial, truer or more spiritual, never describe two conflicting identities, and never treat a sign change as one system invalidating the other.",
    "",
    "EVIDENCE. Use only the evidence supplied. Vedic evidence is a set of eligible claim statements: rephrase and connect them, never add a meaning they do not support, and never extend a claim into anything listed under its prohibited extensions. Western evidence is placements with no approved meanings: interpret them conservatively, never more strongly than the Vedic claims you pair them with.",
    "",
    "SHARED THEMES THRESHOLD. A shared theme needs ALL of: at least one Vedic claim, at least one clearly relevant Western factor, and a real reason the two point to the same functional pattern. If either side is weak, omit that theme entirely. Never write that one side offers only a light or faint signal: a weak convergence is left out, not hedged. Do not pad to reach five topics: five paragraphs may explore two or three strong convergences in more depth.",
    "DIFFERENCES THRESHOLD. Every difference needs at least one Western factor, at least one Vedic claim, and a genuine difference in function or emphasis. A sign change alone is never a difference. A theme supported on only one side gets no comparison at all.",
    "",
    "SECTIONS.",
    "sharedThemes: convergence. Open directly with this person's first convergence; at most one short framing clause, and never explain the product or the zodiacs. Wording like 'Both perspectives may draw attention to', 'A similar pattern appears through different parts of the two charts', 'The two systems seem to converge around', 'This theme may be experienced both outwardly and internally'. Never 'confirmed twice' or anything implying repetition makes it certain. Exactly five paragraphs, 325 to 450 words.",
    "differentEmphases: distinction. Two to four real differences, balanced between the systems, explained as different layers, contexts or expressions. Wording like 'Your Western chart places greater emphasis on', 'Your Vedic chart brings more attention to', 'These are not necessarily opposing descriptions', 'One perspective describes how the pattern may be expressed; the other describes what may be driving it.' Exactly five paragraphs, 325 to 450 words.",
    "integratedView: synthesis ONLY of propositions already established in sharedThemes or differentEmphases. No new factor, claim, theme, prediction or outcome. Do not infer results (for example that decisions work out, hold up, succeed or pay off), and do not make identity-essence judgments such as where the person feels most like themselves or who they really are. Explain how the two emphases may interact, where they reinforce each other, where conscious balance may help, how a difference may become complementary, and the clearest takeaway. Wording like 'Taken together', 'The fuller picture suggests', 'You may recognize both patterns operating in different circumstances', 'Neither perspective needs to cancel the other'. The last paragraph is a concise, specific synthesis, not a motivational ending. Five or six paragraphs, 375 to 500 words.",
    "Each section does a different job; do not repeat the same conclusion across the three.",
    "",
    "CUSTOMER LANGUAGE. Say 'your Western chart' or 'your Western chart using the tropical zodiac', and 'your Vedic chart' or 'your Vedic chart using the sidereal zodiac'; never 'Tropical astrology'. The ONLY chart terms allowed in the prose are the two rising signs by name. Do not name any planet or graha, including the Sun, the Moon and the guiding planet: describe what the factor does in plain words instead. Never name a nakshatra, a pada, a house or house number, another zodiac sign, an aspect, a rulership, a claim ID or a factor label.",
    "",
    "VOICE. Sound like a person speaking, not a lecture. Establish the frame once and then write with natural confidence; do not hedge every sentence, but keep possibility language present: 'may', 'can', 'often', 'appears to emphasize', 'suggests', 'may be experienced as'. Roughly 7th to 8th grade reading level, mostly short sentences, concrete human situations, no academic psychology, no filler. No 6+ word phrase may repeat across the three sections.",
    "REGISTER. No absolute personality declarations, predictions, timing, guaranteed outcomes, medical or mental-health claims, moral judgments, fear-based language, deities, mythology, historical explanations, or generic spiritual filler. Never 'your true self', 'your false self', 'your destiny is', 'you are meant to', 'this will happen', 'you will'. Do not use em dashes; use commas.",
    "",
    "OUTPUT. Return ONLY a JSON object, no prose before or after, no code fences:",
    "{\"sharedThemes\": {\"paragraphs\": [...], \"wordCount\": n, \"evidence\": [{\"id\": \"S1\", \"theme\": themeKey, \"paragraphs\": [paragraph numbers], \"use\": \"shared\", \"tropicalFactors\": [exact factor ids], \"vedicClaimIds\": [exact claim ids], \"why\": \"one line on why they point to the same pattern\"}]},",
    " \"differentEmphases\": {same shape, ids D1.., use \"different\", why = the genuine difference},",
    " \"integratedView\": {same shape, ids I1.., use \"integrated\", plus \"buildsOn\": [ids of the S and D entries it synthesizes]}}",
    "Use only the exact factor ids and claim ids supplied. Every major claim appears in its section's evidence list. The evidence lists are internal and never shown to the customer."
  ].join("\n");

  var THEME_LABEL = { identity_orientation: "identity and orientation", emotional_mental_patterns: "emotional and mental patterns",
    relationships_exchange: "relationships and exchange", work_life_direction: "work and life direction",
    values_foundation: "values and foundation", growth_release_balance: "growth, release and balance" };

  function supplied(man){
    var t = {}, v = {}, vStatus = {}, themes = {};
    man.items.forEach(function(i){
      if (i.system === "tropical" && (i.evidenceStatus === "STRUCTURAL_ONLY_NO_APPROVED_MEANING" || /ruler/.test(i.factorId) && i.evidenceStatus === "BLOCKED_PENDING_RULING")) { t[i.factorId] = i.themeKey; }
      if (i.system === "vedic" && i.compareEligible) (i.claimMeanings || []).forEach(function(c){ v[c.claimId] = i.themeKey; vStatus[c.claimId] = { recordStatus: i.evidenceStatus, classification: c.classification, record: i.source.recordId }; });
    });
    Object.keys(THEME_LABEL).forEach(function(k){
      themes[k] = Object.keys(t).some(function(f){ return t[f] === k; }) && Object.keys(v).some(function(c){ return v[c] === k; });
    });
    return { tropical: t, vedic: v, vedicStatus: vStatus, comparable: themes };
  }

  function userMessage(man, pair, sup){
    var L = ["Rising signs: Western " + cap(pair.tropical.sign) + ", Vedic " + cap(pair.vedic.sign) + ".", ""];
    Object.keys(THEME_LABEL).forEach(function(k){
      var T = man.items.filter(function(i){ return i.system === "tropical" && i.themeKey === k && sup.tropical[i.factorId] === k; });
      var V = man.items.filter(function(i){ return i.system === "vedic" && i.themeKey === k && i.compareEligible; });
      L.push("THEME " + k + " (" + THEME_LABEL[k] + ")" + (sup.comparable[k] ? "" : "  [NOT COMPARABLE: evidence on one side only, write nothing comparative about it]"));
      L.push("  Western factors: " + (T.length ? T.map(function(i){ return i.factorId + (/ruler/.test(i.factorId) ? " (ruler convention undecided, use lightly)" : ""); }).join("; ") : "none"));
      if (V.length){
        L.push("  Vedic claims:");
        var seen = {};
        V.forEach(function(i){
          (i.claimMeanings || []).forEach(function(c){ if (seen[c.claimId]) return; seen[c.claimId] = 1; L.push("   - [" + c.claimId + "] " + c.meaning); });
          if (i.prohibitedExtensions && i.prohibitedExtensions.length) L.push("     prohibited extensions: " + i.prohibitedExtensions.join("; "));
        });
      } else L.push("  Vedic claims: none eligible");
      L.push("");
    });
    L.push("Write the Combined Reading now. JSON only.");
    return L.join("\n");
  }
  function cap(s){ return String(s).charAt(0).toUpperCase() + String(s).slice(1); }
  function words(ps){ return ps.join(" ").trim().split(/\s+/).filter(Boolean).length; }
  function tidy(t){ return String(t).replace(/\s*\u2014\s*/g, ", ").replace(/\s*\u2013\s*/g, ", ").replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").trim(); }
  function esc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function validate(out, sup, pair){
    var hard = [], soft = [];
    if (!out) return { hard: ["unparseable response"], soft: [] };
    var allowedSigns = [cap(pair.tropical.sign), cap(pair.vedic.sign)];
    var otherSigns = SIGNS.filter(function(s){ return allowedSigns.indexOf(s) < 0; });
    var banned = [
      [new RegExp("\\b(" + PLANETS.join("|") + ")\\b"), "planet name"],
      [new RegExp("\\b(" + NAKSHATRAS.map(esc).join("|") + ")\\b", "i"), "nakshatra name"],
      [new RegExp("\\b(" + otherSigns.join("|") + ")\\b"), "sign other than the two rising signs"],
      [/\b(nakshatras?|padas?|dashas?|ayanamsh?a|graha|lagna)\b/i, "technical term"],
      [/\b\d{1,2}(st|nd|rd|th) house\b|\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) house\b|\bhouse of\b/i, "house reference"],
      [/\b(APP|IR|APPREC)-[A-Z0-9-]+|\btrop\.[a-z]/, "internal ID"],
      [/\b(true self|false self|destiny is|meant to|will happen|you will|confirmed twice|tropical astrology)\b/i, "banned phrase"],
      [/\b(light signal|faint signal|weak signal|only a hint)\b/i, "weak convergence hedge"],
      [/\bdifferent zodiacs\b/i, "product explanation"],
      [/\b(holds? up|pays? off|succeeds?|turns? out well|works? out (well|fine|for you)|most like yourself|who you really are|the real you)\b/i, "outcome or identity-essence inference"],
      [/\u00B0/, "degree sign"]
    ];
    var ids = { S: {}, D: {} };
    Object.keys(RANGES).forEach(function(k){
      var r = RANGES[k], sct = out[k];
      if (!sct || !Array.isArray(sct.paragraphs)) { hard.push(k + ": missing"); return; }
      sct.paragraphs = sct.paragraphs.map(tidy).filter(Boolean);
      var w = words(sct.paragraphs); sct.wordCountMeasured = w;
      if (w < r[0] || w > r[1]) (w < r[0] - 25 || w > r[1] + 25 ? hard : soft).push(k + ": " + w + " words (" + r[0] + "-" + r[1] + ")");
      if (sct.paragraphs.length < r[2] || sct.paragraphs.length > r[3]) hard.push(k + ": " + sct.paragraphs.length + " paragraphs");
      var text = sct.paragraphs.join(" ");
      banned.forEach(function(b){ var m = text.match(b[0]); if (m) hard.push(k + ": " + b[1] + " \"" + m[0] + "\""); });
      if (!Array.isArray(sct.evidence) || !sct.evidence.length) { hard.push(k + ": no evidence trace"); return; }
      sct.evidence.forEach(function(e){
        var tf = e.tropicalFactors || [], vc = e.vedicClaimIds || [];
        tf.forEach(function(f){ if (!sup.tropical[f]) hard.push(k + " " + e.id + ": unknown Western factor " + f); });
        vc.forEach(function(c){ if (!sup.vedic[c]) hard.push(k + " " + e.id + ": Vedic claim not eligible or not supplied " + c); });
        if (k !== "integratedView"){
          if (!tf.length || !vc.length) hard.push(k + " " + e.id + ": needs evidence on BOTH sides");
          if (e.theme && !sup.comparable[e.theme]) hard.push(k + " " + e.id + ": theme " + e.theme + " is not comparable");
          ids[k === "sharedThemes" ? "S" : "D"][e.id] = e;
        }
      });
    });
    if (out.integratedView && Array.isArray(out.integratedView.evidence)){
      var prior = { f: {}, c: {}, t: {} };
      ["sharedThemes","differentEmphases"].forEach(function(k){ ((out[k] || {}).evidence || []).forEach(function(e){
        (e.tropicalFactors || []).forEach(function(f){ prior.f[f] = 1; }); (e.vedicClaimIds || []).forEach(function(c){ prior.c[c] = 1; }); prior.t[e.theme] = 1; }); });
      out.integratedView.evidence.forEach(function(e){
        (e.tropicalFactors || []).forEach(function(f){ if (!prior.f[f]) hard.push("integratedView " + e.id + ": new Western factor " + f); });
        (e.vedicClaimIds || []).forEach(function(c){ if (!prior.c[c]) hard.push("integratedView " + e.id + ": new Vedic claim " + c); });
        if (e.theme && !prior.t[e.theme]) hard.push("integratedView " + e.id + ": new theme " + e.theme);
        (e.buildsOn || []).forEach(function(b){ if (!ids.S[b] && !ids.D[b]) hard.push("integratedView " + e.id + ": buildsOn unknown entry " + b); });
      });
    }
    return { hard: hard, soft: soft };
  }

  function cacheKey(pair, man){
    return "cozCombinedReadingDEV:" + [pair.runId, pair.fingerprint, pair.engineVersions.tropical, pair.engineVersions.vedic,
      PROMPT_VERSION, man.selectionVersion, man.taxonomyVersion, "westernClaims=" + WESTERN_CLAIM_SYSTEM].join("|");
  }
  function logCall(e){ try { var L = JSON.parse(localStorage.getItem("cozCombinedGenLog") || "[]"); L.push(e); localStorage.setItem("cozCombinedGenLog", JSON.stringify(L.slice(-40))); } catch(x){} }

  /* Sep 22 (item 5): cache-only lookup, and an in-flight marker so a generation started
     in index.html (the living page) is not duplicated by the reading page. */
  var INFLIGHT = "cozCombinedGenInFlight", INFLIGHT_MAX_MS = 150000;
  function peek(pair, man){
    try { var c = JSON.parse(localStorage.getItem(cacheKey(pair, man)) || "null"); if (c && c.sharedThemes){ c.fromCache = true; return c; } } catch(e){}
    return null;
  }
  function inFlight(pair, man){
    try { var m = JSON.parse(localStorage.getItem(INFLIGHT) || "null"); return !!(m && m.key === cacheKey(pair, man) && (Date.now() - m.at) < INFLIGHT_MAX_MS); } catch(e){ return false; }
  }
  function markInFlight(key, on){ try { if (on) localStorage.setItem(INFLIGHT, JSON.stringify({ key: key, at: Date.now() })); else localStorage.removeItem(INFLIGHT); } catch(e){} }
  /* Safari reports a dropped connection as TypeError "Load failed"; retry those twice */
  /* v4: a 429 (too many requests) or 529 (overloaded) is waited out and retried,
     honouring retry-after when the API sends one */
  function retryAfterMs(r, attempt){
    var h = r.headers && r.headers.get && r.headers.get("retry-after");
    var s = h ? parseFloat(h) : NaN;
    return isFinite(s) ? Math.min(s * 1000, 30000) : Math.min(4000 * attempt, 20000);
  }
  function fetchRetry(url, opts, tries, attempt){
    attempt = attempt || 1;
    return fetch(url, opts).then(function(r){
      if ((r.status === 429 || r.status === 529) && tries > 0)
        return new Promise(function(res){ setTimeout(res, retryAfterMs(r, attempt)); }).then(function(){ return fetchRetry(url, opts, tries - 1, attempt + 1); });
      return r;
    }).catch(function(e){
      if (tries > 0 && e && e.name !== "AbortError" && (e.name === "TypeError" || /load failed|network/i.test(e.message || ""))) {
        return new Promise(function(res){ setTimeout(res, 2500); }).then(function(){ return fetchRetry(url, opts, tries - 1); });
      }
      throw e;
    });
  }
  var inPage = null;
  function getCombined(pairCtx, man){
    var key = cacheKey(pairCtx.pair, man);
    var hit = peek(pairCtx.pair, man); if (hit) return Promise.resolve(hit);
    if (inPage) return inPage;
    var apiKey = null, model = DEFAULT_MODEL;
    try { apiKey = localStorage.getItem("cozTestApiKey"); model = localStorage.getItem("cozTestModel") || model; } catch(e){}
    if (!apiKey) return Promise.reject(new Error("DEV: no test API key on this device. Open test-index.html and enter the Demo test key."));
    var sup = supplied(man);
    if (!Object.keys(sup.comparable).some(function(k){ return sup.comparable[k]; })) return Promise.reject(new Error("DEV: no theme has eligible evidence on both sides for this chart"));
    var user = userMessage(man, pairCtx.pair, sup);
    function call(msg, attempt, retryReason){
      logCall({ key: key, attempt: attempt, retryReason: retryReason || null, at: new Date().toISOString() });
      try { localStorage.setItem("cozCombinedGenPhase", JSON.stringify({ key: key, attempt: attempt, startedAt: Date.now() })); } catch(e){}
      /* v4: a call that has not answered in 150 s is abandoned (it was able to hang forever) */
      var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var tm = ctl ? setTimeout(function(){ ctl.abort(); }, 150000) : null;
      return fetchRetry("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: ctl ? ctl.signal : undefined,
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true", "content-type": "application/json" },
        body: JSON.stringify({ model: model, max_tokens: 7000, system: SYSTEM, messages: [{ role: "user", content: msg }] })
      }, 3).then(function(r){ return r.text().then(function(t){ clearTimeout(tm); if (!r.ok) throw new Error("DEV: API " + r.status + ": " + t.slice(0, 200)); return JSON.parse(t); }); },
                 function(e){ clearTimeout(tm); if (e && e.name === "AbortError") throw new Error("DEV: the combined reading took longer than 150 seconds (attempt " + attempt + ")"); throw e; })
      .then(function(data){
        var text = (data.content || []).filter(function(b){ return b.type === "text"; }).map(function(b){ return b.text; }).join("\n");
        var clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
        var out = null; try { out = JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1)); } catch(e){}
        var v = validate(out, sup, pairCtx.pair);
        /* v4 (Sep 22): only HARD failures (forbidden terms, missing or untraceable evidence,
           wrong paragraph count) earn a second full pass. Soft notes, such as a word count
           a little outside its range, are accepted and recorded; they were doubling the wait. */
        var retryable = v.hard;
        try { localStorage.setItem("cozCombinedGenPhase", JSON.stringify({ key: key, attempt: attempt, done: !retryable.length || attempt === 2, at: Date.now() })); } catch(e){}
        if (retryable.length && attempt === 1)
          return call(user + "\n\nYour previous attempt failed these checks: " + retryable.join("; ") + ". Fix every one and return the full JSON again.", 2, retryable.join("; "))
            .then(function(r2){ r2.firstAttemptProblems = retryable; return r2; });
        if (v.hard.length) throw new Error("DEV: combined reading failed validation after retry: " + v.hard.join("; "));
        return { out: out, attempts: attempt, validation: v, raw: text };
      });
    }
    markInFlight(key, true);
    inPage = call(user, 1).then(function(r){
      var used = {};
      ["sharedThemes","differentEmphases","integratedView"].forEach(function(k){ (r.out[k].evidence || []).forEach(function(e){ (e.vedicClaimIds || []).forEach(function(c){ used[c] = sup.vedicStatus[c]; }); }); });
      var rec = {
        sharedThemes: r.out.sharedThemes, differentEmphases: r.out.differentEmphases, integratedView: r.out.integratedView,
        runId: pairCtx.pair.runId, fingerprint: pairCtx.pair.fingerprint, engineVersions: pairCtx.pair.engineVersions,
        promptVersion: PROMPT_VERSION, selectionVersion: man.selectionVersion, taxonomyVersion: man.taxonomyVersion, westernClaimSystem: WESTERN_CLAIM_SYSTEM,
        developmentOnly: true, productionEligible: false, approved: false,
        tropicalEvidenceStatus: "unreviewed_model_interpretation",
        vedicEvidenceStatus: used,
        generatedAt: new Date().toISOString(), attempts: r.attempts, firstAttemptProblems: r.firstAttemptProblems || [],
        trace: { model: model, validation: r.validation, comparableThemes: sup.comparable, systemPrompt: SYSTEM, userMessage: user, rawResponse: r.raw }
      };
      try { localStorage.setItem(key, JSON.stringify(rec)); } catch(e){}
      markInFlight(key, false);
      return rec;
    });
    inPage.catch(function(){ inPage = null; markInFlight(key, false); });
    return inPage;
  }

  window.COZ_COMBINED_GEN = { PROMPT_VERSION: PROMPT_VERSION, getCombined: getCombined, peek: peek, inFlight: inFlight, _system: SYSTEM, _validate: validate, _supplied: supplied, _userMessage: userMessage };
})();
