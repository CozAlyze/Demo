/* ============================================================
   COZALYZE · COMPARE · CURRENT TIMING · CT3.1 · shared engine
   Used by compare-current-timing.html and compare-current-timing-reading.html.

   DATA. Both charts come ONLY from the validated chart-run pair
   (COZ_ASC.ensurePair in ascendant-library.js): same runId, same birth
   fingerprint, missing system calculated silently. No fallback to an
   older chart, ever.
     Vedic   = cozChartJSON.lifeCycle (synodic_354_fixed engine, not
               recalculated here). The current Antardasha is re-picked
               from antardashaSequence by today's date, so an export
               made weeks ago still shows the right season.
     Tropical = natal positions from cozTropicalChartJSON, transits for
               this moment from astronomy-engine@2.1.19, the same call
               the tropical engine uses (GeoVector + Ecliptic, of date).

   TRANSIT SELECTION (his Sep 21 ruling: what is affecting them now,
   mostly fast movers, slow planets only touched on). Every rule lives in
   TRANSIT_POLICY below. Only aspects already inside the policy orb are
   shown; an empty slot stays empty. Nothing is announced ahead
   (announcementWindowDays is 0: no advance announcement).

   PROSE (CT3.0). Layered banks below: Vedic Mahadasha core, Antardasha
   modifier, period-lord interaction, house meanings (REVIEW-PENDING, practitioner review);
   separate Tropical transit meanings by planet, aspect, natal point and
   status (DEVELOPMENT-ONLY, Western review); shared tags for Where They
   Meet (an overlap needs a shared tag, never a loose resemblance).
   Transit windows are solved from real motion (entry, exact passes,
   exit). Graha drishti is a deterministic shared calculation.
   Descriptive register, no em dashes.
   ============================================================ */
