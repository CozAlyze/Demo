/* COZALYZE · ASCENDANT LIBRARY · L1.0
   One shared source for the Compare Ascendant pages (your-ascendants.html and
   ascendant-reading.html). Nothing here calculates astrology and nothing is
   generated at runtime: signs come from what the reveal engine already stored,
   readings come only from the approved library below. */
(function(){
  var SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
  var GLYPH = {aries:"\u2648",taurus:"\u2649",gemini:"\u264A",cancer:"\u264B",leo:"\u264C",virgo:"\u264D",
    libra:"\u264E",scorpio:"\u264F",sagittarius:"\u2650",capricorn:"\u2651",aquarius:"\u2652",pisces:"\u2653"};

  function norm(x){
    if(x==null||x==="") return null;
    if(typeof x==="number"||/^\d+$/.test(String(x))){ var n=parseInt(x,10); return (n>=1&&n<=12)?SIGNS[n-1]:null; }
    var s=String(x).trim().toLowerCase(); return SIGNS.indexOf(s)>=0?s:null;
  }
  function ls(k){ try{ var r=localStorage.getItem(k); return r?JSON.parse(r):null; }catch(e){ return null; } }
  function lsRaw(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }

  /* Signs, first hit wins:
     1. ?w=<sign>&v=<sign>                      QA view
     2. window.COZ_ASCENDANTS {western, vedic}
     3. localStorage cozAscendants {western, vedic}
     4. emergeAscendantTropical + emergeAscendant, the pair the reveal doors write together
     5. cozTropicalChartJSON angles.ascendant.sign / cozChartJSON ascendantSignNumber
     Sign numbers are only ever a lookup key and are never displayed. */
  function resolve(){
    var q=new URLSearchParams(location.search), w=norm(q.get("w")), v=norm(q.get("v"));
    var g=window.COZ_ASCENDANTS; if(g){ w=w||norm(g.western); v=v||norm(g.vedic); }
    var a=ls("cozAscendants"); if(a){ w=w||norm(a.western); v=v||norm(a.vedic); }
    var pt=norm(lsRaw("emergeAscendantTropical")), ps=norm(lsRaw("emergeAscendant"));
    if(pt&&ps){ w=w||pt; v=v||ps; }
    var tc=ls("cozTropicalChartJSON"); if(tc&&tc.angles&&tc.angles.ascendant){ w=w||norm(tc.angles.ascendant.sign); }
    var c=ls("cozChartJSON"); if(c){ v=v||norm(c.ascendantSignNumber); }
    return { western:w, vedic:v };
  }
  /* QA parameters to carry between the two pages */
  function qaQuery(){
    var q=new URLSearchParams(location.search), o=new URLSearchParams();
    if(q.get("w")) o.set("w",q.get("w")); if(q.get("v")) o.set("v",q.get("v"));
    var s=o.toString(); return s?("&"+s):"";
  }

  /* ===== APPROVED FULL READINGS =====
     Only Jason-approved copy goes here. Aries (Western) and Pisces (Vedic) are his
     temporary test copy from the reference mockups. Every other sign shows the
     marked development placeholder until its approved text is supplied. */
  var FULL = {
    western: {
      aries: [
        "With Aries rising, you meet the world with a natural boldness and an instinct to begin. You come across as direct, honest, and full of life, often giving the impression that you are ready for what\u2019s next. People may see you as confident, self-assured, and refreshingly real.",
        "You move through life with initiative, trusting your gut and responding quickly to opportunities. There is a pioneering spirit in the way you approach new situations, and you tend to lead by doing rather than overthinking. Your presence can be energizing, encouraging others to take action and be more courageous in their own lives.",
        "Aries rising often brings a youthful, dynamic energy to your personality. You may be drawn to challenges, variety, and experiences that allow you to feel alive and engaged. You value independence and appreciate the freedom to follow your own path.",
        "At times, this energy can show up as impatience or a desire to rush ahead. You may feel frustrated by delays or people who move too slowly. Learning to balance your enthusiasm with presence and patience can help you make the most of your natural drive.",
        "Overall, Aries rising gives you a strong and magnetic way of meeting the world \u2014 one that inspires, initiates, and opens doors. You are here to move forward, to explore, and to bring your unique spark into every new chapter."
      ]
    },
    vedic: {
      pisces: [
        "With Pisces rising, you meet the world with sensitivity and an open heart. You naturally pick up on the energy around you, often sensing what others feel before it is said. You come across as compassionate, thoughtful, and deeply receptive, creating a sense of ease for the people you encounter.",
        "You experience life through intuition as much as logic, trusting subtle cues and inner knowing. Your imagination is vivid, and you tend to see the bigger picture, noticing connections that others might miss. This gives you a unique way of understanding people and situations, often approaching life with empathy and a willingness to see different perspectives.",
        "You move through the world with kindness and adaptability, flowing with change and meeting situations with a calm, open-minded presence. You are often drawn to creative, spiritual, or humanitarian pursuits, and you bring a quiet sense of inspiration to those around you.",
        "Because you are naturally attuned to others, it\u2019s important to develop discernment and maintain healthy boundaries. You may absorb the emotions or concerns of people and environments, so taking time for yourself helps you stay clear, centered, and grounded.",
        "Overall, Pisces rising gives you a gentle yet powerful way of meeting the world \u2014 one that is intuitive, compassionate, and imaginative. You are here to bring empathy, creativity, and a sense of possibility to every new chapter."
      ]
    }
  };
  function fullReading(sys, sign){ return (FULL[sys] && FULL[sys][sign]) || null; }

  window.COZ_ASC = { SIGNS:SIGNS, GLYPH:GLYPH, norm:norm, resolve:resolve, qaQuery:qaQuery, fullReading:fullReading };
})();
