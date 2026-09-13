# CozAlyze Synodic Vimshottari Implementation Specification

Version: 1.0
Date: 2026-09-13
Status: Approved for controlled implementation; comparative validation remains pending
Filed as reference documentation: 2026-09-13, not yet implemented — see `mahadasha/README.md`

## Instruction

Implement the Vimshottari dasha year-definition method described below as a new, explicitly
identified calculation mode. Do not infer or reconstruct the algorithm from Matthew's life
events. Do not use his biography to choose dates or interpretations. First reproduce the
reference outputs from Deva Guru, then validate the same behavior on additional charts.

This is an additive program change. It does not authorize unrelated changes to chart facts,
routing, claims, reading prose, Section 1, Section 2, production eligibility, or any protected
CozAlyze file.

## 1. Method decision

CozAlyze will support a practitioner-selected synodic/360-tithi Vimshottari convention aligned to
Deva Guru reference output.

Internal status fields:

```json
{
  "system": "vimshottari",
  "yearDefinition": "synodic_360_tithi",
  "referenceImplementation": "deva_guru",
  "methodologyStatus": "practitioner_selected",
  "comparativeValidationStatus": "pending"
}
```

This method is supported by identifiable software and astronomical/traditional sources. It is
not to be described as scientifically proven, universally correct, or demonstrated to be more
accurate than all other year definitions.

## 2. Required engine modes

The engine must represent the year definition as an explicit enum, never as an unnamed constant:

```text
solar_365_2425
savana_360
synodic_360_tithi
```

The selected mode must appear in every calculation trace and saved response. Existing modes must
remain available unless a separate migration authorizes their removal.

Do not make `synodic_360_tithi` the silent global default. It may become the CozAlyze
practitioner default only through an explicit configuration value and after the reference
fixtures pass.

## 3. Calculation requirements

### 3.1 What the evidence establishes
- A mean synodic month is approximately 29.5305888531 days.
- Twelve mean synodic months are approximately 354.3670662372 days.
- Jagannatha Hora documents a distinct 360-tithi option measured through Sun-Moon angular
  progress. (Verified directly against vedicastrologer.org/jh/features.htm — real, independently
  documented feature, not invented.)
- Deva Guru exposes a selectable dasha year definition, and the supplied Matthew reference output
  behaves like a roughly 354.37-day nominal year.

### 3.2 What remains unresolved
Do not assume that Deva Guru simply multiplies every nominal year by the fixed mean value
354.3670662372. Its public documentation does not establish whether it uses:
- a fixed mean synodic-year duration;
- actual Sun-Moon angular progress for 360 tithis;
- a hybrid or rounded duration;
- a particular civil-date, timezone, or inclusive-boundary convention.

Therefore, implement the calculator behind a versioned adapter and prove its behavior against
reference output before declaring parity.

Recommended interface:

```ts
type VimshottariYearDefinition =
  | "solar_365_2425"
  | "savana_360"
  | "synodic_360_tithi";
interface VimshottariMethodConfig {
  system: "vimshottari";
  yearDefinition: VimshottariYearDefinition;
  algorithmVersion: string;
  referenceImplementation?: "deva_guru" | "jagannatha_hora";
  timezonePolicy: string;
  boundaryPolicy: string;
}
```

## 4. Reference-fixture workflow

For each fixture:
1. Preserve the exact birth date, birth time, seconds, coordinates, timezone, daylight-saving
   status, ayanamsha, node setting, starting point, and nakshatra position.
2. Capture the reference program name, selected year definition, calculation timestamp, and raw
   displayed boundaries.
3. Calculate mahadasha and antardasha boundaries without using any biography or known event dates.
4. Compare the output to the reference at timestamp level where available and at displayed
   civil-date level otherwise.
5. Record every mismatch. Do not adjust a constant to force one person's known event to match.
6. Fail closed if the configured reference-parity tolerance is exceeded.

Minimum pre-adoption test set: Matthew plus at least nine unrelated charts spanning different
starting nakshatras, birth decades, timezones, and daylight-saving conditions.

## 5. Matthew golden reference fixture

This fixture verifies reproduction only. It is not evidence of predictive superiority.

