# CozAlyze Synodic Vimshottari — Source and Methodology Record

Version: 1.0
Date: 2026-09-13
Filed as reference documentation: 2026-09-13, not yet implemented — see `mahadasha/README.md`

DECISION: Support as a practitioner-selected calculation convention
IMPLEMENTATION: Controlled reference-parity mode aligned to Deva Guru
VALIDATION: Existence and reproducibility supported; predictive superiority not established

## Executive finding

There is corroborating evidence that a synodic or 360-tithi year is a real, independently
implemented dasha option. Deva Guru exposes a selectable dasha year definition, and the supplied
export produces a Vimshottari span consistent with a roughly 354.37-day nominal year. Jagannatha
Hora independently documents a 360-tithi method based on Sun-Moon angular progress. Sanjay Rath
documents the astronomical length of the synodic month from which the approximately 354.367-day
twelve-month total follows.

The evidence does not establish that every synodic implementation uses the same algorithm, or
that this method is scientifically more predictive than solar-year or 360-day alternatives. It is
therefore defensible as a named, practitioner-selected methodology, not as a universal fact.

**Approved wording:** CozAlyze uses a practitioner-selected synodic/360-tithi Vimshottari
convention, aligned to Deva Guru reference output.

## What is supported
- The method exists in current Jyotish software and is not an invention derived from Matthew's
  life events.
- A 360-tithi implementation has independent software support in Jagannatha Hora.
- The approximately 354.367-day scale has a clear astronomical basis: twelve mean synodic lunar
  months.
- Deva Guru identifies its work with the Sri Acyutananda tradition and acknowledges Pandit Sanjay
  Rath, Visti Larsen, Freedom Cole, and its parampara.
- The convention can be implemented and compared reproducibly when the exact reference settings
  and boundary rules are captured.

## What is not supported
- No controlled, blinded comparative study was found showing that the synodic convention predicts
  life events better than all alternatives.
- Deva Guru's public material does not disclose enough detail to prove whether its Synodic (354)
  option uses a fixed mean duration, actual 360-tithi angular progress, or another
  rounding/boundary implementation.
- One striking retrospective match cannot establish causation or select an algorithm.
- The method should not be described as scientifically proven, universally correct, or the most
  accurate system.

## Evidence matrix

| Source | What it supports | Limit |
|---|---|---|
| Deva Guru interface and supplied export | A selectable dasha year-definition workflow; supplied Matthew output consistent with a roughly 354.37-day nominal year. | Public pages do not disclose the complete Synodic (354) algorithm or boundary rules. |
| Deva Guru FAQ | The software calculates multiple dashas, has been used professionally since roughly mid-2020, and is shaped by a stated parampara and Sri Acyutananda lineage. | Lineage and use do not independently prove predictive superiority. |
| Jagannatha Hora features | Independent support for multiple dasha year definitions, including 365.2425-day, 360-day, user-defined, solar-angle, and 360-tithi Sun-Moon-angle modes. | This verifies a recognized implementation option, not equivalence with Deva Guru's internal algorithm. |
| Sanjay Rath, Vedic Calendar | Defines the synodic month as 29.5305888531 days and describes twelve lunar months as 10.8751234326 days shorter than a tropical year. | Astronomical duration alone does not prescribe its use for every Vimshottari calculation. |
| Shyamasundara Dasa, How Long Is a Year? | Documents a long-running 360-versus-365 debate and presents a reasoned solar-year counterposition. | It does not endorse the synodic method; it is included to prevent one-sided presentation. |

## Astronomical scale

Mean synodic month: 29.5305888531 days. Twelve mean synodic months: 29.5305888531 × 12 =
354.3670662372 days. This is the source of the familiar approximately 354-day lunar-year scale.
A 360-tithi year is related conceptually, but a program may measure it dynamically through
Sun-Moon angular progress rather than through one fixed mean-day constant.

## Matthew reference observation

The supplied Deva Guru export for Matthew Aaron Oaks shows Moon in Hasta and a Jupiter mahadasha
from 2015-03-04 to 2030-09-11. That span is 5,670 civil days; divided by Jupiter's 16 nominal
years, it averages 354.375 days per nominal year, closely matching the synodic scale. The
supplied antardasha view shows Jupiter-Moon from 2026-03-02 to 2027-06-18.

The practitioner identifies March 3, 2026 as the local start date. The raw Deva Guru display says
March 2. Both dates must remain in the record until timezone, instant-to-civil-date conversion,
and inclusive/exclusive boundary behavior are reproduced. **The event history must not be used to
choose between them.**

## Methodology classification

| Question | Finding |
|---|---|
| Does the convention exist? | Yes — verified in current Jyotish software. |
| Is there independent software support? | Yes — Jagannatha Hora documents a 360-tithi angular-progress option. |
| Is the duration astronomically grounded? | Yes — it corresponds to twelve mean synodic lunar months. |
| Is the exact Deva Guru algorithm public? | Not fully established from public documentation. |
| Is it the most common convention? | No such conclusion is supported. |
| Is predictive superiority proven? | No. |
| Is controlled adoption defensible? | Yes — as practitioner-selected, traceable, and validation-pending. |

## Adoption controls
- Implement the method as an explicit, versioned mode named `synodic_360_tithi`.
- Use Deva Guru as a reference implementation, not as an undocumented black-box authority.
- Determine whether reference parity requires a fixed mean duration or actual Sun-Moon angular
  progress.
- Validate against at least ten unrelated charts before making the mode a production default.
- Record timezone, daylight-saving treatment, ayanamsha, starting point, year definition, and
  boundary policy for every fixture.
- Keep known biographies outside chart-only calculation and generation. Use them only in
  separately labeled retrospective evaluation.
- Fail closed when the selected method, algorithm version, or boundary rule is absent or cannot
  be reproduced.

## Language controls

**Permitted:** CozAlyze uses a practitioner-selected synodic/360-tithi Vimshottari convention,
aligned to Deva Guru reference output. Other Jyotish schools and software may use different year
definitions, so dates can differ.

**Not permitted:** Do not say that the method is scientifically proven, universally correct, the
only traditional method, or demonstrably the most accurate. Do not cite Matthew's breakup, house
sale, or family move as proof of the algorithm.

## Source register
- **SRC-DEVA-GURU-UI** — Deva Guru chart and dasha interface — https://deva.guru/
- **SRC-DEVA-GURU-FAQ** — Deva Guru FAQ - software, lineage, calculation philosophy —
  https://www.deva.guru/faq
- **SRC-JH-FEATURES** — Jagannatha Hora features - dasha year definitions and 360-tithi angular
  progress — https://www.vedicastrologer.org/jh/features.htm
- **SRC-RATH-CALENDAR** — Sanjay Rath, Vedic Calendar - synodic month and lunar/solar
  relationship — https://srath.com/misc/vedic-calendar/
- **SRC-SHYAMASUNDARA-YEAR** — Shyamasundara Dasa, How Long Is a Year in Vimshottari Mahadasa? —
  https://shyamasundaradasa.com/jyotish/resources/articles/how_long_year/how_long_year_1.html
- **SRC-MATTHEW-DEVA-EXPORT** — User-supplied Deva Guru PDF and screenshots, captured 2026-09-13

## Record conclusion

Adopt for controlled implementation as a practitioner-selected convention; keep comparative
validation pending; preserve method provenance, biography isolation, and the unresolved one-day
boundary discrepancy.
