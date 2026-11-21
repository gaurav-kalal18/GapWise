
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../services/api";
import "./MyProgress.css";

function formatDate(value) {
  if (!value) return "Date unavailable";

  const normalized =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
      ? `${value.replace(" ", "T")}Z`
      : value;

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isScore(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function formatScore(value) {
  return isScore(value)
    ? `${Math.round(value * 100) / 100}%`
    : "N/A";
}

function formatChange(value) {
  if (!isScore(value)) return "N/A";

  const rounded = Math.round(value * 100) / 100;

  return `${rounded > 0 ? "+" : ""}${rounded} pp`;
}

function changeClass(value) {
  if (!isScore(value)) return "";

  if (value > 0) return "positive";
  if (value < 0) return "negative";

  return "neutral";
}

function MetricCard({ label, value, detail, tone = "" }) {
  return (
    <article className="gw-progress-metric">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function ProgressChart({ points }) {
  const width = 760;
  const height = 280;

  const left = 47;
  const right = 22;
  const top = 22;
  const bottom = 43;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const plotted = useMemo(() => {
    return points.map((point, index) => {
      const x =
        left +
        (points.length === 1
          ? chartWidth / 2
          : (index / (points.length - 1)) *
            chartWidth);

      const y = isScore(point.score)
        ? top +
          chartHeight -
          (point.score / 100) * chartHeight
        : null;

      return {
        ...point,
        x,
        y,
      };
    });
 }, [points, chartWidth, chartHeight]);

  const lineSegments = useMemo(() => {
    const segments = [];
    let current = [];

    for (const point of plotted) {
      if (point.y === null) {
        if (current.length >= 2) {
          segments.push(current);
        }

        current = [];
        continue;
      }

      current.push(point);
    }

    if (current.length >= 2) {
      segments.push(current);
    }

    return segments;
  }, [plotted]);

  if (!points.length) {
    return (
      <p className="gw-progress-chart-empty">
        No historical assessments available.
      </p>
    );
  }

  const scoredCount = points.filter(
    point => isScore(point.score)
  ).length;

  return (
    <div className="gw-progress-chart-wrap">
      <svg
        className="gw-progress-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Historical resume evidence coverage chart. The detailed report values are also listed below."
      >
        {[0, 25, 50, 75, 100].map(value => {
          const y =
            top +
            chartHeight -
            (value / 100) * chartHeight;

          return (
            <g key={value}>
              <line
                x1={left}
                y1={y}
                x2={width - right}
                y2={y}
                stroke="#e6eee8"
                strokeWidth="1"
              />

              <text
                x={left - 10}
                y={y + 4}
                fill="#7e8f83"
                fontSize="11"
                textAnchor="end"
              >
                {value}%
              </text>
            </g>
          );
        })}

        {lineSegments.map((segment, index) => (
          <polyline
            key={index}
            points={segment
              .map(point => `${point.x},${point.y}`)
              .join(" ")}
            fill="none"
            stroke="#188552"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {plotted.map((point, index) => (
          <g key={point.reportId || index}>
            {point.y !== null && (
              <>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill="#188552"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />

                <text
                  x={point.x}
                  y={
                    point.y < top + 25
                      ? point.y + 23
                      : point.y - 14
                  }
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="#176f46"
                >
                  {formatScore(point.score)}
                </text>
              </>
            )}

            <text
              x={point.x}
              y={height - 15}
              textAnchor="middle"
              fill="#728579"
              fontSize="11"
            >
              {points.length <= 10 ||
              index === 0 ||
              index === points.length - 1 ||
              index % Math.ceil(points.length / 8) === 0
                ? `V${index + 1}`
                : ""}
            </text>
          </g>
        ))}
      </svg>

      {scoredCount === 0 && (
        <p className="gw-progress-chart-note">
          Overall evidence coverage is unavailable
          for these assessments.
        </p>
      )}

      {scoredCount > 0 &&
        scoredCount < points.length && (
          <p className="gw-progress-chart-note">
            Some assessments have unavailable scores.
            Missing values are not plotted as zero.
          </p>
        )}
    </div>
  );
}

function AssessmentRow({ point, index, navigate }) {
  const delta = point.changeFromPreviousPercentagePoints;

  return (
    <div className="gw-progress-history-row">
      <div className="gw-progress-history-version">
        <div className="gw-progress-version-number">
          {index + 1}
        </div>

        <div>
          <strong>
            {point.resumeLabel || "Untitled resume"}
          </strong>

          <small>{formatDate(point.createdAt)}</small>
        </div>
      </div>

      <div className="gw-progress-history-score">
        <strong>{formatScore(point.score)}</strong>

        <span className={changeClass(delta)}>
          {isScore(delta)
            ? `${formatChange(delta)} vs previous`
            : index === 0
              ? "Baseline"
              : "Change unavailable"}
        </span>
      </div>

      <button
        type="button"
        className="gw-progress-view-report"
        onClick={() =>
          navigate(
            `/reports/${encodeURIComponent(
              point.reportId
            )}/view`
          )
        }
      >
        View report ↗
      </button>
    </div>
  );
}

export default function MyProgress() {
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProgress() {
      setStatus("loading");
      setError("");

      try {
        const response = await API.get("/progress", {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const progress = response.data?.progress;

        if (
          !progress ||
          !Array.isArray(progress.timelines)
        ) {
          throw new Error(
            "Invalid progress history response."
          );
        }

        setData(progress);
        setSelectedSeries(0);
        setStatus("success");
      } catch (err) {
        if (controller.signal.aborted) return;

        setStatus("error");

        setError(
          err.response?.status === 401
            ? "Your session has expired. Please sign in again."
            : err.response?.data?.message ||
              err.message ||
              "Unable to load your progress history."
        );
      }
    }

    loadProgress();

    return () => controller.abort();
  }, [reloadKey]);

  const timelines = data?.timelines || [];
  const timeline = timelines[selectedSeries] || null;

  const points = timeline?.points || [];

  const firstPoint = points[0] || null;
  const latestPoint = points[points.length - 1] || null;

  const showDashboard =
    status === "success" && timeline !== null;

  return (
    <main className="gw-progress-page">
      {/* NAVBAR */}
      <header className="gw-progress-navbar">
        <button
          type="button"
          className="gw-progress-brand"
          onClick={() => navigate("/")}
        >
          <span>↗</span> GapWise
        </button>

        <button
          type="button"
          className="gw-progress-back"
          onClick={() => navigate("/workspace")}
        >
          ← My Workspace
        </button>
      </header>

      <div className="gw-progress-container">
        {/* PAGE HEADING */}
        <section className="gw-progress-heading">
          <div>
            <span className="gw-progress-eyebrow">
              YOUR WORKSPACE / HISTORICAL PROGRESS
            </span>

            <h1>
              My Progress<span>.</span>
            </h1>

            <p>
              Track how your documented resume evidence
              changes across saved assessments.
            </p>
          </div>

          <button
            type="button"
            className="gw-progress-new"
            onClick={() => navigate("/upload")}
          >
            + New Analysis
          </button>
        </section>

        {/* OVERALL ACCOUNT STATISTICS */}
        <section className="gw-progress-overview">
          <div className="gw-progress-overview-item">
            <span>SAVED ASSESSMENTS</span>

            <strong>
              {status === "success"
                ? data.totalReports
                : "—"}
            </strong>

            <small>Reports in your account</small>
          </div>

          <div className="gw-progress-overview-item">
            <span>ANALYZED TARGETS</span>

            <strong>
              {status === "success"
                ? data.totalTargets
                : "—"}
            </strong>

            <small>Roles and job descriptions</small>
          </div>

          <div className="gw-progress-overview-item">
            <span>COMPATIBLE TIMELINES</span>

            <strong>
              {status === "success"
                ? data.totalSeries
                : "—"}
            </strong>

            <small>Grouped by assessment rules</small>
          </div>
        </section>

        {/* LOADING */}
        {status === "loading" && (
          <section
            className="gw-progress-state"
            role="status"
          >
            <div className="gw-progress-spinner" />

            <h2>Loading your progress...</h2>

            <p>
              Retrieving your saved assessments.
            </p>
          </section>
        )}

        {/* ERROR */}
        {status === "error" && (
          <section
            className="gw-progress-state"
            role="alert"
          >
            <h2>Unable to load progress</h2>

            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                setReloadKey(value => value + 1)
              }
            >
              Try again
            </button>
          </section>
        )}

        {/* NO SAVED REPORTS */}
        {status === "success" &&
          timelines.length === 0 && (
            <section className="gw-progress-state">
              <div className="gw-progress-empty-icon">
                ↗
              </div>

              <h2>Your progress starts here.</h2>

              <p>
                Save your first resume assessment
                to begin tracking historical evidence.
              </p>

              <button
                type="button"
                onClick={() => navigate("/upload")}
              >
                Start an analysis →
              </button>
            </section>
          )}

        {/* REAL PROGRESS DASHBOARD */}
        {showDashboard && (
          <>
            {/* TARGET SELECTOR */}
            <section className="gw-progress-target-section">
              <div>
                <span className="gw-progress-section-eyebrow">
                  TARGET-SPECIFIC TRACKING
                </span>

                <h2>Evidence coverage timeline</h2>

                <p>
                  Only assessments with compatible
                  targets and scoring rules are grouped.
                </p>
              </div>

              <div className="gw-progress-target-control">
                <label htmlFor="gw-progress-target">
                  SELECT ASSESSMENT TIMELINE
                </label>

                <select
                  id="gw-progress-target"
                  value={selectedSeries}
                  onChange={event =>
                    setSelectedSeries(
                      Number(event.target.value)
                    )
                  }
                >
                  {timelines.map((series, index) => (
                    <option
                      key={series.id || index}
                      value={index}
                    >
                      {series.targetName} · {series.assessmentVersion}
                      {" · "}{series.reportCount} report(s)
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* SELECTED TARGET */}
            <section className="gw-progress-target-info">
              <div>
                <span className="gw-progress-target-type">
                  {timeline.targetType === "jd"
                    ? "Custom job description"
                    : "Career role"}
                </span>

                <h2>{timeline.targetName}</h2>

                <p>
                  {timeline.reportCount} saved assessment
                  {timeline.reportCount === 1 ? "" : "s"}
                  {" · "}
                  {timeline.requiredCount} required
                  competencies
                  {" · "}
                  Assessment version:{" "}
                  {timeline.assessmentVersion}
                </p>
              </div>
            </section>

            {/* COVERAGE METRICS */}
            <section className="gw-progress-metrics">
              <MetricCard
                label="FIRST COVERAGE"
                value={formatScore(timeline.firstScore)}
                detail={
                  firstPoint
                    ? formatDate(firstPoint.createdAt)
                    : "No assessments"
                }
              />

              <MetricCard
                label="LATEST COVERAGE"
                value={formatScore(timeline.latestScore)}
                detail={
                  latestPoint
                    ? formatDate(latestPoint.createdAt)
                    : "No assessments"
                }
              />

              <MetricCard
                label="NET COVERAGE CHANGE"
                value={formatChange(
                  timeline.netChangePercentagePoints
                )}
                detail={
                  timeline.reportCount < 2
                    ? "Save another comparable report"
                    : "First to latest assessment"
                }
                tone={changeClass(
                  timeline.netChangePercentagePoints
                )}
              />
            </section>

            {/* CHART */}
            <section className="gw-progress-chart-section">
              <div className="gw-progress-section-header">
                <div>
                  <span className="gw-progress-section-eyebrow">
                    HISTORICAL TREND
                  </span>

                  <h2>Evidence over time</h2>
                </div>

                <span className="gw-progress-chart-legend">
                  <span />
                  Required evidence coverage
                </span>
              </div>

              <ProgressChart points={points} />

              <p className="gw-progress-chart-caption">
                Each point represents one saved
                assessment. Changes are measured in
                percentage points, not verified skill
                growth or hiring probability.
              </p>
            </section>

            {/* REPORT HISTORY */}
            <section className="gw-progress-history">
              <div className="gw-progress-section-header">
                <div>
                  <span className="gw-progress-section-eyebrow">
                    SAVED RESUME VERSIONS
                  </span>

                  <h2>Assessment history</h2>
                </div>

                <button
                  type="button"
                  className="gw-progress-all-reports"
                  onClick={() => navigate("/reports")}
                >
                  All reports ↗
                </button>
              </div>

              <div className="gw-progress-history-list">
                {points.map((point, index) => (
                  <AssessmentRow
                    key={point.reportId}
                    point={point}
                    index={index}
                    navigate={navigate}
                  />
                ))}
              </div>
            </section>

            <p className="gw-progress-disclaimer">
              GapWise tracks evidence documented in
              saved resumes. Different targets,
              competency sets, or assessment rules
              appear in separate timelines to avoid
              misleading comparisons.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
