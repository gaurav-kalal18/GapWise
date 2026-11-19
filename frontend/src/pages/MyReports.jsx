
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../services/api";
import ReportComparisonPanel from "../components/ReportComparisonPanel";

import "./MyReports.css";

const PAGE_SIZE = 10;

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

function ReportCard({
  report,
  onView,
  onDelete,
  onSelect,
  selected,
  deleting,
  deletionInProgress,
}) {
  const isJD = report.targetType === "jd";
  const hasScore = Number.isFinite(report.score);

  return (
    <article
      className={`my-report-card ${
        selected ? "my-report-card-selected" : ""
      }`}
    >
      {/* REPORT CATEGORY AND DATE */}
      <div className="my-report-card-top">
        <span className="my-report-type">
          {isJD ? "Custom JD" : "Career role"}
        </span>

        <time className="my-report-date">
          {formatDate(report.createdAt)}
        </time>
      </div>

      {/* COMPARISON SELECTION */}
      <label className="my-report-select">
        <input
          type="checkbox"
          checked={selected}
          disabled={deletionInProgress}
          onChange={(event) =>
            onSelect(event.target.checked)
          }
        />

        <span>
          {selected
            ? "Selected for comparison"
            : "Select for comparison"}
        </span>
      </label>

      {/* TARGET INFORMATION */}
      <h2>
        {report.targetName || "Untitled assessment"}
      </h2>

      {report.company && (
        <p className="my-report-company">
          {report.company}
        </p>
      )}

      {/* RESUME VERSION */}
      <div className="my-report-resume">
        <span aria-hidden="true">▤</span>

        <span>
          {report.resumeLabel || "Untitled resume"}
        </span>
      </div>

      {/* COVERAGE INFORMATION */}
      <div className="my-report-card-bottom">
        <div>
          <strong>
            {hasScore
              ? `${Math.round(report.score)}%`
              : "N/A"}
          </strong>

          <small>
            {hasScore
              ? "Required evidence coverage"
              : "Overall coverage unavailable"}
          </small>
        </div>

        <span className="my-report-saved-label">
          Saved report ✓
        </span>
      </div>

      {/* REPORT ACTIONS */}
      <div className="my-report-actions">
        <button
          type="button"
          className="my-report-view-button"
          onClick={onView}
          disabled={deletionInProgress}
          aria-label={`View saved report for ${
            report.targetName || "this assessment"
          }`}
        >
          View full report
          <span aria-hidden="true">↗</span>
        </button>

        <button
          type="button"
          className="my-report-delete-button"
          onClick={onDelete}
          disabled={deletionInProgress}
          aria-label={`Delete saved report for ${
            report.targetName || "this assessment"
          }`}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </article>
  );
}

