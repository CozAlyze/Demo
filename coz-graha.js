/* ============================================================
   COZALYZE · COZ_GRAHA · shared graha glyph + life-cycle data module
   Used by current-life-cycle.html and current-season.html.

   Why this file exists: the repository carries no graha symbol assets of
   any kind. vedic-birth-chart.html renders bodies as two-letter
   abbreviations (Ke, Ve) and no SVG, PNG or glyph font for the nine
   grahas appears anywhere. Rather than add nine image files, every lord
   is drawn here once as inline SVG geometry using currentColor, so the
   copper tone comes from CSS and one component serves all nine.

   Nothing in this file is chart-specific. It reads whatever chart is in
   localStorage and exposes it; it never assumes a lord or a date.
   ============================================================ */
(function (global) {
  'use strict';

  var LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

  /* Glyph geometry, 48x48 viewBox, stroke-based so one path set scales to
     any medallion size. Drawn from the standard astrological forms. */
  var GLYPH = {
    Sun:     '<circle cx="24" cy="24" r="10.5"/><circle cx="24" cy="24" r="2.2" fill="currentColor" stroke="none"/>',
    Moon:    '<path d="M29.5 10.5a14 14 0 1 0 0 27 11.4 11.4 0 0 1 0-27z"/>',
    Mars:    '<circle cx="20.5" cy="27.5" r="9"/><path d="M27 21l10-10"/><path d="M29.5 11H37v7.5"/>',
    Mercury: '<circle cx="24" cy="24.5" r="8"/><path d="M24 32.5v8"/><path d="M19.5 37h9"/><path d="M18.5 12.5a7.5 7.5 0 0 0 11 0"/>',
    Jupiter: '<path d="M14 14.5c4.5-4 10-1.5 10 3.5v18"/><path d="M12.5 36h19"/>',
    Venus:   '<circle cx="24" cy="19.5" r="8.5"/><path d="M24 28v11"/><path d="M19 34h10"/>',
    Saturn:  '<path d="M15 13.5c4-2.5 8 0 8 4v18"/><path d="M12 20h11"/><path d="M23 35.5c0 3 2 4.5 4.5 4.5s5-1.5 5-5-2.5-5-5-5"/>',
    Rahu:    '<path d="M14 34c0-9 2.5-16 10-16s10 7 10 16"/><circle cx="17" cy="37" r="3.2"/><circle cx="31" cy="37" r="3.2"/>',
    Ketu:    '<path d="M14 16c0 9 2.5 16 10 16s10-7 10-16"/><circle cx="17" cy="12" r="3.2"/><circle cx="31" cy="12" r="3.2"/>'
  };

  /* Approved plain-language themes. Handoff table, verbatim, no additions. */
  var THEMES = {
    Ketu:    'detachment, closures, simplification, inward or spiritual focus',
    Venus:   'relationships, creativity, pleasure, values, harmony',
    Sun:     'visibility, authority, identity, self-definition',
    Moon:    'home, family, care, emotional security, belonging',
    Mars:    'action, assertion, courage, conflict, decisive effort',
    Rahu:    'new, foreign, unconventional, ambitious, unfamiliar territory',
    Jupiter: 'growth, wisdom, teaching, meaning, faith, expansion',
    Saturn:  'responsibility, limits, rebuilding, patience, mastery',
    Mercury: 'communication, learning, analysis, trade, practical work'
  };

  var SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  var ORDINALS = ['','first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];

  /* House themes, used only to name the life area a verified placement
     activates. Never used as a substitute for an actual placement. */
  var HOUSE_AREAS = {
    1:  'self, identity, body and the way you meet the world',
    2:  'resources, values, speech and what you gather around you',
    3:  'effort, courage, siblings, communication and nearby travel',
    4:  'home, family, emotional security, privacy and belonging',
    5:  'creativity, children, learning and what you enjoy expressing',
    6:  'work, service, routine, obstacles and the effort to resolve them',
    7:  'partnership, agreements and one-to-one relationship',
    8:  'shared resources, change, research and what is held privately',
    9:  'meaning, belief, teachers, higher study and long journeys',
    10: 'work in the world, visibility, responsibility and direction',
    11: 'networks, gains, community and longer-range hopes',
    12: 'retreat, release, rest, inner life and what is set down'
  };

  function glyphSVG(lord, size, cls) {
    var g = GLYPH[lord];
    if (!g) return '';
    return '<svg class="' + (cls || 'coz-glyph') + '" viewBox="0 0 48 48" width="' + size + '" height="' + size +
           '" role="img" aria-label="' + lord + '" focusable="false">' + g + '</svg>';
  }

  /* Medallion: the circular framed symbol from the approved artwork.
     One component, any lord, colour inherited from CSS. */
  function medallion(lord, size) {
    size = size || 74;
    var inner = Math.round(size * 0.52);
    return '<span class="coz-medallion" style="width:' + size + 'px;height:' + size + 'px" data-lord="' + lord + '">' +
           glyphSVG(lord, inner) + '</span>';
  }

  function readChart() {
    var raw = null;
    try { raw = localStorage.getItem('cozChartJSON'); } catch (e) { return null; }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  /* Locate a body in the chart's planets array. Returns null when absent
     rather than guessing, so callers can fail closed. */
  function planet(chart, name) {
    if (!chart || !chart.planets) return null;
    for (var i = 0; i < chart.planets.length; i++) {
      if (chart.planets[i].name === name) return chart.planets[i];
    }
    return null;
  }

  function signName(n) { return (n >= 1 && n <= 12) ? SIGNS[n - 1] : null; }
  function ordinal(n) { return (n >= 1 && n <= 12) ? ORDINALS[n] : null; }

  /* Every graha sharing a house with the given body, excluding the
     Ascendant and the body itself. Verified co-presence only. */
  function coTenants(chart, name) {
    var p = planet(chart, name), out = [];
    if (!p || !chart.planets) return out;
    for (var i = 0; i < chart.planets.length; i++) {
      var q = chart.planets[i];
      if (q.name === name || q.name === 'Ascendant') continue;
      if (q.house === p.house) out.push(q.name);
    }
    return out;
  }

  global.COZ_GRAHA = {
    LORDS: LORDS, THEMES: THEMES, HOUSE_AREAS: HOUSE_AREAS,
    glyphSVG: glyphSVG, medallion: medallion,
    readChart: readChart, planet: planet, coTenants: coTenants,
    signName: signName, ordinal: ordinal
  };
})(window);
