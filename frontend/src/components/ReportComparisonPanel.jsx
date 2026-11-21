
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../services/api";
import "./ReportComparisonPanel.css";

const STATUS_LABELS = {
  demonstrated: "Demonstrated",
  partial: "Partial evidence",
  not_demonstrated: "Not demonstrated",
};

function Score({ value }) {
  return (
    <strong className="gw-compare-score">
      {Number.isFinite(value)
        ? `${Math.round(value)}%`
        : "N/A"}
    </strong>
  );
}

function Delta({ value }) {
  if (!Number.isFinite(value)) {
    return (
      <span className="gw-compare-delta">
        Change unavailable
      </span>
    );
  }

  const sign = value > 0 ? "+" : "";

  return (
    <span
      className={`gw-compare-delta ${
        value > 0
          ? "positive"
          : value < 0
            ? "negative"
            : ""
      }`}
    >
      {sign}{value} pp
    </span>
  );
}

function ChangeList({ title, items, type }) {
  return (
    <section className="gw-compare-change-group">
      <div className="gw-compare-change-heading">
        <h3>{title}</h3>
        <span>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="gw-compare-empty-change">
          No competencies in this category.
        </p>
      ) : (
        <div className="gw-compare-change-list">
          {items.map(item => (
            <div
              className="gw-compare-change"
              key={item.canonicalSkillId}
            >
              <div className="gw-compare-change-info">
                <strong>{item.skill}</strong>

                <small>
                  {item.requirementType === "preferred"
                    ? "Preferred"
                    : "Required"}
                </small>
              </div>

              <div
                className={`gw-compare-transition ${type}`}
              >
                <span>
                  {STATUS_LABELS[item.before] ||
                    item.before}
                </span>
                <span aria-hidden="true">→</span>
                <span>
                  {STATUS_LABELS[item.after] ||
                    item.after}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ReportComparisonPanel({
  firstId,
  secondId,
  onClear,
}) {
  const navigate = useNavigate();

  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCompare() {
    if (!firstId || !secondId || loading) return;

    setLoading(true);
    setError("");
    setComparison(null);

    try {
      const response = await API.get(
        "/reports/compare",
        {
          params: {
            first: firstId,
            second: secondId,
          },
        }
      );

      if (!response.data?.comparison?.comparable) {
        throw new Error(
          "Invalid comparison response."
        );
      }

      setComparison(response.data.comparison);
    } catch (err) {
      if (err.response?.status === 422) {
        setError(
          err.response?.data?.message ||
          "These reports cannot be compared."
        );
      } else if (err.response?.status === 404) {
        setError(
          "One or both reports are no longer accessible."
        );
      } else if (err.response?.status === 401) {
        setError(
          "Your session expired. Please sign in again."
        );
      } else {
        setError(
          err.response?.data?.message ||
          err.message ||
          "Unable to compare saved reports."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const changes = comparison?.competencies;

  return (
    <section
      className="gw-compare-panel"
      aria-labelledby="gw-compare-title"
    >
      <div className="gw-compare-header">
        <div>
          <span className="gw-compare-eyebrow">
            HISTORICAL EVIDENCE COMPARISON
          </span>
          <h2 id="gw-compare-title">
            Compare your reports.
          </h2>
          <p>
            Select two reports for the same target to
            examine how your documented evidence changed.
          </p>
        </div>

        <span className="gw-compare-selected">
          {[firstId, secondId].filter(Boolean).length}
          /2 selected
        </span>
      </div>

      <div className="gw-compare-controls">
        <button
          type="button"
          className="gw-compare-run"
          disabled={!firstId || !secondId || loading}
          onClick={handleCompare}
        >
          {loading
            ? "Comparing..."
            : "Compare selected reports →"}
        </button>

        <button
          type="button"
          className="gw-compare-clear"
          onClick={onClear}
          disabled={loading}
        >
          Clear selection
        </button>
      </div>

      {error && (
        <div className="gw-compare-error" role="alert">
          {error}
        </div>
      )}

      {comparison && (
        <div className="gw-compare-result" role="status">
          <div className="gw-compare-summary">
            <div className="gw-compare-version">
              <span>EARLIER REPORT</span>

              <strong>
                {comparison.earlier.resumeLabel ||
                  "Earlier resume"}
              </strong>

              <Score value={comparison.earlier.score} />

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/reports/${comparison.earlier.reportId}/view`
                  )
                }
              >
                View original report ↗
              </button>
            </div>

            <div className="gw-compare-version">
              <span>LATER REPORT</span>

              <strong>
                {comparison.later.resumeLabel ||
                  "Later resume"}
              </strong>

              <Score value={comparison.later.score} />

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/reports/${comparison.later.reportId}/view`
                  )
                }
              >
                View original report ↗
              </button>
            </div>
          </div>

          <div className="gw-compare-overview">
            <div>
              <span>CHANGE IN EVIDENCE COVERAGE</span>
              <Delta
                value={
                  comparison.coverage.changePercentagePoints
                }
              />
            </div>

            <div className="gw-compare-counts">
              <span>
                <strong>{comparison.counts.strengthened}</strong>
                Strengthened
              </span>
              <span>
                <strong>{comparison.counts.weakened}</strong>
                Weakened
              </span>
              <span>
                <strong>{comparison.counts.unchanged}</strong>
                Unchanged
              </span>
            </div>
          </div>

          <div className="gw-compare-details">
            <ChangeList
              title="Strengthened evidence"
              items={changes.strengthened}
              type="positive"
            />

            <ChangeList
              title="Weakened evidence"
              items={changes.weakened}
              type="negative"
            />

            <ChangeList
              title="Unchanged evidence"
              items={changes.unchanged}
              type="neutral"
            />
          </div>

          <p className="gw-compare-disclaimer">
            These differences reflect evidence documented
            in the two resumes under compatible assessment
            rules. They are not verified changes in ability
            or hiring probability.
          </p>
        </div>
      )}
    </section>
  );
}
