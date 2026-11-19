
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "./Workspace.css";

export default function Workspace() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      await logout();
      navigate("/", { replace: true });
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className="gw-workspace">
      <header className="gw-workspace-header">
        <Link to="/" className="gw-workspace-brand">
          <span aria-hidden="true">↗</span> GapWise
        </Link>

        <div className="gw-workspace-nav">
          <span className="gw-workspace-account">
            {user?.name}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Signing out..." : "Log out"}
          </button>
        </div>
      </header>

      <section className="gw-workspace-main">
        <span className="gw-workspace-eyebrow">
          YOUR PERSONAL WORKSPACE
        </span>

        <h1>
          Welcome back,
          <br />
          <span>{user?.name || "there"}.</span>
        </h1>

        <p className="gw-workspace-description">
          Explore your skill gaps, analyze your resume,
          and build a clearer path toward your target role.
        </p>

        {error && (
          <p className="gw-workspace-error" role="alert">
            {error}
          </p>
        )}

        <div className="gw-workspace-grid">
          <Link to="/upload" className="gw-workspace-card primary">
            <span className="gw-workspace-card-icon">↗</span>
            <h2>New Analysis</h2>
            <p>
              Upload your resume and evaluate your evidence
              against a role or job description.
            </p>
            <strong>Start analysis →</strong>
          </Link>

          <div className="gw-workspace-card">
            <span className="gw-workspace-card-icon">▤</span>
            <h2>My Reports</h2>
            <p>
              Your historical analysis reports will appear
              here once report saving is enabled.
            </p>
            <span className="gw-workspace-soon">
              Coming in the next phase
            </span>
          </div>

          <div className="gw-workspace-card">
            <span className="gw-workspace-card-icon">↗</span>
            <h2>My Progress</h2>
            <p>
              Compare your earlier and latest assessments
              to identify improvements.
            </p>
            <span className="gw-workspace-soon">
              Coming in the next phase
            </span>
          </div>
        </div>

        <div className="gw-workspace-note">
          <strong>Account:</strong> {user?.email}
        </div>
      </section>
    </main>
  );
}