export default function MyReports() {
  const navigate = useNavigate();

  // REPORT HISTORY STATE
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // DELETION STATE
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  // COMPARISON STATE
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionError, setSelectionError] = useState("");

  // FETCH REPORT HISTORY
  useEffect(() => {
    const controller = new AbortController();

    async function loadReports() {
      setStatus("loading");
      setError("");

      try {
        const response = await API.get("/reports", {
          params: {
            page,
            limit: PAGE_SIZE,
          },
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!Array.isArray(response.data?.reports)) {
          throw new Error(
            "Invalid report history response."
          );
        }

        setReports(response.data.reports);

        setPagination(
          response.data.pagination || {
            page,
            limit: PAGE_SIZE,
            total: response.data.reports.length,
            totalPages: 1,
          }
        );

        setStatus("success");
      } catch (err) {
        if (controller.signal.aborted) return;

        setStatus("error");

        setError(
          err.response?.status === 401
            ? "Your session has expired. Please sign in again."
            : err.response?.data?.message ||
              err.message ||
              "Unable to load saved reports."
        );
      }
    }

    loadReports();

    return () => controller.abort();
  }, [page, reloadKey]);

  // SELECT OR DESELECT REPORT FOR COMPARISON
  function handleSelect(reportId, checked) {
    setSelectionError("");

    if (!checked) {
      setSelectedIds(current =>
        current.filter(id => id !== reportId)
      );
      return;
    }

    if (selectedIds.includes(reportId)) {
      return;
    }

    if (selectedIds.length >= 2) {
      setSelectionError(
        "You can compare only two reports at a time. " +
        "Uncheck one before selecting another."
      );
      return;
    }

    setSelectedIds(current => [
      ...current,
      reportId,
    ]);
  }

  // CLEAR COMPARISON SELECTION
  function handleClearSelection() {
    setSelectedIds([]);
    setSelectionError("");
  }

  // PERMANENTLY DELETE SAVED REPORT
  async function handleDelete(report) {
    if (deletingId !== null) return;

    const confirmed = window.confirm(
      `Permanently delete your saved report for "${
        report.targetName || "this assessment"
      }"?\n\n` +
      `Resume: ${
        report.resumeLabel || "Untitled resume"
      }\n\n` +
      "This action cannot be undone."
    );

    if (!confirmed) return;

    setDeletingId(report.id);
    setDeleteError("");

    try {
      await API.delete(
        `/reports/${encodeURIComponent(report.id)}`,
        {
          headers: {
            "X-GapWise-Request": "1",
          },
        }
      );

      // Remove deleted report from comparison selection.
      setSelectedIds(current =>
        current.filter(id => id !== report.id)
      );

      setSelectionError("");

      // Reload report history after successful deletion.
      if (reports.length === 1 && page > 1) {
        setPage(current => current - 1);
      } else {
        setReloadKey(current => current + 1);
      }
    } catch (err) {
      setDeleteError(
        err.response?.status === 401
          ? "Your session has expired. Please sign in again."
          : err.response?.status === 404
            ? "This report no longer exists or is unavailable."
            : err.response?.data?.message ||
              "Unable to delete report. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const loading = status === "loading";
  const totalPages = pagination.totalPages || 0;

  return (
    <main className="my-reports-page">
      {/* NAVIGATION */}
      <header className="my-reports-navbar">
        <button
          type="button"
          className="my-reports-brand"
          onClick={() => navigate("/")}
        >
          <span>↗</span> GapWise
        </button>

        <button
          type="button"
          className="my-reports-back"
          onClick={() => navigate("/workspace")}
        >
          ← My Workspace
        </button>
      </header>

      <div className="my-reports-container">
        {/* PAGE HEADING */}
        <section className="my-reports-heading">
          <div>
            <span className="my-reports-eyebrow">
              YOUR WORKSPACE / ANALYSIS HISTORY
            </span>

            <h1>
              My Reports<span>.</span>
            </h1>

            <p>
              Revisit your saved assessments, compare
              resume versions, and track changes in
              your documented evidence.
            </p>
          </div>

          <button
            type="button"
            className="my-reports-new"
            onClick={() => navigate("/upload")}
          >
            + New Analysis
          </button>
        </section>

        {/* HISTORY OVERVIEW */}
        <section
          className="my-reports-overview"
          aria-label="Report history overview"
        >
          <div className="my-reports-stat">
            <span>TOTAL SAVED REPORTS</span>

            <strong>
              {status === "success"
                ? pagination.total
                : "—"}
            </strong>

            <small>
              Stored in your GapWise account
            </small>
          </div>

          <div className="my-reports-stat">
            <span>REPORTS ON THIS PAGE</span>

            <strong>
              {status === "success"
                ? reports.length
                : "—"}
            </strong>

            <small>
              Latest assessments first
            </small>
          </div>
        </section>

        {/* SAVED REPORTS */}
        <section className="my-reports-history">
          {/* DELETE ERROR */}
          {deleteError && (
            <div
              className="my-reports-delete-error"
              role="alert"
            >
              {deleteError}
            </div>
          )}

          <div className="my-reports-section-title">
            <div>
              <span>YOUR SAVED ANALYSES</span>
              <h2>Report history</h2>
            </div>
          </div>

          {/* LOADING */}
          {loading && (
            <div
              className="my-reports-state"
              role="status"
            >
              <div
                className="my-reports-spinner"
                aria-hidden="true"
              />

              <p>Loading your saved reports...</p>
            </div>
          )}

          {/* HISTORY ERROR */}
          {status === "error" && (
            <div
              className="my-reports-state"
              role="alert"
            >
              <h3>Unable to load reports</h3>
              <p>{error}</p>

              <button
                type="button"
                onClick={() =>
                  setReloadKey(current => current + 1)
                }
              >
                Try again
              </button>
            </div>
          )}

          {/* EMPTY HISTORY */}
          {status === "success" &&
            pagination.total === 0 && (
              <div className="my-reports-state">
                <span className="my-reports-empty-icon">
                  ▤
                </span>

                <h3>No saved reports yet.</h3>

                <p>
                  Analyze your resume, then choose
                  Save Report to keep the results here.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/upload")}
                >
                  Start your first analysis →
                </button>
              </div>
            )}

          {/* REPORT CARDS */}
          {status === "success" &&
            pagination.total > 0 && (
              <>
                {reports.length > 0 ? (
                  <div className="my-reports-grid">
                    {reports.map(report => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        selected={selectedIds.includes(
                          report.id
                        )}
                        onSelect={checked =>
                          handleSelect(report.id, checked)
                        }
                        onView={() =>
                          navigate(
                            `/reports/${encodeURIComponent(
                              report.id
                            )}/view`
                          )
                        }
                        onDelete={() =>
                          handleDelete(report)
                        }
                        deleting={
                          deletingId === report.id
                        }
                        deletionInProgress={
                          deletingId !== null
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="my-reports-state">
                    <h3>No reports on this page.</h3>

                    <p>
                      Return to the first page to
                      see your saved analyses.
                    </p>

                    <button
                      type="button"
                      onClick={() => setPage(1)}
                    >
                      First page
                    </button>
                  </div>
                )}

                {/* PAGINATION */}
                {totalPages > 1 && (
                  <nav
                    className="my-reports-pagination"
                    aria-label="Report history pages"
                  >
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() =>
                        setPage(current => current - 1)
                      }
                    >
                      ← Previous
                    </button>

                    <span>
                      Page {page} of {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage(current => current + 1)
                      }
                    >
                      Next →
                    </button>
                  </nav>
                )}
              </>
            )}
        </section>

        {/* HISTORICAL COMPARISON */}
        {status === "success" &&
          pagination.total > 0 && (
            <>
              {selectionError && (
                <p
                  className="my-reports-selection-error"
                  role="alert"
                >
                  {selectionError}
                </p>
              )}

              <ReportComparisonPanel
                key={selectedIds.join(":")}
                firstId={selectedIds[0] || null}
                secondId={selectedIds[1] || null}
                onClear={handleClearSelection}
              />
            </>
          )}
      </div>
    </main>
  );
}