```json
{
  "fixtureId": "matthew_oaks_deva_guru_synodic_v1",
  "person": "Matthew Aaron Oaks",
  "birth": {
    "date": "1981-09-27",
    "timeLocal": "22:53:00",
    "place": "Borough of Westover, Pennsylvania, United States",
    "coordinates": { "latitude": 40.7465, "longitude": -78.6822 },
    "timezoneAtBirth": "EDT",
    "utcOffsetAtBirth": "-04:00"
  },
  "reference": {
    "provider": "Deva Guru",
    "startingTara": "Moon in Hasta",
    "yearDefinition": "Synodic (354)",
    "jupiterMahadasha": {
      "startDisplayed": "2015-03-04",
      "endDisplayed": "2030-09-11"
    },
    "jupiterAntardashas": [
      { "lord": "Jupiter", "startDisplayed": "2015-03-04", "endDisplayed": "2017-03-29" },
      { "lord": "Saturn", "startDisplayed": "2017-03-29", "endDisplayed": "2019-09-13" },
      { "lord": "Mercury", "startDisplayed": "2019-09-13", "endDisplayed": "2021-11-24" },
      { "lord": "Ketu", "startDisplayed": "2021-11-24", "endDisplayed": "2022-10-21" },
      { "lord": "Venus", "startDisplayed": "2022-10-21", "endDisplayed": "2025-05-23" },
      { "lord": "Sun", "startDisplayed": "2025-05-23", "endDisplayed": "2026-03-02" },
      { "lord": "Moon", "startDisplayed": "2026-03-02", "endDisplayed": "2027-06-18" },
      { "lord": "Mars", "startDisplayed": "2027-06-18", "endDisplayed": "2028-05-13" },
      { "lord": "Rahu", "startDisplayed": "2028-05-13", "endDisplayed": "2030-09-11" }
    ]
  },
  "boundaryNote": {
    "rawReferenceDate": "2026-03-02",
    "practitionerLocalDate": "2026-03-03",
    "status": "unresolved_one_day_display_boundary"
  }
}
```

The program must retain both March 2 and March 3 until the timezone and boundary behavior is
demonstrated. It must not silently replace the raw reference date with the event-correlated date.

### Reference chart facts for integrity checks

The supplied Deva Guru export shows:
- Ascendant: Gemini 0 degrees 07 minutes 22 seconds
- Moon: Virgo 10 degrees 43 minutes 23 seconds, Hasta pada 1
- Jupiter: Virgo 23 degrees 42 minutes 01 second
- Sun: Virgo 11 degrees 19 minutes 04 seconds
- Saturn: Virgo 18 degrees 16 minutes 04 seconds
- Mercury: Libra 6 degrees 55 minutes 19 seconds
- Venus: Libra 24 degrees 00 minutes 58 seconds
- Mars: Cancer 22 degrees 40 minutes 39 seconds
- Rahu: Cancer 4 degrees 37 minutes 56 seconds
- Ketu: Capricorn 4 degrees 37 minutes 56 seconds

These values are integrity assertions, not permission to change chart calculation settings.

## 6. Biography-isolation rule

Chart-only readings must be generated without access to conversation history, relationship
history, property transactions, family moves, health history, career events, or any other known
outcome.

Matthew's breakup, house sale, and move closer to family may be stored only in a separate
retrospective-validation record. They must not be supplied to the calculation engine or
chart-only prose generator, and they must not be used to select one possible manifestation over
another.

If a client voluntarily supplies context and asks for a context-informed reading, it must be a
separately labeled mode:

```json
{
  "readingMode": "context_informed",
  "clientContextProvided": true
}
```

Never blur chart_only and context_informed output.

## 7. Reading-language rule

A dasha describes themes, pressures, and plausible areas of focus; it does not prove that one
specific event must occur.

Customer prose must:
- explain the period in plain language before technical interpretation;
- state chart-supported themes directly;
- use calibrated possibility language for manifestations;
- offer several realistic expressions when the chart supports more than one;
- avoid importing facts known only from the client's biography;
- avoid presenting a striking retrospective match as proof of causation.

