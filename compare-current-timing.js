/* ============================================================
   COZALYZE · COMPARE · CURRENT TIMING · CT2.1 · shared engine
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
   (announcementWindowDays is null until he rules on it).

   PROSE. Vedic sections use the approved coz-graha.js banks (THEMES,
   HOUSE_AREAS) in the Current Season sentence pattern. Tropical transits
   are stated as calculated facts only (planet, natal contact, aspect,
   orb, status) until a separate Tropical copy bank is approved.
   Possibility register only, no em dashes.
   ============================================================ */
(function (global) {
  'use strict';

  var ENGINE = 'compare-current-timing 2.1';
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
      if (n && TRANSIT_POLICY.natalTargets.indexOf(n) >= 0 && b.position && isFinite(b.position.longitude)) out.push({ name: n, lon: b.position.longitude });
    });
    var an = t.angles || {};
    if (an.ascendant && isFinite(an.ascendant.longitude)) out.push({ name: 'Ascendant', lon: an.ascendant.longitude });
    if (an.midheaven && isFinite(an.midheaven.longitude)) out.push({ name: 'Midheaven', lon: an.midheaven.longitude });
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
        var c = { planet: body, lon: lon, target: n.name, aspect: a.type, orb: d, allowed: allowedOrb(a, n.name), applying: d2 < d };
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

  /* ---------------- word helpers ---------------- */
  var LEAD_OVERRIDE = { Rahu: 'unfamiliar territory and ambition' };
  function leadAnd(text, n) {
    var p = String(text).split(', ').slice(0, n).map(function (x) { return x.split(' and ')[0]; });
    return p.length > 1 ? p.slice(0, -1).join(', ') + ' and ' + p[p.length - 1] : p[0];
  }
  function allAnd(text) {
    var p = String(text).split(', ');
    return p.length > 1 ? p.slice(0, -1).join(', ') + ' and ' + p[p.length - 1] : p[0];
  }
  function themeLead(G, lord, n) {
    if (LEAD_OVERRIDE[lord]) return LEAD_OVERRIDE[lord];
    return G.THEMES[lord] ? leadAnd(G.THEMES[lord], n) : null;
  }
  function art(n) { return (n === 'Sun' || n === 'Moon') ? 'the ' + n : n; }
  function Art(n) { var a = art(n); return a.charAt(0).toUpperCase() + a.slice(1); }
  function natalLabel(n) { return 'your natal ' + n; }

  /* ---------------- composer (DEVELOPMENT ONLY) ---------------- */
  function compose(G, d) {
    var MD = d.md.lord, AD = d.ad.lord, v = d.vedic;
    var trace = [];
    function note(section, text, factors) { trace.push({ section: section, factors: factors, text: text.slice(0, 90) }); return text; }

    /* 1. The Larger Chapter. Same pattern as current-season.html. */
    var mdP = G.planet(v, MD), adP = G.planet(v, AD);
    var chapter = [];
    var p1 = 'Your larger ' + MD + ' chapter can bring ' + allAnd(G.THEMES[MD]) + ' into longer-term focus.';
    if (mdP && mdP.house >= 1 && mdP.house <= 12) {
      p1 += ' Because ' + art(MD) + ' occupies the ' + G.ordinal(mdP.house) + ' house of your birth chart, that emphasis may settle most noticeably around ' + G.HOUSE_AREAS[mdP.house] + '.';
    }
    p1 += ' What receives attention here tends to develop over years rather than weeks.';
    chapter.push(note('larger', p1, ['md_active', mdP ? 'md_house_' + mdP.house : 'md_house_missing']));
    var p2 = 'Within that larger chapter, the ' + AD + ' season brings ' + allAnd(G.THEMES[AD]) + ' into nearer focus.';
    if (adP && adP.house >= 1 && adP.house <= 12) {
      p2 += ' In your chart ' + art(AD) + ' occupies the ' + G.ordinal(adP.house) + ' house, the area connected with ' + G.HOUSE_AREAS[adP.house] + ', which may place this season\u2019s attention there.';
    }
    chapter.push(note('larger', p2, ['ad_active', adP ? 'ad_house_' + adP.house : 'ad_house_missing']));
    var p3 = 'This season runs from ' + d.ad.displayStartDate + ' to ' + d.ad.displayEndDate + ', inside a ' + MD +
             ' chapter that runs from ' + d.md.displayStartDate + ' to ' + d.md.displayEndDate + '.';
    if (d.next && d.next.lord) p3 += ' After it, ' + d.next.lord + ' takes over the season.';
    chapter.push(note('larger', p3, ['ad_dates', 'md_dates']));

    /* 2. The Present Sky. FACTS ONLY: no Tropical copy bank is approved yet,
       so each contact states the transiting planet, the natal point, the aspect,
       the orb and its status. No Vedic themes or house meanings are borrowed. */
    function dm(x) { var dd = Math.floor(x), mm = Math.round((x - dd) * 60); if (mm === 60) { dd++; mm = 0; } return dd + '\u00B0' + (mm < 10 ? '0' : '') + mm + '\u2032'; }
    var STATUS = { exact: 'exact', applying: 'applying', separating: 'separating' };
    function contact(h, lead) {
      return note('sky', lead(h.planet) + ' is in ' + (h.aspect === 'opposition' ? 'opposition' : h.aspect === 'conjunction' ? 'conjunction' : 'a ' + h.aspect) +
        ' to your natal ' + h.target + ', with an orb of ' + dm(h.orb) + ', ' + STATUS[h.status] + '.',
        ['transit_' + h.planet, 'aspect_' + h.aspect + '_' + h.target, 'orb_' + h.orb.toFixed(2), h.status]);
    }
    var sky = d.fast.map(function (h) { return contact(h, function (n) { return 'The transiting ' + n; }); });
    if (d.slow) sky.push(contact(d.slow, function (n) { return 'Among the slower planets, ' + art(n); }));
    if (!sky.length) sky.push(note('sky', 'No transiting planet is within orb of a contact to your birth chart at the moment.', ['no_transit_in_orb']));

    /* 3. Where They Meet. Vedic themes for the Vedic side only; the Tropical
       side is named by its calculated contacts, never interpreted. */
    var meet = [], links = [], lords = [MD, AD], active = d.fast.concat(d.slow ? [d.slow] : []);
    active.forEach(function (h) {
      if (lords.indexOf(h.planet) >= 0) {
        links.push(Art(h.planet) + ' leads your current Vedic ' + (h.planet === MD ? 'chapter' : 'season') +
                   ' and is also making one of the closest transit contacts to your birth chart right now.');
      }
      var nl = NODE_LORD[h.target] || h.target;
      if (lords.indexOf(nl) >= 0) {
        links.push('The transiting ' + h.planet + ' is in contact with your natal ' + h.target + ', and ' + art(nl) +
                   ' leads your current Vedic ' + (nl === MD ? 'chapter' : 'season') + ', so the same planet is active in both timing systems.');
      }
    });
    meet.push(note('meet', 'The longer cycle emphasizes ' + themeLead(G, MD, 2) + ' and, within it, ' + themeLead(G, AD, 2) + '.', ['md_active', 'ad_active']));
    meet.push(note('meet', 'The Vedic cycle measures this period in months and years, from ' + d.ad.displayStartDate + ' to ' + d.ad.displayEndDate +
      ' for the current season, while the transits describe contacts that form and pass over days and weeks' +
      (active.length ? ', currently ' + active.length + (active.length === 1 ? ' contact' : ' contacts') + ' within orb.' : '.'), ['ad_dates', 'transit_count']));
    if (links.length) meet.push(note('meet', links.slice(0, 3).join(' '), ['overlap']));

    /* 4. What To Notice Now. Vedic material only. */
    var notice = [];
    notice.push(note('notice', 'Over the coming weeks, notice where ' + themeLead(G, AD, 2) + ' come up. Within the longer ' + MD +
      ' chapter, questions of ' + themeLead(G, MD, 2) + ' may be the lens through which shorter shifts make the most sense.', ['ad_active', 'md_active']));
    if (adP && adP.house) {
      notice.push(note('notice', 'Because ' + art(AD) + ' sits in the ' + G.ordinal(adP.house) + ' house of your birth chart, matters of ' +
        leadAnd(G.HOUSE_AREAS[adP.house], 3) + ' may be a useful place to watch for how this season is expressing itself.', ['ad_house_' + adP.house]));
    }
    if (d.slow && lords.indexOf(d.slow.planet) >= 0) {
      notice.push(note('notice', art(d.slow.planet).replace(/^\w/, function (c) { return c.toUpperCase(); }) + ', the lord of your ' +
        (d.slow.planet === MD ? 'longer chapter' : 'current season') + ', is also in a slow transit contact with your birth chart.', ['slow_' + d.slow.planet, 'lord_match']));
    }

    return {
      tag: [MD + ' Mahadasha', MD + '\u2013' + AD, 'Current Transits'],
      sections: [
        { id: 'larger', title: 'The Larger Chapter', subtitle: 'Your Mahadasha and current Antardasha', paras: chapter },
        { id: 'sky', title: 'The Present Sky', subtitle: 'Your strongest active transits', paras: sky },
        { id: 'meet', title: 'Where They Meet', subtitle: 'How the two timing systems overlap', paras: meet },
        { id: 'notice', title: 'What To Notice Now', subtitle: 'Themes to observe and work with', paras: notice }
      ],
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
      /* announcementWindowDays is null: only aspects already inside the orb are shown, nothing is announced ahead */
      function stamp(h) { h.status = h.orb <= TRANSIT_POLICY.exactThresholdDegrees ? 'exact' : (h.applying ? 'applying' : 'separating'); return h; }
      function pick(list, n) {
        return list.map(function (p) { return bestHit(p, now, targets, t); })
          .filter(function (r) { return r.hit; }).map(function (r) { return r.hit; })
          .sort(function (a, b) { return a.orb - b.orb; }).slice(0, n).map(stamp);
      }
      var fast = pick(FAST, TRANSIT_POLICY.slots.fast);
      var slow = pick(SLOW, TRANSIT_POLICY.slots.slow)[0] || null;
      var fastAll = fast, slowAll = slow ? [slow] : [];
      var d = { ok: true, now: now, md: per.md, ad: per.ad, next: per.next, fast: fast, slow: slow,
                vedic: v, tropical: t, run: res.run, engine: ENGINE, policy: TRANSIT_POLICY };
      d.text = compose(G, d);
      if (global.console) {
        console.log('[CURRENT TIMING] ' + ENGINE + ' run ' + res.run.runId + ' | MD ' + per.md.lord + ' AD ' + per.ad.lord +
                    ' (' + v.lifeCycle.mode + ')');
        fastAll.concat(slowAll).forEach(function (h) {
          console.log('[CURRENT TIMING] ' + h.planet + ' ' + h.aspect + ' natal ' + h.target + ' orb ' + h.orb.toFixed(2) +
                      ' (allowed ' + h.allowed + ') ' + h.status +
                      ' | natal house ' + h.house + ' (' + h.houseSystem + ')');
        });
        console.log('[CURRENT TIMING] ' + TRANSIT_POLICY.version);
      }
      return d;
    }).catch(function (e) { return { ok: false, reason: (e && e.message) || 'unknown error' }; });
    return loading;
  }

  global.COZ_TIMING = { load: load, FAIL: FAIL, TGLYPH: TGLYPH, ENGINE: ENGINE, POLICY: TRANSIT_POLICY };
})(window);
