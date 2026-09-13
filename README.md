# Mahadasha / Current Life Cycle — Reference Documentation

Status: **approved reference documentation only. Not implemented.**

Methodology status (preserve exactly):
- Practitioner-selected synodic/360-tithi Vimshottari convention
- Aligned to Deva Guru reference output
- Existence and independent implementation verified
- Exact Deva Guru algorithm and boundary behavior not yet fully reproduced
- Comparative validation pending
- Predictive superiority not established

Building and validating the actual dasha calculation engine is a separate, explicitly-authorized
future project, to be opened only after the six-section reading work (see
`editorial/six-section-reading-voice-guide.md`) is complete and safely packaged. Filing these
documents here does not start that project. No code, calculation, routing, response, or
production change accompanies this filing.

Files:
- `CozAlyze-Synodic-Vimshottari-Implementation-Specification.md` — the implementation spec
  (engine modes, calculation requirements, reference-fixture workflow, biography-isolation rule,
  reading-language rule, required tests, acceptance gates).
- `CozAlyze-Synodic-Vimshottari-Methodology-Record.md` — the source-and-methodology record
  (evidence review, evidence matrix, methodology classification, adoption controls, language
  controls, source register).

Both preserve the Matthew Aaron Oaks reference fixture with BOTH the raw Deva Guru boundary
(2026-03-02) and the practitioner-local date (2026-03-03) for the Jupiter-Moon antardasha. This
discrepancy is unresolved and must not be resolved using Matthew's known life events (his
reported separation/house-sale timing) — see the biography-isolation rule in the implementation
spec.

Minimum pre-adoption test set before any production-default consideration: Matthew plus at least
nine unrelated charts spanning different starting nakshatras, birth decades, timezones, and
daylight-saving conditions.
