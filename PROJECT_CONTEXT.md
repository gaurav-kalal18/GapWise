# GapWise — Complete Project Context

> **Project:** GapWise  
> **Academic Title:** AI-Based Personalized Job Skill Gap Analyzer  
> **Repository:** GapWise  
> **Current Phase:** Backend intelligence / deterministic analysis engine  
> **Status:** Core backend pipeline working; UI has NOT started yet.

---

# 1. Project Vision

GapWise is an intelligent job-readiness and skill-gap analysis platform.

The system takes:

1. A candidate's resume/profile
2. A target job description or selected role

and determines:

- What skills the candidate already satisfies
- What skills are only partially supported
- What skills are missing
- Which gaps matter most
- Which prerequisites should be learned first
- How ready the candidate is for the target role
- What personalized learning/project path should be followed

The goal is **not** to build a generic "AI resume analyzer".

GapWise should behave like an actual **career intelligence system**.

The long-term pipeline is:

```text
Resume
   ↓
Resume Intelligence
   ↓
Candidate Skill Profile
   ↓
Target Job / Role
   ↓
JD Intelligence
   ↓
Skill Normalization
   ↓
Hybrid Skill Matching
   ↓
Gap Detection
   ↓
Gap Prioritization
   ↓
Dependency Analysis
   ↓
Readiness Score
   ↓
Personalized Roadmap
   ↓
Evidence / Re-evaluation
```

---

# 2. Core Product Principles

## Principle 1 — Evidence over assumptions

The system should distinguish:

```text
Candidate explicitly demonstrates skill
        ≠
Candidate has a related skill
        ≠
Candidate probably knows the skill
```

Example:

```text
PostgreSQL → SQL
```

provides supporting evidence for SQL.

But:

```text
JavaScript → React
```

does NOT mean the candidate knows React.

Therefore related skills should not automatically satisfy requirements.

---

## Principle 2 — Deterministic core first

The project should first establish a reliable deterministic baseline.

Do NOT immediately add:

- LLM everywhere
- embeddings everywhere
- arbitrary AI-generated scores

The deterministic system provides the foundation against which later AI improvements can be evaluated.

---

## Principle 3 — Explainability

Every major result should eventually be explainable.

For example:

```text
SQL
Status: Partial

Why?
Candidate demonstrates PostgreSQL experience.

Why not fully satisfied?
The job explicitly requires SQL and the current evidence does not directly demonstrate general SQL proficiency.
```

---

## Principle 4 — No arbitrary thresholds

Do not invent thresholds such as:

```text
similarity > 0.8 = match
```

without evaluation data.

Thresholds should eventually be calibrated using labeled examples.

---

# 3. Target Architecture

Long-term architecture:

```text
┌──────────────────────┐
│      React UI        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Node.js / Express    │
│ API + orchestration  │
└──────────┬───────────┘
           │
           ├───────────────┐
           ▼               ▼
┌────────────────┐  ┌─────────────────┐
│ Python AI      │  │ PostgreSQL      │
│ Service        │  │ + pgvector      │
└────────────────┘  └─────────────────┘
```

Current implementation primarily uses:

```text
Node.js
Express
JavaScript
JSON datasets
ESCO taxonomy
pdf-parse
```

The Python AI service and PostgreSQL layer are planned for later stages.

---

# 4. Repository Structure

Current structure:

