
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import API from "../services/api";
import ResultsPlaceholder from "./ResultsPlaceholder";

import "./SavedReportView.css";

export default function SavedReportView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadSavedReport() {
      setStatus("loading");
      setReport(null);
      setError("");

      try {
        const response = await API.get(
          `/reports/${encodeURIComponent(id)}`,
          { signal: controller.signal }
        );

        if (controller.signal.aborted) return;

        const saved = response.data?.report;

        if (
          !saved ||
          !saved.id ||
          !saved.analysis ||
          !saved.targetProfile
        ) {
          throw new Error("Invalid saved report data.");
        }

        setReport(saved);
        setStatus("success");
      } catch (err) {
        if (controller.signal.aborted) return;

        if (err.response?.status === 404) {
          setError(
            "This report was not found or is not accessible."
          );
        } else if (err.response?.status === 401) {
          setError(
            "Your session has expired. Please sign in again."
          );
        } else {
          setError(
            err.response?.data?.message ||
            err.message ||
            "Unable to open this saved report."
          );
        }

        setStatus("error");
      }
    }

    loadSavedReport();

    return () => controller.abort();
  }, [id]);

  if (status === "loading") {
    return (
      <main className="gw-saved-view-state">
        <div className="gw-saved-view-panel" role="status">
          <span className="gw-saved-view-eyebrow">
            GAPWISE / SAVED REPORT
          </span>
          <h1>Opening your report...</h1>
          <p>Retrieving your saved analysis.</p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="gw-saved-view-state">
        <div className="gw-saved-view-panel" role="alert">
          <span className="gw-saved-view-eyebrow">
            GAPWISE / SAVED REPORT
          </span>

          <h1>Unable to open report.</h1>
          <p>{error}</p>

          <button onClick={() => navigate("/reports")}>
            ← Back to My Reports
          </button>
        </div>
      </main>
    );
  }

  return <ResultsPlaceholder savedReport={report} />;
}