**Approved pattern:**
> During a Jupiter-Moon period, questions of emotional security, home, family, care, and
> belonging can become more prominent. Depending on the rest of the chart and the person's
> circumstances, this may coincide with a move, a change in living arrangements, a family
> responsibility, a property decision, or an internal redefinition of what home means.

**Not approved:**
> This period means you will sell your shared house, end your relationship, and move back in
> with family.

## 8. Required automated tests

**Calculation tests:**
- All mahadasha and antardasha intervals are contiguous with no gaps or overlaps.
- The full sequence preserves Vimshottari lord order and proportional allocation.
- All modes produce deterministic output from identical inputs.
- Mode selection is explicit in the trace.
- Matthew's raw Deva Guru boundaries match within the adopted tolerance.
- The March 2/March 3 discrepancy remains a reported unresolved boundary until proven.
- Timezone and daylight-saving mutations cannot silently change the calculation basis.
- Fixed-duration and angular-progress implementations are compared, not conflated.

**Isolation tests:**
- The same chart produces identical chart-only output whether biography fields are absent or
  populated.
- Known event text cannot enter prompts, traces, claim selection, or generated prose in
  chart-only mode.
- Context-informed output is labeled and separately audited.

**Language tests:**
- Specific deterministic event claims fail.
- Universal themes with multiple plausible manifestations pass.
- A retrospective match is labeled as observation, not validation of causation.

## 9. Required trace fields

Every dasha result must record:

```json
{
  "system": "vimshottari",
  "yearDefinition": "synodic_360_tithi",
  "algorithmVersion": "pending_reference_parity",
  "referenceImplementation": "deva_guru",
  "birthTimezone": "...",
  "calculationTimezone": "...",
  "boundaryPolicy": "...",
  "sourceRecordVersion": "1.0",
  "comparativeValidationStatus": "pending"
}
```

## 10. Acceptance gates

Do not call the implementation complete until all of the following are true:
1. The exact Deva Guru selection used for each reference chart is recorded.
2. Matthew and nine unrelated reference charts reproduce within a declared tolerance.
3. The program identifies whether parity requires fixed mean duration or Sun-Moon angular
   progress.
4. Civil-date, timezone, and inclusive/exclusive boundary behavior are documented.
5. All calculation, continuity, isolation, and language tests pass.
6. No protected CozAlyze file changes outside the separately authorized implementation scope.
7. The final customer wording says practitioner-selected, not scientifically proven or
   universally correct.

## 11. Source identifiers

- **SRC-DEVA-GURU-UI** — Deva Guru chart interface, year-definition control and supplied
  reference exports — https://deva.guru/
- **SRC-DEVA-GURU-FAQ** — Deva Guru FAQ and lineage/methodology statements —
  https://www.deva.guru/faq (verified: confirms Sri Acyutananda/Sanjay Rath/Visti Larsen/Freedom
  Cole lineage and professional use since ~mid-2020; does not itself document the "Synodic (354)"
  option or its algorithm)
- **SRC-JH-FEATURES** — Jagannatha Hora feature documentation for multiple year definitions and
  360-tithi angular progress — https://www.vedicastrologer.org/jh/features.htm (verified: real,
  lists "360-tithi years with the Sun-Moon angle progress taken as the measure of time" as one of
  five supported dasha year types)
- **SRC-RATH-CALENDAR** — Sanjay Rath, Vedic Calendar, synodic-month duration and lunar/solar
  relationship — https://srath.com/misc/vedic-calendar/ (verified: confirms 29.53059-day synodic
  month and ~10.875-day shortfall vs. tropical year; connects the 18-year Saros/eclipse cycle
  specifically to Rahu's 18-year Vimshottari period, not to redefining all nine dasha-year
  lengths generally)
- **SRC-SHYAMASUNDARA-YEAR** — Shyamasundara Dasa, How Long Is a Year in Vimshottari Mahadasa?,
  dissenting solar-year position and history of the 360/365 dispute —
  https://shyamasundaradasa.com/jyotish/resources/articles/how_long_year/how_long_year_1.html
- **SRC-MATTHEW-DEVA-EXPORT** — Supplied Deva Guru PDF and screenshots for Matthew Aaron Oaks,
  captured 2026-09-13