```text
GapWise/
├── ai-service/
│
├── backend/
│   ├── node_modules/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── health.routes.js
│   │   │   ├── profile.routes.js
│   │   │   ├── job.routes.js
│   │   │   ├── analysis.routes.js
│   │   │   ├── resume.routes.js
│   │   │   └── role.routes.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── profile.controller.js
│   │   │   ├── job.controller.js
│   │   │   ├── analysis.controller.js
│   │   │   ├── resume.controller.js
│   │   │   └── role.controller.js
│   │   │
│   │   ├── services/
│   │   │   ├── skill.service.js
│   │   │   ├── skill.taxonomy.js
│   │   │   ├── matching.service.js
│   │   │   ├── scoring.service.js
│   │   │   ├── priority.service.js
│   │   │   ├── analysis.service.js
│   │   │   ├── readiness.service.js
│   │   │   ├── dependency.service.js
│   │   │   ├── roadmap.service.js
│   │   │   ├── role.service.js
│   │   │   ├── jd-skill.service.js
│   │   │   ├── technology.taxonomy.js
│   │   │   ├── technology.service.js
│   │   │   ├── requirement.service.js
│   │   │   ├── skill.unification.service.js
│   │   │   └── jd-section.service.js
│   │   │
│   │   ├── data/
│   │   │   ├── skills/
│   │   │   │   └── skill.schema.json
│   │   │   │
│   │   │   └── import/
│   │   │       ├── import-esco-skills.js
│   │   │       ├── import-esco-relations.js
│   │   │       └── import-esco-occupations.js
│   │   │
│   │   ├── uploads/
│   │   └── app.js
│   │
│   ├── data/
│   │   ├── esco/
│   │   │   ├── skills_en.csv
│   │   │   ├── skillsHierarchy_en.csv
│   │   │   ├── skillSkillRelations_en.csv
│   │   │   ├── skillGroups_en.csv
│   │   │   ├── occupations_en.csv
│   │   │   ├── occupationSkillRelations_en.csv
│   │   │   └── ...
│   │   │
│   │   └── gapwise/
│   │       ├── skills.json
│   │       ├── occupations.json
│   │       └── roles.json
│   │
│   ├── package.json
│   └── server.js
│
├── frontend/
├── .gitignore
└── README.md
```

---

# 5. Backend Entry Point

`backend/server.js`:

```js
const app = require("./src/app");

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`GapWise backend running on port ${PORT}`);
});
```

`backend/src/app.js`:

```js
const express = require("express");

const healthRoutes = require("./routes/health.routes");
const profileRoutes = require("./routes/profile.routes");
const jobRoutes = require("./routes/job.routes");
const analysisRoutes = require("./routes/analysis.routes");
const resumeRoutes = require("./routes/resume.routes");
const roleRoutes = require("./routes/role.routes");

const app = express();

app.use(express.json());

app.use("/api", healthRoutes);
app.use("/api", profileRoutes);
app.use("/api", jobRoutes);
app.use("/api", analysisRoutes);
app.use("/api", resumeRoutes);
app.use("/api", roleRoutes);

module.exports = app;
```

Backend currently runs on:

```text
http://localhost:5000
```

---

# 6. ESCO Decision

GapWise uses **ESCO** as its external canonical occupational/skill vocabulary.

Do NOT add O*NET at this stage.

Reason:

ESCO provides:

- canonical skills
- occupations
- skill relationships
- occupation-skill relationships
- broader/narrower relationships
- essential/optional relationships

However, ESCO is NOT treated as a modern software-engineering job checklist.

Actual job descriptions provide current market requirements.

Architecture:

```text
ESCO
 ↓
GapWise Skill Graph
 ↓
Resume / JD Evidence
 ↓
Hybrid Matching
 ↓
Gap Prioritization
 ↓
Dependency Graph
 ↓
Roadmap
```

---

# 7. ESCO Data

Imported:

```text
13,960 ESCO skills
3,039 ESCO occupations
```

ESCO version:

```text
1.2.1
```

Important:

Do not blindly expose all ESCO skills to the user.

ESCO is the canonical vocabulary layer, not the final UI taxonomy.

---

# 8. Role Catalog

Current GapWise roles:

```text
Software Engineer
Backend Developer
Frontend Developer
Full Stack Developer
Data Scientist
ML Engineer
```

Role mapping uses ESCO occupations.

Examples:

```text
Software Engineer
→ Software Developer

Backend Developer
→ Software Developer
→ Cloud Software Developer (supporting)

Frontend Developer
→ Web Developer

Full Stack Developer
→ Software Developer
→ Web Developer

Data Scientist
→ Data Scientist

ML Engineer
→ Software Developer
→ Data Scientist
```

Current API:

```text
GET /api/roles
GET /api/roles/:roleId
GET /api/roles/:roleId/skills
```

Role test currently produces:

```text
43 essential skills
84 optional skills
0 overlap
```

for the Backend Developer example.

---

# 9. Canonical Skill Schema

`skill.schema.json` contains fields such as:

```text
id
canonicalName
description
skillType
aliases
categories
relations
prerequisites
occupations
sources
metadata
```

Important:

`prerequisites` are GapWise-derived.

