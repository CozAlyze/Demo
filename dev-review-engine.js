/* ============================================================
   COZALYZE — TEMPORARY DEVELOPMENT-REVIEW GENERATOR
   No AI call. No server. No Netlify. Runs entirely in the browser
   from calculated chart facts plus already-approved claim records.

   Sections 1-2: real coverageItem/selector matching against the
   Section 1 and Section 2 application-claims records (the same
   records the production pipeline would use), concatenated into
   draft paragraphs. Every sentence here is an existing approved
   allowedMeaning string -- nothing is invented.

   Sections 3-6: NO application-claims records exist for these yet
   (confirmed by direct inspection, not assumed). This is a KNOWN GAP,
   not a bug. The only content available is the two hand-drafted
   reference readings (Checkpoint 8, editorial/six-section-samples).
   A new chart matches one of those two only if its ascendant sign +
   Moon sign + Moon nakshatra are IDENTICAL to a reference chart.
   Otherwise this returns a plain, honest placeholder stating the
   calculated fact -- never an invented interpretation.

   Every reading produced here is labeled a development-review draft,
   pending Nina's review, not a production-verified reading.
   ============================================================ */
(function (global) {
  "use strict";

  var SIGN_NAMES = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
  var SIGN_LORD = { aries:"ma", taurus:"ve", gemini:"me", cancer:"mo", leo:"su", virgo:"me", libra:"ve", scorpio:"ma", sagittarius:"jp", capricorn:"sa", aquarius:"sa", pisces:"jp" };
  var CODE_TO_NAME = { su:"Sun", mo:"Moon", ma:"Mars", me:"Mercury", jp:"Jupiter", ve:"Venus", sa:"Saturn", ra:"Rahu", ke:"Ketu" };
  var NAME_TO_CODE = { Sun:"su", Moon:"mo", Mars:"ma", Mercury:"me", Jupiter:"jp", Venus:"ve", Saturn:"sa", Rahu:"ra", Ketu:"ke" };

  /* SR1 (Oct 10 2026): the chart exporter spells this nakshatra "Dhanishtha"; every claim file keys it
     "dhanishta". The alias lets the existing records match. Chart calculations and claim wording unchanged. */
  var NAK_KEY_ALIAS = { "dhanishtha": "dhanishta" };
  var NAK_NAME_ALIAS = { "Dhanishtha": ["Dhanishta"] };   /* claim prose uses the claim-file spelling */
  /* SR1 bridge (Oct 19 2026): the six-section reading (generateDevReview) uses the alias only when its page asks with
     { sr1: true }. A page that doesn't ask, such as a copy cached before this change, gets the Sections 1-2 it always
     assembled. The Ascendant evidence and the Compare records always use it: those readings are reused by keys that
     don't include the evidence, so nothing is written again. */
  var aliasOn = true;
  /* S2C (Oct 21 2026, offline): the corrected Section 2, used only when the page asks with { s2c: true }. The page then
     also passes the corrected Lisbon records (application-claims-lisbon-s2c.json) among the Section 2 files. A page
     that doesn't ask, such as a copy cached before this change, gets the Section 2 it always assembled. Two rules, for
     Section 2 only:
     1. Each record's claimConditions are honored, as compare-evidence.js already honors them: a claim listed there is
        used only when every claim it "requires", and at least one claim it "requiresAny", is also used in this
        Section 2. Claims whose conditions fail are dropped until nothing changes.
     2. The claims a record lists in "presentTogether" stay in one paragraph, in the record's order.
     Section 1, Sections 3-6 and the Compare selections (selectRecords, selectAscendantEvidence) are unchanged. */
  var s2cOn = false;
  /* SW1 (Oct 26 2026, offline): the Sections 1-2 wording developed on Oct 14, used only when the page asks with
     { sw1: true }. A page that doesn't ask, such as a copy cached before this change, gets the Sections 1-2 it always
     assembled. Three changes:
     1. Section 1 opens by explaining Vedic astrology, the rising sign, its ruler (the guiding planet, now "a central
        influence in this reading"), what "influence" means in this reading and the twelve areas. The "--" dash goes,
        and the Sun and the Moon take "the".
     2. Section 2 opens by explaining the nakshatras (27 divisions of the zodiac) and why the Moon's matters. "Sits inside"
        becomes "is in". The Moon's nakshatra is still named exactly once.
     Chat's review (Oct 26) changed two phrases of the Oct 14 wording: "a central influence in this reading" and "27
     divisions of the zodiac" (with "division" and "nakshatra" in place of "star group" after it).
     3. Three pronoun errors in claim sentences are corrected (SW1_FIX).
     Each opening is its own paragraph; the claim sentences are split into paragraphs as before. No claim is added,
     removed or reworded beyond SW1_FIX. Sections 3-6 and the Compare selections are unchanged. */
  var sw1On = false;
  var SW1_FIX = [
    ["central and genuinely their own.", "central and truly your own."],
    ["the feelings or responses of someone close to them.", "the feelings or responses of someone close to you."],
    ["discovering what allows them to remain internally centered.", "discovering what allows you to remain internally centered."]
  ];
  function sw1Fix(t) { SW1_FIX.forEach(function (f) { t = String(t).split(f[0]).join(f[1]); }); return t; }
  function sw1Lord(code) { var n = CODE_TO_NAME[code]; return (code === "su" || code === "mo") ? "the " + n : n; }
  function nakKey(name) { var k = String(name || "").toLowerCase().trim().replace(/\s+/g, "-"); return (aliasOn && NAK_KEY_ALIAS[k]) || k; }
  function signName(signNumber) { return SIGN_NAMES[(signNumber - 1 + 12) % 12]; }
  function findPlanet(chart, name) {
    for (var i = 0; i < chart.planets.length; i++) if (chart.planets[i].name === name) return chart.planets[i];
    return null;
  }

  /* ---------- Section 1 ---------- */
  function computeS1Keys(chart) {
    var asc = findPlanet(chart, "Ascendant");
    var ascSign = signName(asc.signNumber);
    var ascLordCode = SIGN_LORD[ascSign];
    var ascLordPlanet = findPlanet(chart, CODE_TO_NAME[ascLordCode]);
    var keys = ["guiding-planet." + ascLordCode, "asc-sign." + ascSign, "asc-nakshatra." + nakKey(asc.nakshatra)];
    if (ascLordPlanet) keys.push("asc-lord-in-house." + ascLordPlanet.house);
    return { keys: keys, ascSign: ascSign, ascLordCode: ascLordCode, ascLordPlanet: ascLordPlanet, asc: asc };
  }

  function recordMatchesKeys(rec, keySet) {
    if (rec.coverageItem) return keySet.indexOf(rec.coverageItem) !== -1;
    return false;
  }

  function recordMatchesSelector(rec, chart) {
    if (!rec.selector || !rec.selector.all) return false;
    return rec.selector.all.every(function (cond) {
      if (cond.factId === "graha:mo") {
        var moon = findPlanet(chart, "Moon");
        if (!moon) return false;
        if (cond.field === "house") return moon.house === cond.equals;
      }
      return false;
    });
  }

  function collectSentences(files, matchFn) {
    var sentences = [];
    var matchedIds = [];
    var seen = {};
    files.forEach(function (file) {
      (file.records || []).forEach(function (rec) {
        if (matchFn(rec)) {
          var id = rec.recordId || rec.modelId || rec.coverageItem;
          if (seen[id]) return;
          seen[id] = true;
          matchedIds.push(id);
          (rec.applicationClaims || []).forEach(function (c) {
            if (c.allowedMeaning) sentences.push(c.allowedMeaning);
          });
        }
      });
    });
    return { sentences: sentences, matchedIds: matchedIds };
  }

  /* S2C: Section 2's records, matched and ordered as collectSentences matches and orders them, then the two S2C rules.
     Each unit is a list of claim sentences that goes into one paragraph. */
  function collectS2C(files, matchFn) {
    var recs = [], seen = {};
    files.forEach(function (file) {
      (file.records || []).forEach(function (rec) {
        if (!matchFn(rec)) return;
        var id = rec.recordId || rec.modelId || rec.coverageItem;
        if (seen[id]) return;
        seen[id] = true;
        recs.push(rec);
      });
    });
    /* rule 1: claimConditions, checked against the claims used in this Section 2 */
    var used = {}, cond = {};
    recs.forEach(function (rec) {
      (rec.applicationClaims || []).forEach(function (c) { if (c.allowedMeaning && c.claimId) used[c.claimId] = true; });
      (rec.claimConditions || []).forEach(function (c) { if (c && c.claimId) cond[c.claimId] = c; });
    });
    var changed = true;
    while (changed) {
      changed = false;
      Object.keys(used).forEach(function (id) {
        var c = cond[id]; if (!c) return;
        var ok = (!c.requires || c.requires.every(function (x) { return used[x]; })) &&
                 (!c.requiresAny || c.requiresAny.some(function (x) { return used[x]; }));
        if (!ok) { delete used[id]; changed = true; }
      });
    }
    /* rule 2: a record's presentTogether claims form one unit, at the place of the first of them */
    var units = [], matchedIds = [];
    recs.forEach(function (rec) {
      matchedIds.push(rec.recordId || rec.modelId || rec.coverageItem);
      var together = Array.isArray(rec.presentTogether) ? rec.presentTogether : [], group = null;
      (rec.applicationClaims || []).forEach(function (c) {
        if (!c.allowedMeaning) return;
        if (c.claimId && !used[c.claimId]) return;          /* its claimConditions failed */
        if (c.claimId && together.indexOf(c.claimId) >= 0) {
          if (!group) { group = []; units.push(group); }
          group.push(c.allowedMeaning);
          return;
        }
        units.push([c.allowedMeaning]);
      });
    });
    return { units: units, matchedIds: matchedIds };
  }

  function toParagraphs(sentences, introSentences) {
    var all = (introSentences || []).concat(sentences);
    if (!all.length) return [];
    if (all.length <= 4) return [all.join(" ")];
    var mid = Math.ceil(all.length / 2);
    return [all.slice(0, mid).join(" "), all.slice(mid).join(" ")];
  }

  /* ---------- Section 2 ---------- */
  function computeS2Match(chart, files) {
    var moon = findPlanet(chart, "Moon");
    var moonSign = signName(moon.signNumber);
    var keySet = [
      "graha-in-sign.mo." + moonSign,
      "graha-in-house.mo." + moon.house,
      "nakshatra." + nakKey(moon.nakshatra),
      "pada." + nakKey(moon.nakshatra) + "." + moon.pada
    ];
    var matched = (s2cOn ? collectS2C : collectSentences)(files, function (rec) {
      return recordMatchesKeys(rec, keySet) || recordMatchesSelector(rec, chart);
    });
    return {
      sentences: matched.sentences,
      units: matched.units,                                  /* S2C only */
      matchedIds: matched.matchedIds,
      moon: moon, moonSign: moonSign
    };
  }

  /* ---------- Public API ---------- */
  /* SR1 bridge: the alias applies to this draft only when the page passes { sr1: true } */
  function generateDevReview(chart, claimData, snippets36, firstName, opts) {
    var was = aliasOn, wasS2c = s2cOn, wasSw1 = sw1On; aliasOn = !!(opts && opts.sr1); s2cOn = !!(opts && opts.s2c);   /* S2C: { s2c: true } */
    sw1On = !!(opts && opts.sw1);   /* SW1: { sw1: true } */
    try { return draftReview(chart, claimData, snippets36, firstName); } finally { aliasOn = was; s2cOn = wasS2c; sw1On = wasSw1; }
  }
  function draftReview(chart, claimData, snippets36, firstName) {
    var s1 = computeS1Keys(chart);
    var s1Match = collectSentences(claimData.section1Files, function (rec) { return recordMatchesKeys(rec, s1.keys); });

    var openingName = (firstName && String(firstName).trim()) ? String(firstName).trim() + ", " : "";
    var introS1 = [openingName + "your Vedic chart begins with " + capitalize(s1.ascSign) + " rising."];
    if (sw1On) {   /* SW1: the Oct 14 opening, the same for every chart apart from the sign and its ruler */
      introS1.push("Vedic astrology is the traditional astrology of India.",
                   "Your rising sign is the sign that was coming up over the eastern horizon when you were born.",
                   "It sets the starting point for the whole chart.",
                   "Each sign is linked to one planet, its ruler.");
      if (s1.ascLordCode) introS1.push(capitalize(sw1Lord(s1.ascLordCode)) + " rules " + capitalize(s1.ascSign) + ", so " + sw1Lord(s1.ascLordCode) + " is your guiding planet: a central influence in this reading.");
      introS1.push("In this reading, a planet's influence means the kind of energy it brings.",
                   "A Vedic chart also divides life into twelve areas, such as home, work and partnership, and a planet's area shows where its energy tends to show up.");
    }
    else if (s1.ascLordCode) introS1.push(capitalize(CODE_TO_NAME[s1.ascLordCode]) + " rules " + capitalize(s1.ascSign) + ", which makes it your guiding planet -- the strongest single influence on how you move through the world.");

    var s2 = computeS2Match(chart, claimData.section2Files);
    var introS2 = [
      "In Vedic astrology, every planet in your chart sits inside one of 27 star groups called nakshatras. This reading focuses mainly on your Moon's nakshatra, because the Moon shapes your emotional world most directly.",
      "Your Moon is in " + capitalize(s2.moonSign) + ", and its nakshatra is " + capitalize(s2.moon.nakshatra) + "."
    ];
    if (sw1On) introS2 = [   /* SW1: the Oct 14 opening; the Moon's nakshatra is named here and nowhere else */
      "As the Moon travels around the sky each month, it passes through 27 divisions of the zodiac, called nakshatras.",
      "Each division covers a smaller slice of the sky than a sign and has its own character.",
      "Every planet in your chart is in one of them.",
      "This reading focuses mainly on your Moon's nakshatra, because the Moon shapes your emotional world most directly.",
      "In Vedic astrology, the Moon stands for the mind and feelings.",
      "Your Moon is in " + capitalize(s2.moonSign) + ", in the nakshatra called " + capitalize(s2.moon.nakshatra) + "."
    ];

    var asc = s1.asc;
    var moon = s2.moon;
    var identityKey = [signName(asc.signNumber), signName(moon.signNumber), nakKey(moon.nakshatra)].join("|");
    var entry = null;
    (snippets36.entries || []).forEach(function (e) { if (e.identityKey === identityKey) entry = e; });

    /* Voice contract: the Moon's nakshatra is named exactly once, in the Section 2
       intro. Any later mention of that name, and the word "pada", are removed from
       the claim prose. A claim sentence that only defines the nakshatra is dropped. */
    var nakName = String(s2.moon.nakshatra || "");
    var s2Keep = function (t) {
      return !/is the Moon's nakshatra, one of the smaller lunar sections/i.test(t);
    };
    var s2Voice = function (t) {
      [nakName].concat((aliasOn && NAK_NAME_ALIAS[nakName]) || []).forEach(function (nm) {
        if (!nm) return;
        t = t.replace(new RegExp("\\b" + nm + "'s\\b", "g"), "this nakshatra's");
        t = t.replace(new RegExp("\\b" + nm + "\\b", "g"), "this nakshatra");
      });
      /* the claim records say "This pada may give/direct/carry ..."; "pada" is a
         forbidden term and "this part of it" reads like a template, so the
         sentence is rewritten to read as plain prose. */
      t = t.replace(/\b(?:This|The)\s+pada\s+may\s+/g, "More precisely, your Moon's placement may ");
      t = t.replace(/\b(?:this|the)\s+pada\s+may\s+/g, "your Moon's placement may ");
      t = t.replace(/\b(?:This|The)\s+pada\b/g, "This placement").replace(/\b(?:this|the)\s+pada\b/g, "this placement");
      return t;
    };
    /* S2C: a unit's sentences are kept and voiced one by one, as above, then joined, so the unit stays in one paragraph */
    var s2Sentences = s2.units ? s2.units.map(function (u) { return u.filter(s2Keep).map(s2Voice); })
                                         .filter(function (u) { return u.length; }).map(function (u) { return u.join(" "); })
                               : s2.sentences.filter(s2Keep).map(s2Voice);

    var reading = sw1On ? {   /* SW1: each opening is its own paragraph, the claims follow as before, SW1_FIX applied */
      "essential-nature": [introS1.join(" ")].concat(toParagraphs(s1Match.sentences.map(sw1Fix), [])),
      "mind-intuition": [introS2.join(" ")].concat(toParagraphs(s2Sentences.map(sw1Fix), []))
    } : {
      "essential-nature": toParagraphs(s1Match.sentences, introS1),
      "mind-intuition": toParagraphs(s2Sentences, introS2)
    };

    var placeholderNote = function (label, fact) {
      return ["Draft not yet available for this specific chart -- Sections 3 through 6 interpretation content is still being built out beyond the two charts already reviewed. Calculated fact for " + label + ": " + fact + "."];
    };

    var venus = findPlanet(chart, "Venus");
    var tenthLord = null; // not computed client-side yet; kept honest rather than guessed
    var rahu = findPlanet(chart, "Rahu");
    var ketu = findPlanet(chart, "Ketu");

    if (entry) {
      reading["relationships-karmic"] = entry.sections["relationships-karmic"];
      reading["dharma-direction"] = entry.sections["dharma-direction"];
      reading["rahu-ketu"] = entry.sections["rahu-ketu"];
      reading["essential-takeaway"] = entry.sections["essential-takeaway"];
    } else {
      reading["relationships-karmic"] = placeholderNote("Venus", "Venus in " + capitalize(signName(venus.signNumber)) + ", house " + venus.house);
      reading["dharma-direction"] = placeholderNote("the 10th house", "10th house occupied by " + houseOccupants(chart, 10));
      reading["rahu-ketu"] = placeholderNote("Rahu and Ketu", "Rahu in house " + rahu.house + ", Ketu in house " + ketu.house);
      reading["essential-takeaway"] = ["This synthesis is not yet available in the development-review draft for charts outside the two reviewed reference readings."];
    }

    var out = {
      reading: reading,
      meta: {
        mode: "development-review-draft",
        productionVerified: false,
        matchedClaimIds: { section1: s1Match.matchedIds, section2: s2.matchedIds },
        sections3to6Source: entry ? entry.label : "no identity match -- placeholder shown",
        sections3to6Unverified: !!(entry && entry.unverified),
        identityKey: identityKey
      }
    };
    if (sw1On) out.meta.sw1 = true;   /* SW1: marks Sections 1-2 assembled with the SW1 wording (absent otherwise) */
    return out;
  }

  function houseOccupants(chart, houseNum) {
    var names = chart.planets.filter(function (p) { return p.name !== "Ascendant" && p.house === houseNum; }).map(function (p) { return p.name; });
    return names.length ? names.join(", ") : "no classical grahas";
  }
  function capitalize(s) { return String(s || "").replace(/(^|-)([a-z])/g, function (_, sep, c) { return (sep === "-" ? " " : "") + c.toUpperCase(); }); }

  /* Ascendant-only mode (Sep 18): the SAME Section 1 selection generateDevReview
     uses (computeS1Keys + collectSentences over the Section 1 claim files),
     exposed so the Compare Ascendant reading can take its evidence from it.
     Additive only; generateDevReview is unchanged. */
  function selectAscendantEvidence(chart, section1Files) {
    var s1 = computeS1Keys(chart);
    var m = collectSentences(section1Files, function (rec) { return recordMatchesKeys(rec, s1.keys); });
    var lord = s1.ascLordPlanet;
    return {
      keys: s1.keys,
      ascSign: s1.ascSign,
      ascNakshatra: s1.asc && s1.asc.nakshatra || null,
      guidingPlanet: s1.ascLordCode ? CODE_TO_NAME[s1.ascLordCode] : null,
      guidingPlanetSign: lord ? signName(lord.signNumber) : null,
      guidingPlanetHouse: lord ? lord.house : null,
      matchedClaimIds: m.matchedIds,
      claimSentences: m.sentences
    };
  }

  /* Compare evidence (Sep 19): the SAME Section 1 and Section 2 record matching
     generateDevReview uses, returned as whole records (with their status, eligibility
     and source IDs) so the Compare evidence manifest can cite them. Additive only. */
  function selectRecords(chart, claimData) {
    var s1 = computeS1Keys(chart);
    var moon = findPlanet(chart, "Moon"), moonSign = signName(moon.signNumber);
    var s2Keys = ["graha-in-sign.mo." + moonSign, "graha-in-house.mo." + moon.house,
                  "nakshatra." + nakKey(moon.nakshatra), "pada." + nakKey(moon.nakshatra) + "." + moon.pada];
    function pick(files, fn) {
      var out = [], seen = {};
      (files || []).forEach(function (file, fi) {
        (file.records || []).forEach(function (rec) {
          if (!fn(rec)) return;
          var id = rec.recordId || rec.modelId || rec.coverageItem;
          if (seen[id]) return; seen[id] = true;
          out.push({ record: rec, fileIndex: fi });
        });
      });
      return out;
    }
    return {
      section1Keys: s1.keys, section2Keys: s2Keys,
      section1: pick(claimData.section1Files, function (rec) { return recordMatchesKeys(rec, s1.keys); }),
      section2: pick(claimData.section2Files, function (rec) { return recordMatchesKeys(rec, s2Keys) || recordMatchesSelector(rec, chart); })
    };
  }

  global.CozDevReview = { generateDevReview: generateDevReview, selectAscendantEvidence: selectAscendantEvidence, selectRecords: selectRecords,
                          s2c: true,     /* S2C: this engine understands { s2c: true }; a page asks only an engine that says so */
                          sw1: true };   /* SW1: the same, for { sw1: true } */
})(typeof window !== "undefined" ? window : globalThis);
