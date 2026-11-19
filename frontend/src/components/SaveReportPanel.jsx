
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../services/api";
import { useAuth } from "../context/useAuth";

import "./SaveReportPanel.css";

export default function SaveReportPanel({
  candidateProfile,
  jobProfile,
  resume,
}) {
  const navigate = useNavigate();
  const { status, isAuthenticated } = useAuth();

  const [resumeLabel, setResumeLabel] = useState(
    resume?.fileName || "My Resume"
  );

  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedReportId, setSavedReportId] = useState(null);
  const [error, setError] = useState("");

  async function handleSave() {
    if (saving || savedReportId) return;

    setError("");

    if (!candidateProfile || !jobProfile) {
      setError(
        "Analysis information is missing. Please run the analysis again."
      );
      return;
    }

    if (!resumeLabel.trim() || resumeLabel.trim().length > 150) {
      setError("Enter a resume label of up to 150 characters.");
      return;
    }

    if (!consent) {
      setError("Please confirm that you want to save this report.");
      return;
    }

    setSaving(true);

    try {
      const response = await API.post(
        "/reports",
        {
          resumeLabel: resumeLabel.trim(),
          candidateProfile,
          jobProfile,
          saveConsent: true,
        },
        {
          headers: {
            "X-GapWise-Request": "1",
          },
        }
      );

      if (!response.data?.reportId) {
        throw new Error("No report ID was returned.");
      }

      setSavedReportId(response.data.reportId);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Your session has expired. Please sign in again.");
      } else if (err.response?.status === 413) {
        setError(
          "This report is too large to save. Please try a shorter resume."
        );
      } else {
        setError(
          err.response?.data?.message ||
          err.message ||
          "Unable to save report. Please try again."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="gw-save-panel"
      aria-labelledby="gw-save-heading"
    >
      <div className="gw-save-heading">
        <div>
          <span className="gw-save-kicker">
            YOUR ANALYSIS HISTORY
          </span>

          <h2 id="gw-save-heading">
            Keep this report for later.
          </h2>

          <p>
            Save this assessment to revisit your evidence,
            skill gaps and recommendations in the future.
          </p>
        </div>

        <span className="gw-save-symbol" aria-hidden="true">
          ↗
        </span>
      </div>

      {status === "loading" && (
        <p className="gw-save-message" role="status">
          Checking your account...
        </p>
      )}

      {status === "error" && (
        <p className="gw-save-error" role="alert">
          Unable to verify your login. Check your connection
          before saving.
        </p>
      )}

      {status === "guest" && (
        <div className="gw-save-guest">
          <p>
            Sign in before running an analysis to keep
            reports in your personal workspace.
          </p>

          <button
            type="button"
            className="gw-save-button"
            onClick={() => navigate("/login")}
          >
            Sign in to GapWise →
          </button>
        </div>
      )}

      {isAuthenticated && !savedReportId && (
        <div className="gw-save-form">
          <div className="gw-save-field">
            <label htmlFor="gw-resume-label">
              Resume version label
            </label>

            <input
              id="gw-resume-label"
              value={resumeLabel}
              maxLength={150}
              disabled={saving}
              onChange={(event) =>
                setResumeLabel(event.target.value)
              }
              placeholder="e.g. Resume after backend project"
            />
          </div>

          <label className="gw-save-consent">
            <input
              type="checkbox"
              checked={consent}
              disabled={saving}
              onChange={(event) =>
                setConsent(event.target.checked)
              }
            />

            <span>
              I agree to save my extracted resume evidence,
              target requirements and analysis results
              in my GapWise account.

              <small>
                The original PDF is not stored by this feature.
                Extracted text may still contain personal information.
              </small>
            </span>
          </label>

          <button
            type="button"
            className="gw-save-button"
            disabled={
              saving ||
              !consent ||
              !resumeLabel.trim()
            }
            onClick={handleSave}
          >
            {saving ? "Saving report..." : "Save this report"}
            {!saving && <span aria-hidden="true">→</span>}
          </button>
        </div>
      )}

      {savedReportId && (
        <div className="gw-save-success" role="status">
          <strong>✓ Report saved successfully.</strong>

          <p>
            This analysis is stored in your account.
            Your report history will become available
            in the next feature.
          </p>

          <small>
            Report ID: {savedReportId}
          </small>
        </div>
      )}

      {error && (
        <p className="gw-save-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