They are not assumed to be directly supplied by ESCO.

---

# 10. Resume Intelligence

Resume parsing is already working.

Technology:

```text
pdf-parse@2.4.5
```

Resume extraction currently supports:

- sections
- skills
- confidence
- evidence
- projects
- experience
- achievements
- coursework

The candidate skill representation is richer than a simple string.

Example conceptual representation:

```js
{
    canonicalName: "PostgreSQL",
    confidence: 0.85,
    evidence: "Designed PostgreSQL databases"
}
```

This evidence must be preserved through the analysis pipeline.

---

# 11. Technology Taxonomy

A dedicated technology taxonomy was introduced because ESCO alone does not reliably capture modern technology aliases.

Current technology vocabulary includes:

```text
JavaScript
TypeScript
Python
Java
C++
React
Node.js
Express.js
MongoDB
PostgreSQL
MySQL
Redis
Docker
Kubernetes
Git
GitHub
REST API
GraphQL
AWS
Microsoft Azure
Google Cloud
SQL
```

Technology extraction:

- uses aliases
- uses word-boundary regex
- preserves positions
- preserves matched phrase
- assigns extraction confidence
- identifies extraction method

Example:

```text
extractionMethod:
"technology-alias"

extractionConfidence:
1
```

---

# 12. JD Intelligence

Job descriptions are processed through several layers.

Pipeline:

```text
Raw JD
 ↓
Section Detection
 ↓
Technology Extraction
 ↓
ESCO/skill extraction
 ↓
Requirement Classification
 ↓
Skill Unification
 ↓
Structured Job Profile
```

---

# 13. JD Section Classification

Current recognized sections include:

Required:

```text
Required Qualifications
Basic Qualifications
Minimum Qualifications
Must-Have
Required Skills
Requirements
```

Preferred:

```text
Preferred Qualifications
Preferred Skills
Nice-to-Have
Desired Qualifications
Preferred Experience
Bonus Qualifications
```

Responsibility:

```text
Responsibilities
Key Responsibilities
Job Responsibilities
What You'll Do
What You Will Do
Duties
```

Important:

A skill inside a Responsibilities section is NOT automatically classified as required.

---

# 14. Requirement Classification

Current signals:

Required:

```text
required
requirement
requirements
must
mandatory
essential
needed
should have
must have
```

Preferred:

```text
preferred
prefer
preferred
plus
nice to have
nice-to-have
bonus
advantage
desirable
ideally
```

Current confidence:

```text
required sentence → 0.90
preferred sentence → 0.85

required section → 0.95
preferred section → 0.95
```

These values are currently deterministic prototype values.

They should eventually be calibrated using labeled data.

---

# 15. Skill Matching

Current matcher supports:

## Exact match

Example:

```text
Candidate: JavaScript
Requirement: JavaScript
```

Result:

```text
matchType: exact
matchScore: 1
satisfiesRequirement: true
```

---

## Strong partial relationship

Currently:

```text
PostgreSQL → SQL
MySQL → SQL
SQL → PostgreSQL
SQL → MySQL
```

These provide supporting evidence but do not fully satisfy the requirement.

Example:

```text
Requirement: SQL
Candidate: PostgreSQL
```

Result:

```text
matchType: related
matchScore: 0.6
satisfiesRequirement: false
```

---

## Generic related skill

Example:

```text
Candidate: JavaScript
Requirement: React
```

This is related but does NOT satisfy React.

Result:

```text
matchType: gap
matchedWith: JavaScript
relatedSkill: true
matchScore: 0
satisfiesRequirement: false
```

This distinction is intentional.

---

# 16. Current Matching Example

Candidate:

```text
JavaScript
Node.js
PostgreSQL
```

Job:

```text
Required:
JavaScript
Node.js
SQL

Preferred:
React
```

Current result:

```text
JavaScript → exact / satisfied

Node.js → exact / satisfied

SQL → related through PostgreSQL / not fully satisfied

React → gap / JavaScript is related but does not prove React
```

---

# 17. Gap Prioritization

Current priority logic considers:

```text
requirement type
match score
whether requirement is actually satisfied
```

Required:

```text
importance = 1.0
```

Preferred:

```text
importance = 0.5
```

Unsatisfied partial matches receive full importance because they are still gaps.

Example:

