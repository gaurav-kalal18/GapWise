# GapWise — Project Progress

## Current Phase

Backend Intelligence

## Overall Status

Core deterministic analysis pipeline is working.

---

## Completed

- [x] Backend foundation
- [x] Express API
- [x] Resume PDF parsing
- [x] Resume skill extraction
- [x] Evidence/confidence preservation
- [x] ESCO skill dataset
- [x] ESCO occupation dataset
- [x] ESCO skill relations
- [x] GapWise role catalog
- [x] Technology taxonomy
- [x] JD technology extraction
- [x] JD section detection
- [x] Requirement classification
- [x] Skill unification
- [x] Exact skill matching
- [x] Partial skill matching
- [x] Related-skill gap detection
- [x] Gap prioritization
- [x] Dependency analysis
- [x] Readiness calculation
- [x] Personalized roadmap
- [x] Evidence-aware roadmap

---

## Current Working Example

Candidate skills:

- JavaScript
- Node.js
- PostgreSQL

Target job:

### Required
- JavaScript
- Node.js
- SQL

### Preferred
- React

Current analysis:

- JavaScript → exact match
- Node.js → exact match
- SQL → partial evidence through PostgreSQL
- React → missing

Current readiness:

57 / 100

Current roadmap:

1. SQL — High priority
2. React — Medium priority

---

## Current Task

### Refine Readiness Scoring

The current score is mathematically valid but still simplistic.

Improve it to clearly distinguish:

- Required skill coverage
- Preferred skill coverage
- Partial evidence
- Critical missing requirements

Do not introduce arbitrary thresholds.

---

## Immediate Next Steps

1. Refine readiness scoring
2. Test edge cases
3. Build labeled evaluation dataset
4. Measure extraction/matching performance
5. Add embeddings
6. Build semantic/hybrid matching
7. Add LLM layer
8. Build long-chat context management
9. Build React UI
10. Integrate and deploy

---

## Important Rule

Do NOT start frontend/UI work yet.

Backend intelligence and evaluation should be sufficiently stable first.

---

## Last Verified API

Endpoint:

POST /api/analysis/candidate

Backend:

http://localhost:5000

Last verified behavior:

SQL receives evidence-aware roadmap actions:

- Strengthen SQL using your existing PostgreSQL knowledge
- Practice SQL concepts and real-world problems
- Build a project that demonstrates SQL

React receives generic learning actions.

---

## Development Rule

After every meaningful backend change:

1. Modify code
2. Restart server
3. Run API test
4. Inspect JSON output
5. Verify behavior
6. Only then move to the next task

---

## Known Design Decisions

- ESCO is the canonical external taxonomy.
- O*NET is not currently used.
- Deterministic baseline comes before embeddings/LLMs.
- Related skills do not automatically satisfy requirements.
- Candidate evidence must be preserved.
- Thresholds should eventually be calibrated using evaluation data.
- The chatbot should not become the source of truth.
- UI should be built around real backend results, not mocked intelligence.