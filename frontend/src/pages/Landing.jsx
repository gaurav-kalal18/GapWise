import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import "./Landing.css";

function GapWiseLogo() {
  return (
    <div className="brand">
      <svg
        className="brand-icon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M4 7.5H9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M15 7.5H20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M9 7.5L12 11L15 7.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M4 16.5H9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M15 16.5H20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M9 16.5L12 13L15 16.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span>GapWise</span>
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();

  return (
    <main className="landing">

      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="navbar">
        <GapWiseLogo />

        <div className="nav-actions">
          <a
            href="#how-it-works"
            className="nav-link"
          >
            How it works
          </a>

          <button
            className="nav-button"
            onClick={() => navigate("/upload")}
          >
            Get started
          </button>
        </div>
      </nav>

      {/* =========================
          HERO
      ========================= */}

      <section className="hero">

        <motion.div
          className="hero-content"
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
          }}
        >
          <div className="eyebrow">
            CAREER READINESS ENGINE
          </div>

          <h1>
            Know exactly
            <br />
            <span>what you're missing.</span>
          </h1>

          <p>
            GapWise analyzes your resume against a target role,
            identifies the skills holding you back, and builds a
            personalized path to close the gap.
          </p>

          <div className="hero-actions">

            <button
              className="primary-button"
              onClick={() => navigate("/upload")}
            >
              Analyze my resume

              <span className="cta-arrow">
                →
              </span>
            </button>

            <a
              href="#how-it-works"
              className="secondary-button"
            >
              See how it works
            </a>

          </div>
        </motion.div>

        {/* =========================
            READINESS PREVIEW
        ========================= */}

        <motion.div
          className="hero-visual"
          initial={{
            opacity: 0,
            x: 30,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.7,
            delay: 0.15,
          }}
        >
          <div className="preview-card">

            <div className="preview-header">
              <span>
                JOB READINESS
              </span>

              <span className="preview-status">
                ANALYZED
              </span>
            </div>

            <div className="readiness">
              <strong>
                77%
              </strong>

              <span>
                Moderate readiness
              </span>
            </div>

            {/* Readiness progress */}

            <div className="readiness-progress">
              <div
                className="readiness-progress-fill"
                style={{
                  width: "77%",
                }}
              />
            </div>

            {/* Skill matching indicator */}

            <div className="matching-indicator">
              <span>
                Skill match
              </span>

              <strong>
                5 of 7 requirements
              </strong>
            </div>

            <div className="preview-divider" />

            {/* AWS */}

            <div className="gap-row">
              <div>
                <strong>
                  AWS
                </strong>

                <span>
                  Required skill
                </span>
              </div>

              <span className="gap-badge">
                HIGH
              </span>
            </div>

            {/* Kubernetes */}

            <div className="gap-row">
              <div>
                <strong>
                  Kubernetes
                </strong>

                <span>
                  Preferred skill
                </span>
              </div>

              <span className="gap-badge medium">
                MEDIUM
              </span>
            </div>

            {/* Footer */}

            <div className="preview-footer">
              <span>
                2 priority gaps
              </span>

              <span className="footer-arrow">
                →
              </span>
            </div>

          </div>
        </motion.div>

      </section>

      {/* =========================
          HOW GAPWISE WORKS
      ========================= */}

      <section
        id="how-it-works"
        className="how-section"
      >

        <div className="section-heading">

          <div className="eyebrow">
            HOW GAPWISE WORKS
          </div>

          <h2>
            From resume to
            <br />
            <span>
              clear next steps.
            </span>
          </h2>

          <p>
            GapWise turns your resume and target role into
            an actionable career roadmap.
          </p>

        </div>

        <div className="steps">

          {/* STEP 1 */}

          <div className="step">

            <div className="step-number">
              01
            </div>

            <div className="step-line" />

            <h3>
              Upload Resume
            </h3>

            <p>
              GapWise extracts your skills, projects,
              experience and evidence from your resume.
            </p>

          </div>

          {/* STEP 2 */}

          <div className="step">

            <div className="step-number">
              02
            </div>

            <div className="step-line" />

            <h3>
              Identify Skill Gaps
            </h3>

            <p>
              Your profile is compared against the
              requirements of your target role.
            </p>

          </div>

          {/* STEP 3 */}

          <div className="step">

            <div className="step-number">
              03
            </div>

            <div className="step-line" />

            <h3>
              Get Your Roadmap
            </h3>

            <p>
              Receive prioritized gaps and a personalized
              path for becoming job-ready.
            </p>

          </div>

        </div>

      </section>

    </main>
  );
}

export default Landing;