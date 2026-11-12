import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGapWise } from "../context/useGapWise";
import "./ResultsDashboard.css";
import AIRoadmapPanel from "./AIRoadmapPanel";

const STATUS = {
  demonstrated: { label: "Demonstrated", symbol: "✓" },
  partial: { label: "Partial evidence", symbol: "◐" },
  not_demonstrated: { label: "Not demonstrated", symbol: "—" },
};

function statusOf(item) {
  if (["demonstrated", "partial", "not_demonstrated"].includes(item?.evidenceStatus)) return item.evidenceStatus;
  if (item?.satisfiesRequirement) return "demonstrated";
  if (item?.relatedSkill || (item?.matchScore > 0 && item?.matchScore < 1)) return "partial";
  return "not_demonstrated";
}

function uniqueItems(items) {
  const seen = new Set();
  return items.filter((item, index) => {
    const id = item?.canonicalSkillId || `${item?.skill || "requirement"}:${item?.requirementType || "required"}:${index}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function getExcerpts(item) {
  const details = Array.isArray(item?.evidenceDetails) ? item.evidenceDetails : [];
  const structured = details.filter(d => typeof d?.excerpt === "string" && d.excerpt.trim());
  if (structured.length) return structured.slice(0, 3);
  const raw = Array.isArray(item?.candidateEvidence) ? item.candidateEvidence : [];
  return raw.filter(e => typeof e === "string" && e.trim()).slice(0, 3).map(excerpt => ({ excerpt, source: "resume" }));
}

function CoverageGauge({ value, label, description, emphasized = false }) {
  const valid = Number.isFinite(value);
  const percent = valid ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className={`gw-result-gauge ${emphasized ? "is-primary" : ""}`}>
      <div className="gw-gauge-top">
        <span className="gw-label">{label}</span>
        <span className="gw-gauge-number">{valid ? `${Math.round(percent)}%` : "N/A"}</span>
      </div>
      <div className="gw-gauge-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={valid ? percent : undefined} aria-valuetext={valid ? `${Math.round(percent)} percent` : "Not available"}>
        <div className="gw-gauge-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="gw-muted">{description}</p>
    </div>
  );
}

function RequirementCard({ item }) {
  const status = statusOf(item);
  const info = STATUS[status];
  const excerpts = getExcerpts(item);
  return (
    <article className="gw-requirement">
      <div className="gw-requirement-top">
        <div className="gw-requirement-title">
          <span className={`gw-status gw-status-${status}`} aria-hidden="true">{info.symbol}</span>
          <div>
            <h3>{item.skill || item.canonicalName || "Requirement"}</h3>
            <p className="gw-requirement-sub">{item.requirementType === "preferred" ? "Preferred" : "Required"} · {info.label}</p>
          </div>
        </div>
        <span className={`gw-status-pill gw-pill-${status}`}>{info.label}</span>
      </div>
      {excerpts.length > 0 ? (
        <details className="gw-evidence">
          <summary>View supporting resume evidence <span>({excerpts.length})</span></summary>
          <div className="gw-evidence-content">
            {excerpts.map((entry, index) => (
              <blockquote key={`${index}-${entry.excerpt}`}>
                <span className="gw-evidence-source">{entry.project || entry.source || "Resume"}</span>
                <p>{entry.excerpt}</p>
              </blockquote>
            ))}
          </div>
        </details>
      ) : <p className="gw-no-evidence">No qualifying resume evidence identified.</p>}
    </article>
  );
}

function RoadmapCard({ item, index }) {
  const actions = Array.isArray(item.actions) ? item.actions.filter(x => typeof x === "string" && x.trim()) : [];
  const guidance = !actions.length && typeof item.guidance === "string" ? [item.guidance] : actions;
  return (
    <article className="gw-roadmap-item">
      <span className="gw-roadmap-number">{String(index + 1).padStart(2, "0")}</span>
      <div className="gw-roadmap-body">
        <div className="gw-roadmap-heading">
          <h3>{item.skill || "Improvement area"}</h3>
          {item.priority && <span className="gw-priority">{item.priority} priority</span>}
        </div>
        <p className="gw-muted">{item.evidenceStatus === "partial" ? "Strengthen existing evidence" : item.type === "evidence-strengthening" ? "Add a concrete example" : "Check and develop this competency"}</p>
        {guidance.length > 0 && <ul>{guidance.map((action, i) => <li key={`${i}-${action}`}>{action}</li>)}</ul>}
      </div>
    </article>
  );
}

export default function ResultsPlaceholder() {
  const navigate = useNavigate();
  const { analysis, jobProfile } = useGapWise();
  const [filter, setFilter] = useState("all");
  const [group, setGroup] = useState("required");
  const [showFullRoadmap, setShowFullRoadmap] = useState(false);

  const requirements = useMemo(() => uniqueItems([
    ...(Array.isArray(analysis?.matches) ? analysis.matches : []),
    ...(Array.isArray(analysis?.gaps) ? analysis.gaps : []),
  ]), [analysis]);

  if (!analysis) {
    return (
      <main className="gw-results gw-empty-results">
        <div className="gw-empty-panel">
          <span className="gw-kicker">GAPWISE / RESULTS</span>
          <h1>No analysis yet.</h1>
          <p>Upload a resume and select a target role to see an evidence-based assessment.</p>
          <button className="gw-button gw-button-primary" onClick={() => navigate("/upload")}>Start analysis <span aria-hidden="true">↗</span></button>
        </div>
      </main>
    );
  }

  const readiness = analysis.readiness || {};
  const summary = readiness.summary || {};
  const unresolved = Array.isArray(analysis.unresolvedRequirements) ? analysis.unresolvedRequirements : [];
  const incomplete = unresolved.length > 0 || readiness.score == null;
  const score = !incomplete && Number.isFinite(readiness.score) ? readiness.score : null;
  const required = requirements.filter(item => item.requirementType !== "preferred");
  const preferred = requirements.filter(item => item.requirementType === "preferred");
  const current = group === "required" ? required : preferred;
  const filtered = current.filter(item => filter === "all" || statusOf(item) === filter);
  const requiredDemonstrated = required.filter(item => statusOf(item) === "demonstrated").length;
  const preferredDemonstrated = preferred.filter(item => statusOf(item) === "demonstrated").length;
  const allPartial = requirements.filter(item => statusOf(item) === "partial").length;
  const allAbsent = requirements.filter(item => statusOf(item) === "not_demonstrated").length;
  const derivedCoverage = (items) => items.length ? Math.round(100 * items.filter(item => statusOf(item) === "demonstrated").length / items.length) : null;
  const requiredCoverage = Number.isFinite(summary.requiredCoverage) ? summary.requiredCoverage : derivedCoverage(required);
  const preferredCoverage = Number.isFinite(summary.preferredCoverage) ? summary.preferredCoverage : derivedCoverage(preferred);
  const roadmap = Array.isArray(analysis.roadmap) ? analysis.roadmap : [];
  const visibleRoadmap = showFullRoadmap ? roadmap : roadmap.slice(0, 3);
  const assessmentType = jobProfile?.assessment?.type === "gapwise-custom-jd" ? "Custom job description" : "Career role assessment";
  const roleName = jobProfile?.title || "Selected role";

  return (
    <main className="gw-results">
      <header className="gw-results-header">
        <button className="gw-wordmark" onClick={() => navigate("/")} aria-label="GapWise home"><span className="gw-wordmark-icon">↗</span> GapWise</button>
        <div className="gw-header-right"><span className="gw-header-step">03 / 03 &nbsp; ANALYSIS</span><button className="gw-header-link" onClick={() => navigate("/job")}>Change target <span aria-hidden="true">↗</span></button></div>
      </header>

      <div className="gw-results-main">
        <section className="gw-results-intro">
          <div><div className="gw-kicker"><span className="gw-kicker-dot" /> YOUR EVIDENCE REPORT IS READY</div><h1>Your skills, <span>in perspective.</span></h1><p>See where your resume provides evidence, what remains unclear, and where to focus next.</p></div>
          <div className="gw-target-tag"><span>ASSESSING FOR</span><strong>{roleName}</strong><small>{assessmentType}{jobProfile?.company ? ` · ${jobProfile.company}` : ""}</small></div>
        </section>

        {incomplete && (
          <section className="gw-review-banner" role="status">
            <span className="gw-review-symbol" aria-hidden="true">!</span>
            <div><strong>Assessment incomplete</strong><p>{unresolved.length ? `${unresolved.length} job description clause${unresolved.length === 1 ? " requires" : "s require"} review. The overall score is withheld; recognized requirements are shown separately.` : "An overall coverage score is unavailable for this analysis."}</p></div>
            {unresolved.length > 0 && <a href="#gw-review">Review clauses <span aria-hidden="true">↘</span></a>}
          </section>
        )}

        <section className="gw-overview" aria-label="Coverage overview">
          <div className="gw-overview-primary">
            <div className="gw-overview-heading"><span>01 &nbsp; / &nbsp; GAPWISE EVIDENCE COVERAGE</span><span className="gw-overview-dot" /></div>
            <div className="gw-overview-hero"><strong>{score === null ? "N/A" : `${Math.round(score)}%`}</strong><div><span>{score === null ? "Evidence coverage unavailable" : "GapWise Evidence Coverage"}</span><p>{score === null ? "Some requirements need review or the score is unavailable." : `${requiredDemonstrated} of ${required.length} recognized required requirements demonstrated.`}</p></div></div>
            <p className="gw-overview-disclaimer">Percentage of required competencies supported by resume evidence — not a hiring probability or verified ability.</p>
          </div>
          <div className="gw-overview-side">
            <CoverageGauge value={requiredCoverage} label="Required requirements" description={`${requiredDemonstrated} of ${required.length} demonstrated`} emphasized />
            <CoverageGauge value={preferredCoverage} label="Preferred requirements" description={`${preferredDemonstrated} of ${preferred.length} demonstrated`} />
          </div>
        </section>

        <section className="gw-counts" aria-label="Evidence status counts">
          <div><span className="gw-count-icon gw-count-green">✓</span><strong>{requirements.length - allPartial - allAbsent}</strong><p>Demonstrated</p></div>
          <div><span className="gw-count-icon gw-count-amber">◐</span><strong>{allPartial}</strong><p>Partial evidence</p></div>
          <div><span className="gw-count-icon gw-count-gray">—</span><strong>{allAbsent}</strong><p>Not demonstrated</p></div>
          <div><span className="gw-count-icon gw-count-review">?</span><strong>{unresolved.length}</strong><p>Needs review</p></div>
        </section>

        <section className="gw-section gw-requirements-section" id="gw-requirements">
          <div className="gw-section-heading"><div><span className="gw-kicker">02 / EVIDENCE BREAKDOWN</span><h2>What your resume shows<span className="gw-period">.</span></h2><p>Explore how each requirement was assessed. Open a card to see the resume excerpts behind it.</p></div></div>
          <div className="gw-requirement-toolbar">
            <div className="gw-tabbar" role="group" aria-label="Requirement importance">
              <button className={group === "required" ? "active" : ""} aria-pressed={group === "required"} onClick={() => {setGroup("required");setFilter("all");}}>Required <span>{required.length}</span></button>
              <button className={group === "preferred" ? "active" : ""} aria-pressed={group === "preferred"} onClick={() => {setGroup("preferred");setFilter("all");}}>Preferred <span>{preferred.length}</span></button>
            </div>
            <label className="gw-filter-label">Show <select value={filter} onChange={event => setFilter(event.target.value)} aria-label="Filter evidence status"><option value="all">All evidence</option><option value="demonstrated">Demonstrated</option><option value="partial">Partial evidence</option><option value="not_demonstrated">Not demonstrated</option></select></label>
          </div>
          <div className="gw-requirement-list">{filtered.length ? filtered.map((item, index) => <RequirementCard key={`${item.canonicalSkillId || item.skill}-${index}`} item={item} />) : <div className="gw-empty-list">No requirements match this filter.</div>}</div>
        </section>

        {unresolved.length > 0 && <section className="gw-section" id="gw-review"><div className="gw-section-heading"><div><span className="gw-kicker">03 / NEEDS REVIEW</span><h2>Requirements to clarify<span className="gw-period">.</span></h2><p>These clauses are not included in the recognized requirement counts or coverage figures.</p></div></div><div className="gw-review-list">{unresolved.map((item,index)=><article key={`${index}-${item.excerpt}`}><span className="gw-review-index">{String(index+1).padStart(2,"0")}</span><div><strong>{item.excerpt || "Unrecognized requirement"}</strong><p>{item.reason ? item.reason.replaceAll("-", " ") : "Requires manual review"} · {item.requirementType || "Importance unclear"}</p></div></article>)}</div></section>}

        <section className="gw-section gw-roadmap-section" id="gw-roadmap">
          <div className="gw-section-heading"><div><span className="gw-kicker">{unresolved.length ? "04" : "03"} / NEXT STEPS</span><h2>Your improvement roadmap<span className="gw-period">.</span></h2><p>Your top priorities, selected from requirements not yet fully demonstrated. Open the complete plan whenever you need it.</p></div></div>
          {roadmap.length ? <>
            <div className="gw-roadmap-list">{visibleRoadmap.map((item,index)=><RoadmapCard item={item} index={index} key={`${index}-${item.skill}`} />)}</div>
            {roadmap.length > 3 && <div className="gw-roadmap-more">
              <span>{showFullRoadmap ? `Showing all ${roadmap.length} actions` : `Showing 3 of ${roadmap.length} priority actions`}</span>
              <button type="button" aria-expanded={showFullRoadmap} aria-controls="gw-roadmap" onClick={() => setShowFullRoadmap(current => !current)}>{showFullRoadmap ? "Show top 3 only ↑" : `View full roadmap (${roadmap.length}) ↓`}</button>
            </div>}
          </> : <div className="gw-empty-list">No improvement actions were generated for the assessed requirements.</div>}
        </section>

        <AIRoadmapPanel hasGaps={roadmap.length > 0} />

        <section className="gw-method-note"><span className="gw-method-mark">i</span><div><strong>How to read this report</strong><p>“Demonstrated” means the resume contains qualifying evidence under the current rules; it is not independent verification. Partial and missing evidence may reflect gaps in documentation rather than gaps in ability. Only fully demonstrated required requirements contribute to the primary coverage score.</p><small>Assessment ruleset: {analysis.assessmentVersion || readiness.evidenceRulesetVersion || "Not specified"} · {readiness.validationStatus || "Not externally validated"}</small></div></section>

        <div className="gw-results-footer"><button className="gw-button gw-button-secondary" onClick={() => navigate("/job")}>← Change target role</button><button className="gw-button gw-button-primary" onClick={() => navigate("/upload")}>Analyze another resume <span aria-hidden="true">↗</span></button></div>
      </div>
    </main>
  );
}