```text
SQL
required
matchScore = 0.6
satisfiesRequirement = false
```

Current result:

```text
priorityScore = 1
priorityLevel = high
```

Reason:

```text
Required skill has supporting evidence but is not fully satisfied
```

---

# 18. Dependency Analysis

Current dependency examples:

```text
React
→ JavaScript

Node.js
→ JavaScript

Express.js
→ Node.js

TypeScript
→ JavaScript

Data Structures
→ Programming

Algorithms
→ Data Structures

Machine Learning
→ Python
→ Statistics

Data Science
→ Python
→ Statistics

PostgreSQL
→ SQL
→ Databases

MySQL
→ SQL
→ Databases
```

Dependency analysis determines:

- prerequisites
- missing prerequisites
- dependency depth
- learning priority

Important:

Candidate skill objects are normalized before comparison.

---

# 19. Readiness Score

Current readiness uses weighted requirements.

Required:

```text
weight = 2
```

Preferred:

```text
weight = 1
```

Only genuinely satisfied requirements contribute achievement.

Partial evidence is tracked separately.

Current example:

```text
4 total requirements

2 required satisfied
1 required gap
1 preferred gap

score = 57
level = low
```

The 57 is mathematically valid under the current model.

However, this readiness model is still provisional.

Future improvements should include:

- required coverage
- preferred coverage
- critical gaps
- partial evidence
- possibly role-specific weighting
- calibrated thresholds
- better explanation

Do not arbitrarily change the formula without justification.

---

# 20. Roadmap Generation

Current roadmap considers:

- gap priority
- dependency depth
- missing prerequisites
- candidate evidence

Roadmap order currently prioritizes high-impact gaps.

Estimated duration is currently simplistic:

```text
base = 2 weeks

high priority → +1 week

dependency depth >= 2 → +1 week
```

This is a prototype only.

Do not treat these durations as scientifically validated.

---

# 21. Evidence-Aware Roadmap

Current system distinguishes between:

## Partial evidence

Example:

```text
SQL
matchedWith: PostgreSQL
evidenceStrength: 0.85
```

Actions:

```text
Strengthen SQL using your existing PostgreSQL knowledge
Practice SQL concepts and real-world problems
Build a project that demonstrates SQL
```

## No evidence

Example:

```text
React
```

Actions:

```text
Learn React fundamentals
Practice components, props, state, and hooks
Build a small React application
```

This is an important product behavior.

---

# 22. Current Analysis API

Current endpoint:

```text
POST /api/analysis/candidate
```

Current successful test returns:

```json
{
  "message": "Candidate-job analysis completed",
  "analysis": {
    "matches": [],
    "gaps": [],
    "readiness": {},
    "roadmap": []
  }
}
```

Actual test scenario:

Candidate:

```text
JavaScript
Node.js
PostgreSQL
```

Job:

```text
Required:
JavaScript
Node.js
SQL

Preferred:
React
```

produced:

```text
Matches:
JavaScript
Node.js

Gaps:
SQL
React

Readiness:
57 / 100

Roadmap:
SQL → React
```

---

# 23. Current Example Output

SQL:

```json
{
  "skill": "SQL",
  "requirementType": "required",
  "matchType": "related",
  "matchedWith": "PostgreSQL",
  "matchScore": 0.6,
  "satisfiesRequirement": false,
  "candidateConfidence": 0.85,
  "candidateEvidence": "Designed PostgreSQL databases",
  "evidenceStrength": 0.85,
  "priorityScore": 1,
  "priorityLevel": "high",
  "priorityReason": "Required skill has supporting evidence but is not fully satisfied"
}
```

React:

```json
{
  "skill": "React",
  "requirementType": "preferred",
  "matchType": "gap",
  "matchedWith": "JavaScript",
  "relatedSkill": true,
  "matchScore": 0,
  "satisfiesRequirement": false,
  "priorityScore": 0.5,
  "priorityLevel": "medium"
}
```

---

# 24. Current Project Status

## Completed

