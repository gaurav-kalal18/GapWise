
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

import "./Workspace.css";

export default function Workspace() {
  const navigate = useNavigate();
  const { user, logout, status } = useAuth();

  const firstName = user?.name?.trim()?.split(/\s+/)[0] || "there";

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (status === "loading") {
    return (
      <main className="workspace-page">
        <div className="workspace-container">
          <p>Loading your workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="workspace-page">
      {/* NAVBAR */}
      <nav className="workspace-navbar">
        <button
          type="button"
          className="workspace-logo"
          onClick={() => navigate("/")}
        >
          <span className="brand-mark">â†—</span>
          GapWise
        </button>

        <div className="workspace-nav-actions">
          <span className="workspace-user">
            {user?.name || "My Account"}
          </span>

          <button
            type="button"
            className="workspace-logout"
            onClick={handleLogout}
          >
            Log out â†—
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="workspace-container">
        {/* WELCOME */}
        <section className="workspace-header">
          <div className="workspace-eyebrow">
            YOUR PERSONAL WORKSPACE
          </div>

          <h1>
            Welcome back, <span>{firstName}.</span>
          </h1>

          <p>
            Your space to analyze your skills, track
            your progress, and build toward your
            next opportunity.
          </p>
        </section>

        {/* FEATURE CARDS */}
        <section className="workspace-cards">
          {/* NEW ANALYSIS */}
          <article className="workspace-card">
            <div className="workspace-card-icon">
              â†—
            </div>

            <h2>New Analysis</h2>

            <p>
              Upload a resume and compare your skills
              against a career role or a specific job
              description.
            </p>

            <button
              type="button"
              className="workspace-card-button"
              onClick={() => navigate("/upload")}
            >
              Start analysis <span>â†’</span>
            </button>
          </article>

          {/* MY REPORTS */}
          <article className="workspace-card">
            <div className="workspace-card-icon">
              â–¤
            </div>

            <h2>My Reports</h2>

            <p>
              Access your saved analyses, revisit
              previous assessments, and review your
              skill gaps whenever you need them.
            </p>

            <button
              type="button"
              className="workspace-card-button"
              onClick={() => navigate("/reports")}
            >
              View my reports <span>â†’</span>
            </button>
          </article>

          
{/* MY PROGRESS */}
<article className="workspace-card">
  <div className="workspace-card-icon">
    â—·
  </div>

  <h2>My Progress</h2>

  <p>
    Track your resume evidence coverage across
    saved assessments and see how it changes
    over time.
  </p>

  <button
    type="button"
    className="workspace-card-button"
    onClick={() => navigate("/progress")}
  >
    View my progress <span>â†’</span>
  </button>
</article>

        </section>

        {/* ACCOUNT DETAILS */}
        <section className="workspace-account">
          <div>
            <h3>Your account</h3>
            <p>
              Your saved reports are linked to
              your GapWise account.
            </p>
          </div>

          <div className="workspace-account-info">
            <span>{user?.name || "User"}</span>
            <small>{user?.email || ""}</small>
          </div>
        </section>
      </div>
    </main>
  );
}