(function (global) {
  'use strict';

  var ENGINE = 'compare-current-timing 3.1';
  var FAIL = 'We couldn\u2019t load your timing for this chart. Please return and run your chart again.';

  /* ============================================================
     TRANSIT POLICY: the ONE place every transit rule lives.
     Jason's ruling, Sep 21 2026 (conservative starting policy).
     Nothing elsewhere in the code chooses an orb.
     ============================================================ */
  var TRANSIT_POLICY = {
    version: 'transit-policy 1.0 (Jason, 2026-09-21)',
    approved: true,
    aspects: [
      { type: 'conjunction', angle: 0,   orb: 3 },
      { type: 'opposition',  angle: 180, orb: 3 },
      { type: 'square',      angle: 90,  orb: 3 },
      { type: 'trine',       angle: 120, orb: 3 },
      { type: 'sextile',     angle: 60,  orb: 2 }
    ],
    /* contacts to these natal points are capped at this orb, whatever the aspect */
    pointOrbCap: { 'Ascendant': 2, 'Midheaven': 2, 'North Node': 2, 'South Node': 2 },
    fastPlanets: ['Sun', 'Mercury', 'Venus', 'Mars'],  /* transiting Moon excluded by ruling */
    slowPlanets: ['Jupiter', 'Saturn'],                /* touched on only */
    moonIncluded: false,
    nodeType: 'Mean',                                  /* retained for consistency with both engines */
    slots: { fast: 2, slow: 1 },
    priority: ['only contacts already within orb', 'smallest orb first', 'fast planets fill the fast slots, slow planets the slow slot'],
    natalTargets: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
                   'North Node', 'South Node', 'Ascendant', 'Midheaven'],
    announcementWindowDays: 0,                         /* none: only contacts already within orb are shown */
    exactThresholdDegrees: 0.1                         /* at or under this orb the status reads Exact */
  };
  var FAST = TRANSIT_POLICY.fastPlanets, SLOW = TRANSIT_POLICY.slowPlanets, ASPECTS = TRANSIT_POLICY.aspects;
  function allowedOrb(aspect, target) {
    var cap = TRANSIT_POLICY.pointOrbCap[target];
    return cap == null ? aspect.orb : Math.min(aspect.orb, cap);
  }
  var NATAL_NAME = { sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
    jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
    northNode: 'North Node', southNode: 'South Node' };
  var NODE_LORD = { 'North Node': 'Rahu', 'South Node': 'Ketu' };
  var TGLYPH = { Sun: '\u2609', Moon: '\u263D', Mercury: '\u263F', Venus: '\u2640', Mars: '\u2642',
    Jupiter: '\u2643', Saturn: '\u2644' };

  /* ---------------- math ---------------- */
  function norm(x) { x %= 360; return x < 0 ? x + 360 : x; }
  function sep(a, b) { var d = Math.abs(norm(a) - norm(b)); return d > 180 ? 360 - d : d; }
  function tLon(body, date) {
    return norm(Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon);
  }

  function natalTargets(t) {
    var out = [];
    (t.bodies || []).forEach(function (b) {
      var n = NATAL_NAME[b.id];
      if (n && TRANSIT_POLICY.natalTargets.indexOf(n) >= 0 && b.position && isFinite(b.position.longitude)) {
        out.push({ name: n, lon: b.position.longitude,
                   /* the exported natal house is the source of truth; houseOf() only for older exports */
                   house: b.house >= 1 && b.house <= 12 ? b.house : houseOf(b.position.longitude, t).house });
      }
    });
    var an = t.angles || {};
    if (an.ascendant && isFinite(an.ascendant.longitude)) out.push({ name: 'Ascendant', lon: an.ascendant.longitude });
    if (an.midheaven && isFinite(an.midheaven.longitude)) out.push({ name: 'Midheaven', lon: an.midheaven.longitude });
    /* angles are house cusps themselves: they carry no house claim (house stays undefined) */
    return out;
  }

  function houseOf(lon, t) {
    var c = t.houseCusps;
    if (c && c.length === 12) {
      for (var i = 0; i < 12; i++) {
        var a = c[i].position.longitude, b = c[(i + 1) % 12].position.longitude;
        if (norm(lon - a) < norm(b - a)) return { house: i + 1, system: 'Placidus' };
      }
    }
    var asc = t.angles && t.angles.ascendant;
    if (!asc) return { house: null, system: null };
    var s = Math.floor(norm(asc.longitude) / 30);
    return { house: ((Math.floor(norm(lon) / 30) - s + 12) % 12) + 1, system: 'Whole Sign' };
  }

  /* The tightest contact this planet makes that is INSIDE its policy orb, or
     null. nearest is kept for the developer log only, never shown. */
  function bestHit(body, now, targets, t) {
    var lon = tLon(body, now), lon2 = tLon(body, new Date(now.getTime() + 86400000)), best = null, nearest = null;
    targets.forEach(function (n) {
      ASPECTS.forEach(function (a) {
        var d = Math.abs(sep(lon, n.lon) - a.angle);
        var d2 = Math.abs(sep(lon2, n.lon) - a.angle);
        var c = { planet: body, lon: lon, target: n.name, targetHouse: n.house, aspect: a.type, orb: d, allowed: allowedOrb(a, n.name), applying: d2 < d };
        if (!nearest || d < nearest.orb) nearest = c;
        if (d <= c.allowed && (!best || d < best.orb)) best = c;
      });
    });
    var h = houseOf(lon, t);
    (best || nearest).house = h.house; (best || nearest).houseSystem = h.system;
    return { planet: body, hit: best, nearest: nearest };
  }

  /* ---------------- Vedic periods ---------------- */
  function currentPeriods(lc, now) {
    var ms = now.getTime(), md = lc.mahadasha, ad = lc.antardasha, seq = lc.antardashaSequence || [], at = -1;
    if (!md || !md.lord || !ad || !ad.lord) return { ok: false, reason: 'no current Mahadasha or Antardasha in lifeCycle' };
    if (!(Date.parse(md.startTimestamp) <= ms && ms < Date.parse(md.endTimestamp))) return { ok: false, reason: 'today is outside the saved Mahadasha' };
    for (var i = 0; i < seq.length; i++) {
      if (Date.parse(seq[i].startTimestamp) <= ms && ms < Date.parse(seq[i].endTimestamp)) { ad = seq[i]; at = i; break; }
    }
    if (at < 0) return { ok: false, reason: 'today falls outside the exported Antardasha sequence' };   /* fail safe, never guess */
    var next = (at >= 0 && at + 1 < seq.length) ? seq[at + 1] : (lc.nextAntardasha || null);
    return { ok: true, md: md, ad: ad, next: next };
  }

  /* ============================================================
     CT3.0 LAYERS. Kept separate in data so the composer only joins
     pieces the calculated chart supports (Jason + review, Sep 21 2026).
     STATUS: Vedic layers are REVIEW-PENDING (practitioner review). Tropical layers are
     DEVELOPMENT-ONLY (separate Western review). Drishti calculation is
     tested; its interpretation sentence is draft.
     ============================================================ */
  var BANK_STATUS = {
    vedic: 'review-pending (practitioner review)',
    tropical: 'development-only (Western review)',
    drishtiCalc: 'tested (whole-sign, classical rules)',
    drishtiText: 'draft (practitioner review)'
  };

  /* ---------- shared Vedic calculation: graha drishti ----------
     Deterministic, whole-sign. Every graha aspects the 7th from itself;
     Mars adds 4th and 8th, Jupiter 5th and 9th, Saturn 3rd and 10th.
     Rahu and Ketu get no aspects without a separate approved ruling. */
  var DRISHTI = {
    version: 'graha-drishti 1.0 (whole sign, classical)',
    method: 'whole-sign, counted from the verified house of the graha',
    rules: { Sun: [7], Moon: [7], Mercury: [7], Venus: [7], Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10] }
  };
  function houseFrom(h, n) { return ((h - 1 + n - 1) % 12) + 1; }
  function computeDrishti(planets) {
    var out = [], placed = {};
    (planets || []).forEach(function (p) { if (p && p.name !== 'Ascendant' && p.house >= 1 && p.house <= 12) placed[p.name] = p.house; });
    Object.keys(DRISHTI.rules).forEach(function (g) {
      if (!placed[g]) return;
      DRISHTI.rules[g].forEach(function (n) {
        var dest = houseFrom(placed[g], n);
        out.push({ graha: g, sourceHouse: placed[g], aspect: n, destHouse: dest,
                   occupants: Object.keys(placed).filter(function (k) { return k !== g && placed[k] === dest; }),
                   method: DRISHTI.method, version: DRISHTI.version });
      });
    });
    return out;
  }

  /* ---------- layer 1: Mahadasha core (Vedic, review-pending) ---------- */
  var MD_CORE = {
    Sun: "In Jyotish, the Sun governs identity, authority, vitality and the father. It also rules your sense of purpose and how clearly you are seen. A Sun chapter often brings attention to who you are becoming and where you want to stand in your own life. You may notice more interest in responsibility and leadership, and less patience for living in someone else's shadow.",
    Moon: "In Jyotish, the Moon governs the mind, feelings, home, mother and your need to feel safe. A Moon chapter often brings attention to emotional life, family and the people and places that feel like home. You may notice that your inner state shapes your choices more than usual, and that care, both given and received, becomes a larger part of daily life.",
    Mars: "In Jyotish, Mars governs energy, courage, drive and the will to act. It also governs property, siblings and the instinct to protect what matters. A Mars chapter often brings more attention to what you want to accomplish and how directly you go after it. You may notice less patience for waiting and a stronger pull toward decisions.",
    Mercury: "In Jyotish, Mercury governs thinking, speech, learning, trade and practical skill. A Mercury chapter often brings attention to what you know, how you communicate and how you earn through your abilities. You may notice more interest in study, writing, business or organizing the details of your life.",
    Jupiter: "In Jyotish, Jupiter governs wisdom, faith, teaching and growth. It also governs children, guidance and the teachers in your life. A Jupiter chapter often brings attention to what you believe, what you are learning and what gives your life a sense of direction.",
    Venus: "In Jyotish, Venus governs love, beauty, comfort, pleasure and refinement. It also governs partnership, the arts and the things you value. A Venus chapter often brings attention to relationships, creativity and the quality of your daily life. You may notice more interest in what feels good, what feels fair and what makes life feel graceful.",
    Saturn: "In Jyotish, Saturn governs time, discipline, responsibility and patience. It governs work that builds slowly, commitments that last and lessons learned through experience. A Saturn chapter often brings attention to what is truly sustainable in your life, and to where more structure is needed.",
    Rahu: "In Jyotish, Rahu (North Node) is the ascending point where the Moon's orbit crosses the ecliptic, the apparent path of the Sun. It governs ambition, the unfamiliar and a hunger to reach beyond what you have known. A Rahu chapter often brings attention to new territory, whether that means new places, new people or new goals. You may notice strong desire alongside some restlessness.",
    Ketu: "In Jyotish, Ketu (South Node) is the descending point where the Moon's orbit crosses the ecliptic, opposite Rahu. It governs detachment, inner knowing and the abilities you already carry. A Ketu chapter often brings attention to what can be simplified or released. You may notice less interest in outer goals that once mattered and more interest in what feels true on the inside."
  };

  /* ---------- layer 2: Antardasha modifier (Vedic, review-pending) ---------- */
  var AD_CORE = {
    Sun: "The Sun governs identity, authority and vitality.",
    Moon: "The Moon governs the mind, feelings, home, mother and your need to feel safe.",
    Mars: "Mars governs energy, courage and decisive action.",
    Mercury: "Mercury governs thinking, speech, learning, trade and practical skill.",
    Jupiter: "Jupiter governs wisdom, faith, teaching and growth.",
    Venus: "Venus governs love, beauty, comfort, pleasure and refinement.",
    Saturn: "Saturn governs responsibility, patience, discipline and long work.",
    Rahu: "Rahu (North Node) governs ambition and the pull toward the unfamiliar.",
    Ketu: "Ketu (South Node) governs detachment, simplification and inner knowing."
  };
  var AD_FOCUS = {
    Sun: "visibility, responsibility and self-definition", Moon: "feelings, home and what you care for",
    Mars: "action, effort and standing up for what matters", Mercury: "learning, conversation and practical planning",
    Jupiter: "guidance, study and a search for meaning", Venus: "relationships, comfort and what you value",
    Saturn: "commitment, structure and patient effort", Rahu: "new goals and unfamiliar experiences",
    Ketu: "letting go, simplifying and turning inward"
  };
  var AD_NOTICE = {
    Sun: "You may notice a stronger wish to be seen for who you are.",
    Moon: "You may notice your moods and needs asking for more attention.",
    Mars: "You may notice more energy, and less patience with delay.",
    Mercury: "You may notice your mind working faster, with more plans and more to say.",
    Jupiter: "You may notice a pull toward teachers, study or a larger view of your life.",
    Venus: "You may notice more interest in beauty, comfort and the people you feel close to.",
    Saturn: "You may notice more responsibility and a need to pace yourself.",
    Rahu: "You may notice a restless wish for something new.",
    Ketu: "You may notice less interest in things that once felt important."
  };
  var AD_OPTION = {
    Sun: "set aside time for a personal goal, or to speak up in places where staying quiet has become a habit",
    Moon: "keep a simple record of moods, or to give more time to the places and people that feel like home",
    Mars: "put strong energy into physical activity, or to give a heated conversation a day before replying",
    Mercury: "write things down before saying them, or to give a hard conversation a day before replying",
    Jupiter: "take a class, read more widely or talk with a trusted teacher or mentor",
    Venus: "make a living space more beautiful, or to spend unhurried time with close friends",
    Saturn: "break a large responsibility into small, steady steps, or to protect time for rest",
    Rahu: "try one new thing at a time, or to check whether a new goal still fits after the first rush of interest",
    Ketu: "clear out what is no longer needed, or to make more space for quiet time"
  };

  /* ---------- layer 3: Mahadasha and Antardasha interaction (Vedic, review-pending) ---------- */
  var MD_MODE = {
    Sun: "responsibility and a wish to be seen clearly", Moon: "feeling and a need for security",
    Mars: "direct action", Mercury: "thought and careful planning", Jupiter: "learning and a search for meaning",
    Venus: "relationship and a wish for harmony", Saturn: "patience and steady effort",
    Rahu: "ambition and a reach toward the unfamiliar", Ketu: "simplifying and turning inward"
  };
  /* k = house of the Antardasha lord counted from the Mahadasha lord (1..12) */
  function pairClass(k) {
    if (k === 1) return 'same';
    if (k === 7) return 'opposite';
    if (k === 6 || k === 8) return 'sixEight';
    if (k === 2 || k === 12) return 'twoTwelve';
    if (k === 5 || k === 9) return 'fiveNine';
    return null;                       /* 3/11 and 4/10: no claim unless drishti supports one */
  }
  var PAIR_TEXT = {
    same: "With both planets in one house, their themes are joined rather than spread across different areas. You may notice this part of your life carrying more of the weight of this time than usual.",
    opposite: "These two placements face each other across the chart. What the chapter asks for and what this sub-period asks for can feel like two sides of one question. You may notice a need to balance {MDH} with {ADH}.",
    sixEight: "These two placements sit in a 6 and 8 relationship to each other, so they don't cooperate easily. What the longer chapter asks of you and what this sub-period asks of you may pull in different directions. Giving each one its own attention can make this period feel less divided.",
    twoTwelve: "These two placements sit next to each other in the chart, in a 2 and 12 relationship. Their themes can feel related but out of step, as if one is gathering while the other is letting go. You may notice this as a need to decide what to hold onto.",
    fiveNine: "These two placements sit in a 5 and 9 relationship, one of the more supportive connections between houses. The themes of the chapter and the sub-period can reinforce each other, so effort in one area may help the other."
  };

  /* ---------- layer 4: house meanings for Vedic placements (review-pending) ---------- */
  var HOUSE_NAME = {
    1: "self, body and the way you meet the world", 2: "resources, family, speech and what you value",
    3: "effort, courage, siblings and communication", 4: "home, mother, emotional peace and property",
    5: "creativity, children, learning and what you enjoy", 6: "work, service, daily routines and obstacles",
    7: "partnership, marriage, agreements and dealing with the public", 8: "shared resources, change, research and what is hidden",
    9: "higher learning, teachers, belief and long journeys", 10: "work, reputation and your role in the world",
    11: "gains, friendships, community and long-range hopes", 12: "rest, release, the inner life and faraway places"
  };
  var HOUSE_THROUGH = {
    1: "your health, your appearance and how you present yourself", 2: "money, family life and the way you speak",
    3: "conversations, writing, siblings, short trips or learning a skill", 4: "home, family roots and your inner sense of peace",
    5: "creative work, children, study or what brings you joy", 6: "daily work, routines, health habits and solving problems",
    7: "close partnerships, agreements and one-to-one relationships", 8: "shared money, deep change, research or private matters",
    9: "study, teaching, travel or questions of belief", 10: "career effort, responsibility and visible action",
    11: "friendships, groups, income and the goals you are working toward", 12: "rest, solitude, spiritual practice, travel abroad or letting go"
  };
  var HOUSE_SHORT = {
    1: "sense of self", 2: "resources", 3: "communication", 4: "home life", 5: "creative life", 6: "daily work",
    7: "partnerships", 8: "private matters", 9: "beliefs", 10: "career", 11: "goals and friendships", 12: "inner life"
  };

  /* ---------- layers 5-8: Tropical transits (DEVELOPMENT-ONLY) ---------- */
  var T_PLANET = {
    Sun: "identity, vitality and where you want to shine", Mercury: "thinking, speaking and noticing",
    Venus: "affection, pleasure and what you value", Mars: "drive, heat and assertion",
    Jupiter: "growth, opportunity and meaning", Saturn: "structure, responsibility and the test of time"
  };
  var T_POINT = {
    Sun: "your core identity, vitality and will", Moon: "your emotional needs, habits and sense of home",
    Mercury: "the way you think, learn and communicate", Venus: "how you love, what you value and what gives you pleasure",
    Mars: "your drive, courage and the way you assert yourself", Jupiter: "your sense of meaning, faith and where you grow",
    Saturn: "your sense of duty, your limits and what you build over time", Uranus: "your need for freedom and change",
    Neptune: "your imagination, ideals and sensitivity", Pluto: "your deepest drives and your capacity for renewal",
    'North Node': "the direction of growth your chart points toward", 'South Node': "the habits and strengths that come most easily to you",
    Ascendant: "how you meet the world and how others first experience you", Midheaven: "your public role, career direction and reputation"
  };
  var T_POINT_SHORT = {
    Sun: "your sense of self", Moon: "your emotional life and home", Mercury: "your thinking and communication",
    Venus: "your relationships and what you value", Mars: "your drive and energy", Jupiter: "your beliefs and sense of possibility",
    Saturn: "your responsibilities and long-term commitments", Uranus: "your need for freedom", Neptune: "your imagination and ideals",
    Pluto: "your deeper motivations", 'North Node': "your direction of growth", 'South Node': "your familiar habits",
    Ascendant: "how you come across to others", Midheaven: "your work and public direction"
  };
  var T_ASPECT = {
    conjunction: "A conjunction joins the two directly.",
    opposition: "An opposition brings awareness through other people and asks for balance.",
    square: "A square creates friction that asks for action or adjustment.",
    trine: "A trine is a flowing contact, so the two support each other easily.",
    sextile: "A sextile is an opening that tends to respond to effort."
  };
  function group(aspect) { return aspect === 'conjunction' ? 'join' : (aspect === 'trine' || aspect === 'sextile') ? 'easy' : 'hard'; }
  var T_EFFECT = {
    Sun: { easy: "confidence and clarity", hard: "pressure to assert who you are", join: "attention and self-awareness" },
    Mercury: { easy: "clear thinking and easy conversation", hard: "mental restlessness or crossed wires in conversation", join: "thoughts, messages and ideas" },
    Venus: { easy: "comfort, affection and emotional receptivity", hard: "tension between what you want and what feels balanced", join: "warmth, affection and a wish for ease" },
    Mars: { easy: "energy and a willingness to act", hard: "impatience, heat and a push to act", join: "energy, drive and urgency" },
    Jupiter: { easy: "openings, optimism and a sense of possibility", hard: "a pull to overdo, overpromise or reach too far", join: "growth, generosity and a wish to expand" },
    Saturn: { easy: "steadiness and a willingness to commit", hard: "pressure, limits and questions about what is lasting", join: "seriousness, responsibility and a need for structure" }
  };
  /* incoming influence: quality only. The life area comes from the target. */
  var T_QUALITY = {
    Sun: { easy: "a steadier sense of confidence", hard: "friction between what you want and what is expected of you", join: "more attention turned toward yourself" },
    Mercury: { easy: "clearer thinking and easier words", hard: "crossed wires or a restless mind", join: "more thinking and talking than usual" },
    Venus: { easy: "a softer, more receptive mood", hard: "unease about what feels fair or balanced", join: "more warmth and a wish for ease" },
    Mars: { easy: "more energy and readiness to act", hard: "impatience and a quicker temper", join: "a surge of drive and urgency" },
    Jupiter: { easy: "more optimism and a sense of room to grow", hard: "a pull to do too much at once", join: "a wish to grow and widen your horizons" },
    Saturn: { easy: "a readiness for steady effort", hard: "pressure and a sense of limits", join: "more seriousness and a need for structure" }
  };
  var TARGET_NOTICE = {
    Sun: "in how you see yourself and where you put your energy", Moon: "in your moods, your needs and how settled home feels",
    Mercury: "in conversations, decisions and how you take in information", Venus: "in your closest relationships and what you enjoy",
    Mars: "in how you act, compete and stand up for yourself", Jupiter: "in your beliefs, plans and sense of what is possible",
    Saturn: "in your responsibilities, commitments and long-term plans", Uranus: "in where you want more freedom or change",
    Neptune: "in your imagination, sensitivity and need for quiet", Pluto: "in deeper feelings and situations that ask for real change",
    'North Node': "in the direction you are trying to grow", 'South Node': "in old habits and familiar patterns",
    Ascendant: "in how you present yourself and meet new situations", Midheaven: "in your work, your public role and where you are heading"
  };
  var TARGET_OPTION = {
    Sun: { easy: "take a visible step toward something you care about", hard: "notice when a disagreement becomes about pride instead of the issue", join: "spend some time on what you want for yourself" },
    Moon: { easy: "make your space more comfortable or reach out to someone you feel close to", hard: "give strong feelings some time before acting on them", join: "check in with what you need and let it be known" },
    Mercury: { easy: "write, study or have a conversation you have been putting off", hard: "slow down, check details and ask before assuming", join: "look back on something you said recently, and whether it came across the way you meant it" },
    Venus: { easy: "spend unhurried time with people you enjoy", hard: "look honestly at where you are giving too much or asking too little", join: "make room for beauty, pleasure or a relationship that matters to you" },
    Mars: { easy: "put energy into a task that needs effort", hard: "give this energy somewhere useful, such as physical activity, before a disagreement becomes about winning", join: "channel the urgency into one clear action instead of many" },
    Jupiter: { easy: "make room for learning or a plan that has been waiting", hard: "check whether a new commitment is realistic before saying yes", join: "explore an idea or opportunity without rushing to commit" },
    Saturn: { easy: "commit to a plan that needs steady effort", hard: "look honestly at your commitments and consider what deserves more of your time", join: "set a structure or a limit that has been needed" },
    Uranus: { easy: "try one small change you have been curious about", hard: "notice when restlessness is pushing you to break something that still works", join: "give yourself room to do something differently" },
    Neptune: { easy: "make time for art, music or quiet reflection", hard: "check the facts before trusting a hopeful impression", join: "protect some quiet time and notice what your imagination is showing you" },
    Pluto: { easy: "look at a pattern you are ready to change", hard: "notice where a struggle for control is costing more than it gives", join: "let something that has run its course come to an end" },
    'North Node': { easy: "take a small step toward something new for you", hard: "notice where pressure to grow feels rushed", join: "pay attention to choices that point toward growth" },
    'South Node': { easy: "use a skill you already have in a new way", hard: "notice when an old habit is taking over", join: "notice which familiar patterns still serve you" },
    Ascendant: { easy: "introduce yourself to something or someone new", hard: "notice how you come across when you are under pressure", join: "pay attention to first impressions, yours and other people's" },
    Midheaven: { easy: "take a visible step at work or toward a goal", hard: "check whether a new demand on your time fits your direction", join: "look at where your work is heading and what you want next" }
  };
  var T_VERB = { conjunction: 'conjunct', opposition: 'opposite', square: 'square', trine: 'trine', sextile: 'sextile' };
  var T_PHRASE = { conjunction: 'joining', opposition: 'opposing', square: 'squaring', trine: 'making a trine to', sextile: 'making a sextile to' };

  /* ---------- layer 9: shared tags for Where They Meet ---------- */
  var TAGS = {
    communication: { label: "communication", weight: "what you say and how you say it", notice: "how often your feelings and thoughts show up in what you say" },
    home: { label: "home and emotional security", weight: "home life and what helps you feel safe", notice: "what helps you feel settled at home, and what doesn't" },
    partnership: { label: "partnership and commitment", weight: "your closest relationships and the commitments inside them", notice: "what your closest relationships are asking of you" },
    work: { label: "work and visibility", weight: "your work and how you are seen", notice: "how you feel about your work and the way you are seen" },
    learning: { label: "learning and belief", weight: "what you study and what you believe", notice: "what you are curious about and what you are starting to question" },
    resources: { label: "resources and values", weight: "money, possessions and what you value", notice: "how you spend, what you keep and what you truly value" },
    creativity: { label: "creativity", weight: "creative work and what brings you joy", notice: "what you want to make or enjoy for its own sake" },
    rest: { label: "rest and release", weight: "rest, solitude and what you are ready to let go of", notice: "how much rest you need, and what you are ready to set down" }
  };
  var HOUSE_TAGS = { 1: [], 2: ['resources'], 3: ['communication'], 4: ['home'], 5: ['creativity'], 6: ['work'],
                     7: ['partnership'], 8: ['resources'], 9: ['learning'], 10: ['work'], 11: [], 12: ['rest'] };
  /* Tropical (Western) house areas, development-only. The TRANSITING planet
     never sets a life area: overlap tags come only from the natal point that
     is contacted and the natal house that point occupies. */
  var TH_TAGS = { 1: [], 2: ['resources'], 3: ['communication'], 4: ['home'], 5: ['creativity'], 6: ['work'],
                  7: ['partnership'], 8: ['resources'], 9: ['learning'], 10: ['work'], 11: [], 12: ['rest'] };
  var TH_AREA = {
    1: "your body, appearance and personal direction", 2: "money, possessions and self-worth", 3: "communication, siblings and daily errands",
    4: "home, family and private life", 5: "creativity, romance, children and play", 6: "daily work, health routines and service",
    7: "partnerships and one-to-one relationships", 8: "shared resources, intimacy and deep change", 9: "travel, higher learning and belief",
    10: "career, reputation and public life", 11: "friends, groups and future goals", 12: "rest, solitude and what happens behind the scenes"
  };
  function transitTags(h) {
    var out = (TPOINT_TAGS[h.target] || []).slice();
    (TH_TAGS[h.targetHouse] || []).forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); });
    return out;
  }
  var TPOINT_TAGS = { Sun: [], Moon: ['home'], Mercury: ['communication'], Venus: ['partnership', 'resources'], Mars: [], Jupiter: ['learning'],
                      Saturn: ['work'], Uranus: [], Neptune: ['rest'], Pluto: [], 'North Node': [], 'South Node': [], Ascendant: [], Midheaven: ['work'] };

  /* ---------- transit timing, solved from the planet's actual motion ----------
     f(t) = distance from exactness. Entry and exit are where f crosses the
     allowed orb; exact passes are local minima of f at or under the policy's
     exactThresholdDegrees (the same tolerance that marks status Exact). */
  var DAY = 86400000;
  function distFromExact(body, target, angle, t) { return Math.abs(sep(tLon(body, new Date(t)), target) - angle); }
  function bisect(fn, a, b, lim) {            /* fn(a) <= lim < fn(b) or reverse; returns boundary time */
    var fa = fn(a) <= lim;
    for (var i = 0; i < 40 && Math.abs(b - a) > 60000; i++) { var m = (a + b) / 2; if ((fn(m) <= lim) === fa) a = m; else b = m; }
    return (a + b) / 2;
  }
  function goldenMin(fn, a, b) {
    var g = 0.381966, x1 = a + g * (b - a), x2 = b - g * (b - a), f1 = fn(x1), f2 = fn(x2);
    for (var i = 0; i < 60 && (b - a) > 60000; i++) {
      if (f1 < f2) { b = x2; x2 = x1; f2 = f1; x1 = a + g * (b - a); f1 = fn(x1); }
      else { a = x1; x1 = x2; f1 = f2; x2 = b - g * (b - a); f2 = fn(x2); }
    }
    var t = (a + b) / 2; return { t: t, f: fn(t) };
  }
  var TANGENT_TOL = 0.0005;        /* degrees (1.8 arcseconds): numerically zero at this engine's accuracy */
  function wrap180(x) { x = norm(x); return x > 180 ? x - 360 : x; }
  /* An exact pass is a real crossing: the signed difference
     wrap(transit - natal - offset) changes sign, for offset +angle or -angle
     (one offset for conjunction and opposition). A closest approach that
     turns back before reaching 0 is reported as a closest approach, never as
     exact. The 0.1 degree policy tolerance marks the current status Exact only. */
  function transitWindow(h, targetLon, angle, nowMs) {
    var fast = FAST.indexOf(h.planet) >= 0, step = fast ? DAY / 4 : DAY, maxSteps = fast ? 1600 : 1200, lim = h.allowed;
    var lonAt = function (t) { return tLon(h.planet, new Date(t)); };
    var fOf = function (l) { return Math.abs(sep(l, targetLon) - angle); };
    var fn = function (t) { return fOf(lonAt(t)); };
    var samples = [{ t: nowMs, l: lonAt(nowMs) }], t = nowMs, i, entry, exit, openStart = false, openEnd = false;
    for (i = 0; ; i++) { var tb = t - step, lb = lonAt(tb); if (fOf(lb) > lim) { entry = bisect(fn, t, tb, lim); break; } samples.unshift({ t: tb, l: lb }); t = tb; if (i >= maxSteps) { openStart = true; entry = t; break; } }
    t = nowMs;
    for (i = 0; ; i++) { var tf = t + step, lf = lonAt(tf); if (fOf(lf) > lim) { exit = bisect(fn, t, tf, lim); break; } samples.push({ t: tf, l: lf }); t = tf; if (i >= maxSteps) { openEnd = true; exit = t; break; } }
    samples.unshift({ t: entry, l: lonAt(entry) }); samples.push({ t: exit, l: lonAt(exit) });
    var offsets = (angle === 0 || angle === 180) ? [angle] : [angle, -angle], roots = [];
    offsets.forEach(function (o) {
      var sg = function (tt) { return wrap180(lonAt(tt) - targetLon - o); };
      for (var k = 1; k < samples.length; k++) {
        var a = wrap180(samples[k - 1].l - targetLon - o), b = wrap180(samples[k].l - targetLon - o);
        if (a === 0) { roots.push(samples[k - 1].t); continue; }
        if (a * b < 0 && Math.abs(a) < 90 && Math.abs(b) < 90) {
          var lo = samples[k - 1].t, hi = samples[k].t;
          for (var n = 0; n < 50 && hi - lo > 60000; n++) { var m = (lo + hi) / 2; if (sg(m) * a > 0) lo = m; else hi = m; }
          roots.push((lo + hi) / 2);
        }
      }
    });
    roots.sort(function (a, b) { return a - b; });
    roots = roots.filter(function (r, k) { return k === 0 || r - roots[k - 1] > 3600000; });
    var best = null;                                       /* deepest approach inside the window */
    for (i = 1; i < samples.length - 1; i++) {
      var fa = fOf(samples[i - 1].l), fb = fOf(samples[i].l), fc = fOf(samples[i + 1].l);
      if (fb <= fa && fb <= fc) { var g = goldenMin(fn, samples[i - 1].t, samples[i + 1].t); if (!best || g.f < best.f) best = g; }
    }
    /* tangential case: a station exactly on the aspect touches 0 without a sign change */
    if (best && best.f < TANGENT_TOL && !roots.some(function (r) { return Math.abs(r - best.t) < DAY; })) { roots.push(best.t); roots.sort(function (a, b) { return a - b; }); }
    return { entry: entry, exit: exit, openStart: openStart, openEnd: openEnd, passes: roots,
             closest: best, applying: fn(nowMs + 3600000) < fn(nowMs), orbNow: fn(nowMs) };
  }

  /* ---------------- word helpers ---------------- */
  function art(n) { return (n === 'Sun' || n === 'Moon') ? 'the ' + n : n; }
  function Art(n) { var a = art(n); return a.charAt(0).toUpperCase() + a.slice(1); }
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function natal(n) { return 'your natal ' + n; }
  function fmtDay(ms, now) {
    var d = new Date(ms), o = { month: 'long', day: 'numeric' };
    if (d.getFullYear() !== now.getFullYear()) o.year = 'numeric';
    return d.toLocaleDateString('en-US', o);
  }
  function listAnd(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function durWords(ms) {
    var d = ms / DAY;
    if (d < 1.5) return 'about a day';
    if (d < 14) return 'about ' + Math.round(d) + ' days';
    if (d < 60) return 'about ' + Math.round(d / 7) + ' weeks';
    return 'about ' + Math.round(d / 30.44) + ' months';
  }
  var NUMW = ['', 'once', 'twice', 'three times', 'four times', 'five times'];
  function dmin(x) { var m = Math.round(x * 60); return m < 60 ? m + (m === 1 ? ' minute' : ' minutes') + ' of arc' : (x.toFixed(1) + ' degrees'); }
  function heading(h) { return 'Transiting ' + h.planet + ' ' + T_VERB[h.aspect] + ' ' + natal(h.target); }
  function phrase(h) { return h.planet + ' ' + T_PHRASE[h.aspect] + ' ' + natal(h.target); }

  /* ---------------- composer ---------------- */
  function compose(G, d) {
    var MD = d.md.lord, AD = d.ad.lord, v = d.vedic, now = d.now, trace = [];
    function note(section, text, factors) { trace.push({ section: section, factors: factors, text: text.slice(0, 90) }); return text; }
    var mdP = G.planet(v, MD), adP = G.planet(v, AD);
    var mdH = mdP && mdP.house >= 1 && mdP.house <= 12 ? mdP.house : null;
    var adH = adP && adP.house >= 1 && adP.house <= 12 ? adP.house : null;
    var sameLord = MD === AD;
    var k = (mdH && adH) ? ((adH - mdH + 12) % 12) + 1 : null, pc = k ? pairClass(k) : null;
    var drishti = d.drishti;
    function aspectOn(from, toHouse) { return drishti.filter(function (x) { return x.graha === from && x.destHouse === toHouse; })[0] || null; }

    /* 1. THE LARGER CHAPTER */
    var chapter = [];
    chapter.push(note('larger', 'You are in your ' + MD + ' Mahadasha, a long chapter running from ' +
      d.md.displayStartDate + ' to ' + d.md.displayEndDate + '. ' + MD_CORE[MD], ['md_active', 'md_dates', 'md_core_' + MD]));
    if (sameLord) {
      chapter.push(note('larger', 'You are in the first sub-period of this chapter, from ' + d.ad.displayStartDate + ' to ' + d.ad.displayEndDate +
        ', when ' + art(MD) + ' rules both levels at once. Its themes tend to be at their most concentrated now. ' + AD_NOTICE[AD], ['ad_active', 'ad_dates', 'same_lord']));
    } else {
      chapter.push(note('larger', 'Within that chapter, you are in the ' + AD + ' sub-period, from ' + d.ad.displayStartDate + ' to ' + d.ad.displayEndDate + '. ' +
        AD_CORE[AD] + ' Inside a ' + MD + ' chapter, this sub-period can place emphasis on ' + AD_FOCUS[AD] + ', carried out through ' + MD_MODE[MD] + '. ' + AD_NOTICE[AD],
        ['ad_active', 'ad_dates', 'ad_core_' + AD, 'md_mode_' + MD]));
    }
    if (mdH) {
      var p3 = 'In your birth chart, ' + art(MD) + ' sits in the ' + ord(mdH) + ' house, the house of ' + HOUSE_NAME[mdH] +
               '. So this whole chapter can be experienced through ' + HOUSE_THROUGH[mdH] + '.';
      if (!sameLord && adH) {
        p3 += adH === mdH ? ' ' + Art(AD) + ' sits in the same house, so this sub-period points at the same part of your life.'
                          : ' ' + Art(AD) + ' sits in the ' + ord(adH) + ' house, the house of ' + HOUSE_NAME[adH] + '. During this sub-period, ' + HOUSE_THROUGH[adH] + ' may carry more of the attention.';
      }
      chapter.push(note('larger', p3, ['md_house_' + mdH, adH ? 'ad_house_' + adH : 'ad_house_missing']));
    }
    if (!sameLord && mdH && adH) {
      var p4 = [], f4 = [];
      if (pc) { p4.push(PAIR_TEXT[pc].replace('{MDH}', 'your ' + HOUSE_SHORT[mdH]).replace('{ADH}', 'your ' + HOUSE_SHORT[adH])); f4.push('pair_' + pc); }
      [[MD, adH, AD, mdH], [AD, mdH, MD, adH]].forEach(function (x) {
        var a = aspectOn(x[0], x[1]);
        if (!a || x[1] === x[3]) return;                                 /* same house is already covered */
        var special = a.aspect !== 7;
        p4.push('From the ' + ord(a.sourceHouse) + ' house, ' + art(x[0]) + ' casts its ' + (special ? 'special ' : '') + ord(a.aspect) + '-house aspect onto ' +
                art(x[2]) + ' in the ' + ord(a.destHouse) + ' house. ' + (x[0] === MD
                  ? 'So this sub-period\'s focus on ' + AD_FOCUS[AD] + ' may be shaped by what the chapter asks of your ' + HOUSE_SHORT[mdH] + '.'
                  : 'So the longer chapter may be colored by what this sub-period asks of your ' + HOUSE_SHORT[adH] + '.'));
        f4.push('drishti_' + a.graha + '_' + a.aspect + '_h' + a.destHouse);
      });
      if (p4.length) chapter.push(note('larger', p4.join(' '), f4));
    }

    /* 2. THE PRESENT SKY (Tropical, development-only bank) */
    var active = d.fast.concat(d.slow ? [d.slow] : []), sky = [];
    active.forEach(function (h) {
      var g = group(h.aspect), w = h.window;
      sky.push('## ' + heading(h));
      sky.push(note('sky', 'In Western astrology, ' + h.planet + ' represents ' + T_PLANET[h.planet] + '. Your natal ' + h.target +
        ' describes ' + T_POINT[h.target] + '. ' + T_ASPECT[h.aspect] + ' This contact may make ' + T_EFFECT[h.planet][g] + ' more noticeable around ' +
        T_POINT_SHORT[h.target] + '.' + (h.targetHouse ? ' Your natal ' + h.target + ' sits in your ' + ord(h.targetHouse) + ' house, so it may show up around ' + TH_AREA[h.targetHouse] + '.' : '') +
        ' You might observe ' + T_QUALITY[h.planet][g] + ', especially ' + TARGET_NOTICE[h.target] + '.', ['transit_' + h.planet, 'aspect_' + h.aspect + '_' + h.target, h.targetHouse ? 'target_house_' + h.targetHouse : 'target_angle']));
      var tl;
      if (w.openStart) tl = 'This contact has been active for some time and runs until ' + fmtDay(w.exit, now) + '.';
      else if (w.openEnd) tl = 'This contact became active on ' + fmtDay(w.entry, now) + ' and continues beyond the next several months.';
      else tl = 'This contact is active from ' + fmtDay(w.entry, now) + ' to ' + fmtDay(w.exit, now) + ', ' + durWords(w.exit - w.entry) + '.';
      var next = w.passes.filter(function (p) { return p > now.getTime(); })[0], last = w.passes.filter(function (p) { return p <= now.getTime(); }).pop();
      if (w.passes.length > 1) {
        tl += ' Because ' + h.planet + ' turns retrograde during this time, it becomes exact ' + NUMW[Math.min(w.passes.length, 5)] + ', on ' +
              listAnd(w.passes.map(function (p) { return fmtDay(p, now); })) + '.';
        if (h.status === 'exact') tl += ' It is currently within ' + TRANSIT_POLICY.exactThresholdDegrees + '\u00B0 of exact, so its theme is near its peak.';
        if (next) tl += ' The next exact pass is on ' + fmtDay(next, now) + '.';
        else if (h.status !== 'exact') tl += ' The last exact pass has already happened, so it is now easing.';
      } else if (h.status === 'exact') {
        tl += ' It is currently within ' + TRANSIT_POLICY.exactThresholdDegrees + '\u00B0 of exact, so its theme is near its peak.';
        if (next) tl += ' It becomes exact on ' + fmtDay(next, now) + '.';
        else if (last) tl += ' It was exact on ' + fmtDay(last, now) + '.';
        else if (w.closest) tl += ' It comes closest on ' + fmtDay(w.closest.t, now) + ' without becoming exact.';
      }
      else if (next) tl += ' It is still building toward exact on ' + fmtDay(next, now) + '.';
      else if (last && !h.applying) tl += ' It was exact on ' + fmtDay(last, now) + ', and it is now easing.';
      else if (w.closest) tl += ' It comes closest on ' + fmtDay(w.closest.t, now) + ', within ' + dmin(w.closest.f) + ' of exact, without becoming exact' +
                                (w.closest.t > now.getTime() ? '.' : ', and it is now easing.');
      sky.push(note('sky', tl + ' One option is to ' + TARGET_OPTION[h.target][g] + '.', ['window', 'passes_' + w.passes.length, h.status]));
    });
    if (!active.length) sky.push(note('sky', 'None of the included transiting planets is forming one of the selected aspects within the current orb settings.', ['no_transit_in_orb']));

    /* 3. WHERE THEY MEET (shared tags only) */
    var sources = [];
    if (adH && !sameLord) sources.push({ lord: AD, house: adH, what: 'current Vedic sub-period', dates: d.ad });
    if (mdH) sources.push({ lord: MD, house: mdH, what: 'longer Vedic chapter', dates: d.md });
    var overlaps = [], used = {};
    active.forEach(function (h) {
      var tt = transitTags(h);
      sources.forEach(function (s) {
        (HOUSE_TAGS[s.house] || []).forEach(function (tag) {
          if (tt.indexOf(tag) >= 0 && !used[tag]) { used[tag] = 1; overlaps.push({ tag: tag, h: h, s: s }); }
        });
      });
    });
    var meet = [];
    if (!active.length) {
      meet.push(note('meet', 'None of the included transiting planets is forming one of the selected aspects within the current orb settings, so there is no Tropical contact to compare. The Vedic period described above is the main timing theme at the moment.', ['no_transit_in_orb']));
    } else if (overlaps.length) {
      var o = overlaps[0], T = TAGS[o.tag];
      meet.push(note('meet', 'Your ' + o.s.what + ' is ruled by ' + art(o.s.lord) + ', which sits in the ' + ord(o.s.house) + ' house, the house of ' + HOUSE_NAME[o.s.house] +
        '. At the same time, the current Tropical sky has ' + phrase(o.h) + ', which in Western astrology touches ' + T.label + '.', ['tag_' + o.tag, 'vedic_h' + o.s.house, 'transit_' + o.h.planet]));
      meet.push(note('meet', 'Both systems are pointing at ' + T.label + ' right now. The Vedic side describes this as a longer thread, running until ' + o.s.dates.displayEndDate +
        '. The Tropical side describes a shorter window, active until ' + fmtDay(o.h.window.exit, now) + '. Together, they suggest that ' + T.weight + ' may carry more weight than usual.', ['tag_' + o.tag, 'dates']));
      if (overlaps[1]) {
        var o2 = overlaps[1];
        meet.push(note('meet', 'A second shared area is ' + TAGS[o2.tag].label + '. On the Vedic side it comes from ' + art(o2.s.lord) + ' in your ' + ord(o2.s.house) +
          ' house, and on the Tropical side from ' + phrase(o2.h) + '.', ['tag_' + o2.tag]));
      }
    } else {
      meet.push(note('meet', 'Right now the two systems are emphasizing different parts of your life. Your Vedic period points toward ' +
        (mdH ? HOUSE_THROUGH[adH && !sameLord ? adH : mdH] : AD_FOCUS[AD]) + '. The current Tropical sky points toward ' +
        listAnd(active.map(function (h) { return T_POINT_SHORT[h.target]; }).filter(function (x, i, a) { return a.indexOf(x) === i; })) + '.', ['no_shared_tag']));
      meet.push(note('meet', 'Rather than joining these, it helps to hold them separately. The longer chapter asks for ' + MD_MODE[MD] +
        '. The shorter transits move on their own schedule, over days or weeks. Noticing which one is speaking in a given moment can make both easier to work with.', ['no_shared_tag']));
    }

    /* 4. WHAT TO NOTICE NOW */
    var notice = [];
    if (overlaps.length) {
      notice.push(note('notice', 'During the overlap between this longer Vedic period and ' + overlaps[0].h.planet + "'s current transit, you might notice " +
        TAGS[overlaps[0].tag].notice + '. The transit side of this overlap is active until ' + fmtDay(overlaps[0].h.window.exit, now) + '.', ['tag_' + overlaps[0].tag]));
    } else {
      var nh = adH && !sameLord ? adH : mdH;
      notice.push(note('notice', nh ? 'During this sub-period, you might notice how much of your attention goes to ' + HOUSE_THROUGH[nh] + '.'
                                    : 'During this sub-period, you might notice where ' + AD_FOCUS[AD] + ' come up.', ['notice_house']));
    }
    if (!sameLord && mdH && adH && (pc === 'sixEight' || pc === 'twoTwelve' || pc === 'opposite')) {
      notice.push(note('notice', 'You may also notice a pull between your ' + HOUSE_SHORT[mdH] + ' and your ' + HOUSE_SHORT[adH] +
        '. When the two compete, it can help to ask which one a situation is really about before you respond.', ['pair_' + pc]));
    } else if (active.length && !overlaps.length) {
      notice.push(note('notice', 'It can help to notice which timing is behind a given urge. A wish to settle something for good may belong to the longer chapter. A quicker, passing feeling may belong to a transit, and it moves on its own schedule.', ['no_shared_tag']));
    } else {
      notice.push(note('notice', 'Within the longer ' + MD + ' chapter, it can help to notice where its call for ' + MD_MODE[MD] + ' is already guiding your choices.', ['md_mode_' + MD]));
    }
    notice.push(note('notice', 'Some people find it useful to ' + AD_OPTION[AD] + '. These are options, not rules. The point is to see where the energy of this season is already moving.', ['ad_option_' + AD]));

    return {
      tag: [MD + ' Mahadasha', MD + '\u2013' + AD, 'Current Transits'],
      sections: [
        { id: 'larger', title: 'The Larger Chapter', subtitle: 'Your Mahadasha and current Antardasha', paras: chapter },
        { id: 'sky', title: 'The Present Sky', subtitle: 'Your strongest active transits', paras: sky },
        { id: 'meet', title: 'Where They Meet', subtitle: 'How the two timing systems overlap', paras: meet },
        { id: 'notice', title: 'What To Notice Now', subtitle: 'Themes to observe and work with', paras: notice }
      ],
      overlaps: overlaps.map(function (x) { return x.tag; }),
      trace: trace
    };
  }

  /* ---------------- load ---------------- */
  var loading = null;
  function load() {
    if (loading) return loading;
    var G = global.COZ_GRAHA, A = global.COZ_ASC;
    if (!G || !A) return (loading = Promise.resolve({ ok: false, reason: 'coz-graha.js or ascendant-library.js missing' }));
    if (typeof Astronomy === 'undefined') return (loading = Promise.resolve({ ok: false, reason: 'astronomy-engine failed to load' }));
    loading = A.ensurePair().then(function (res) {
      if (!res.ok) return { ok: false, reason: 'pair refused: ' + res.reason };
      var v = res.charts.vedic, t = res.charts.tropical;
      if (!v.lifeCycle) return { ok: false, reason: 'cozChartJSON has no lifeCycle block' };
      var now = new Date();
      var per = currentPeriods(v.lifeCycle, now);
      if (!per.ok) return { ok: false, reason: per.reason };
      var targets = natalTargets(t);
      if (targets.length < 10) return { ok: false, reason: 'tropical natal positions incomplete (' + targets.length + ')' };
      /* announcementWindowDays is 0: only aspects already inside the orb are shown, nothing is announced ahead */
      var nowMs = now.getTime();
      function stamp(h) {
        var tg = targets.filter(function (x) { return x.name === h.target; })[0];
        var a = ASPECTS.filter(function (x) { return x.type === h.aspect; })[0];
        h.window = transitWindow(h, tg.lon, a.angle, nowMs);
        h.applying = h.window.applying;                     /* distance from exactness decreasing */
        h.status = h.orb <= TRANSIT_POLICY.exactThresholdDegrees ? 'exact' : (h.applying ? 'applying' : 'separating');
        return h;
      }
      function pick(list, n) {
        return list.map(function (p) { return bestHit(p, now, targets, t); })
          .filter(function (r) { return r.hit; }).map(function (r) { return r.hit; })
          .sort(function (a, b) { return a.orb - b.orb; }).slice(0, n).map(stamp);
      }
      var fast = pick(FAST, TRANSIT_POLICY.slots.fast);
      var slow = pick(SLOW, TRANSIT_POLICY.slots.slow)[0] || null;
      var fastAll = fast, slowAll = slow ? [slow] : [];
      var d = { ok: true, now: now, md: per.md, ad: per.ad, next: per.next, fast: fast, slow: slow,
                vedic: v, tropical: t, run: res.run, engine: ENGINE, policy: TRANSIT_POLICY,
                drishti: computeDrishti(v.planets), drishtiRules: DRISHTI, bankStatus: BANK_STATUS };
      d.text = compose(G, d);
      if (global.console) {
        console.log('[CURRENT TIMING] ' + ENGINE + ' run ' + res.run.runId + ' | MD ' + per.md.lord + ' AD ' + per.ad.lord +
                    ' (' + v.lifeCycle.mode + ')');
        fastAll.concat(slowAll).forEach(function (h) {
          console.log('[CURRENT TIMING] ' + h.planet + ' ' + h.aspect + ' natal ' + h.target + ' orb ' + h.orb.toFixed(2) +
                      ' (allowed ' + h.allowed + ') ' + h.status +
                      ' | transiting house ' + h.house + ' (' + h.houseSystem + '), natal target house ' + (h.targetHouse || 'angle'));
        });
        console.log('[CURRENT TIMING] ' + TRANSIT_POLICY.version + ' | ' + DRISHTI.version + ' | banks: vedic ' + BANK_STATUS.vedic + ', tropical ' + BANK_STATUS.tropical);
      }
      return d;
    }).catch(function (e) { return { ok: false, reason: (e && e.message) || 'unknown error' }; });
    return loading;
  }

  global.COZ_TIMING = { load: load, FAIL: FAIL, TGLYPH: TGLYPH, ENGINE: ENGINE, POLICY: TRANSIT_POLICY, DRISHTI: DRISHTI, BANK_STATUS: BANK_STATUS,
    _test: { computeDrishti: computeDrishti, transitWindow: transitWindow, compose: compose, pairClass: pairClass, transitTags: transitTags } };
})(window);