- [x] Backend foundation
- [x] Express API
- [x] Resume parsing
- [x] Resume skill extraction
- [x] Evidence/confidence preservation
- [x] ESCO skill dataset
- [x] ESCO occupation dataset
- [x] ESCO relations
- [x] GapWise role catalog
- [x] Technology taxonomy
- [x] JD technology extraction
- [x] JD section detection
- [x] Requirement classification
- [x] Skill unification
- [x] Exact matching
- [x] Partial matching
- [x] Generic related-skill handling
- [x] Gap prioritization
- [x] Dependency analysis
- [x] Readiness calculation
- [x] Personalized roadmap generation
- [x] Evidence-aware roadmap actions

---

# 25. Immediate Remaining Backend Work

Before starting the UI:

## Step 1 — Refine readiness

Improve:

```text
required coverage
preferred coverage
partial evidence
critical gaps
```

without introducing arbitrary AI scoring.

---

## Step 2 — Backend edge-case testing

Test:

- empty resume
- empty JD
- no detected skills
- all skills matched
- no skills matched
- duplicate skills
- aliases
- mixed required/preferred sections
- multiple occurrences
- contradictory requirement signals
- rich candidate skill objects
- prerequisite chains
- unknown skills
- malformed input

---

## Step 3 — Evaluation dataset

Create labeled examples for:

```text
skill extraction
skill matching
requirement classification
```

Then calculate:

```text
Precision
Recall
F1
```

and ranking metrics where appropriate.

---

# 26. Future AI Layer

Only after deterministic evaluation.

Potential architecture:

```text
Deterministic matching
        +
Taxonomy relationships
        +
Evidence
        +
Embeddings
        +
LLM reasoning
```

Embeddings can improve semantic matching.

Example:

```text
"RESTful API development"
```

vs

```text
"building REST APIs"
```

LLM can help with:

- ambiguous skill interpretation
- resume evidence interpretation
- natural-language explanations
- personalized roadmap explanations
- conversational interaction

LLM should NOT blindly replace the deterministic core.

---

# 27. Embedding Evaluation

Eventually compare:

```text
Keyword matching
        vs
TF-IDF
        vs
Embedding similarity
        vs
Hybrid approach
```

Evaluate using labeled examples.

Possible hybrid:

```text
Exact match
+
Taxonomy relation
+
Semantic similarity
+
Evidence confidence
+
Requirement importance
```

Weights should eventually be learned/calibrated rather than arbitrarily chosen.

---

# 28. Long Conversation / Chatbot Architecture

The chatbot must not rely on sending the entire conversation every time.

Use:

```text
Recent messages
      +
Conversation summary
      +
Relevant retrieved context
      +
Structured project state
```

Structured state should include:

```text
candidate profile
target role
target job
detected skills
confirmed skills
gaps
roadmap
user decisions
previous recommendations
```

The database is the source of truth.

The chatbot is an interaction layer.

---

# 29. Personalized Roadmap Vision

Eventually roadmap generation should consider:

```text
skill importance
skill gap severity
dependency graph
candidate evidence
candidate current skills
learning efficiency
time available
target role
```

Potential future question:

> "I have 6 weeks before applying. What should I learn first?"

GapWise should solve this as an optimization problem rather than simply listing missing skills.

---

# 30. Project Recommendation Vision

For a missing skill, GapWise should eventually recommend projects that provide evidence for that skill.

Example:

```text
Gap:
SQL

Candidate already knows:
PostgreSQL

Recommended:
Build an analytics dashboard using PostgreSQL
```

The project should strengthen the skill and create resume evidence.

---

# 31. UI Direction

The UI has NOT been built yet.

It should NOT look like:

```text
generic AI SaaS
purple gradients
random glowing cards
"AI-powered" everywhere
```

Desired direction:

```text
premium
clean
technical
smooth
data-rich
animated but purposeful
```

Potential dashboard:

```text
┌─────────────────────────────────────────────┐
│ GapWise                     Target: Backend  │
├─────────────────────────────────────────────┤
│                                             │
│        Job Readiness                        │
│             57%                             │
│                                             │
│  Required Skills                            │
│  ████████████░░░░                          │
│                                             │
├─────────────────────────────────────────────┤
│ Critical Gaps                               │
│                                             │
│ SQL                         HIGH             │
│ Partial evidence                              │
│                                             │
│ React                       MEDIUM           │
│ Missing                                      │
├─────────────────────────────────────────────┤
│ Personalized Roadmap                        │
│                                             │
│ 01 → SQL                                    │
│ 02 → React                                  │
└─────────────────────────────────────────────┘
```

UI should be driven by actual backend data.

Do not build fake visualizations.

---

# 32. Important Architectural Rules

The next developer/LLM MUST follow these rules.

### Rule 1

Inspect existing code before modifying it.

### Rule 2

Do not rewrite working architecture unnecessarily.

### Rule 3

Do not add O*NET unless there is a strong future reason.

### Rule 4

Do not replace deterministic matching with an LLM.

### Rule 5

Do not introduce arbitrary thresholds.

### Rule 6

Do not assume related skills satisfy requirements.

### Rule 7

Preserve candidate evidence throughout the pipeline.

### Rule 8

Do not treat ESCO as a modern SDE job checklist.

### Rule 9

Do not start UI work until backend behavior is sufficiently stable.

### Rule 10

Prefer small, testable changes.

### Rule 11

After each significant change:

```text
modify
→ restart server
→ test endpoint
→ inspect output
→ only then continue
```

### Rule 12

Do not add complexity just to make the project appear "AI".

Every AI component should solve a measurable problem.

---

# 33. Current Development Philosophy

GapWise should evolve in this order:

```text
Correctness
   ↓
Structured data
   ↓
Explainability
   ↓
Evaluation
   ↓
Semantic intelligence
   ↓
LLM intelligence
   ↓
UX polish
```

Not:

```text
LLM
↓
pretty UI
↓
random scores
↓
hope it works
```

---

# 34. Master Roadmap

## Phase 1 — Foundation

- [x] Backend
- [x] APIs
- [x] Resume parsing
- [x] ESCO
- [x] Role catalog

## Phase 2 — Intelligence

- [x] JD extraction
- [x] Skill normalization
- [x] Matching
- [x] Gap detection
- [x] Prioritization
- [x] Dependencies
- [x] Readiness
- [x] Roadmap

## Phase 3 — Validation

- [ ] Readiness refinement
- [ ] Edge-case tests
- [ ] Labeled evaluation dataset
- [ ] Precision/Recall/F1
- [ ] Matching benchmark
- [ ] Extraction benchmark

## Phase 4 — Semantic AI

- [ ] Python AI service
- [ ] Embeddings
- [ ] Semantic matching
- [ ] Hybrid matching
- [ ] Threshold calibration

## Phase 5 — Generative Intelligence

- [ ] LLM integration
- [ ] Evidence explanations
- [ ] Personalized recommendations
- [ ] Long-chat context management
- [ ] Structured memory

## Phase 6 — Frontend

- [ ] React application
- [ ] Landing page
- [ ] Resume upload
- [ ] JD input
- [ ] Analysis dashboard
- [ ] Skill gap visualization
- [ ] Readiness visualization
- [ ] Roadmap
- [ ] Evidence views
- [ ] Chat interface

## Phase 7 — Production

- [ ] Frontend deployment
- [ ] Backend deployment
- [ ] AI service deployment
- [ ] Database
- [ ] Authentication if required
- [ ] Error handling
- [ ] Logging
- [ ] Monitoring
- [ ] Documentation

---

# 35. Current Position

The project is currently here:

```text
                    GAPWISE
                       │
                       ▼
              Backend Intelligence
                       │
       ┌───────────────┴───────────────┐
       │                               │
    Resume                            JD
       │                               │
       ▼                               ▼
    Skills                        Requirements
       │                               │
       └──────────────┬────────────────┘
                      ▼
                  Matching
                      │
                      ▼
                  Gap Engine
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
      Priority    Dependency   Readiness
          │           │           │
          └───────────┼───────────┘
                      ▼
                   Roadmap
                      │
                      ▼
             CURRENT POSITION
```

The next immediate task is **readiness refinement**, followed by backend testing/evaluation.

**Do not jump directly to UI.**

---

# 36. Handoff Instruction

If this document is being given to another LLM/developer:

1. Inspect the GitHub repository.
2. Read this file.
3. Inspect the actual current source code.
4. Verify the documented architecture against the repository.
5. Do not assume this document is newer than the code.
6. If code and documentation disagree, inspect recent commits and actual behavior.
7. Continue from the "Current Position" section.
8. Work one logical step at a time.
9. Explain why a change is needed before implementing it.
10. Test every backend modification.

The objective is to **continue GapWise**, not redesign it from scratch.