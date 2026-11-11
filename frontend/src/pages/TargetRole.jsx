
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import API from "../services/api";
import { useGapWise } from "../context/useGapWise";
import { roleToJobProfile } from "../services/jobProfile";

import "./TargetRole.css";

function TargetRole() {
  const navigate = useNavigate();

  const {
    candidateProfile,
    setJobProfile,
    setAnalysis,
  } = useGapWise();

  const [mode, setMode] = useState("role");
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");

  const [loadingRoles, setLoadingRoles] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRoles() {
      try {
        const response = await API.get("/roles");

        if (active) {
          setRoles(response.data.roles || []);
        }
      } catch {
        if (active) {
          setError("Unable to load career roles.");
        }
      } finally {
        if (active) {
          setLoadingRoles(false);
        }
      }
    }

    loadRoles();

    return () => {
      active = false;
    };
  }, []);

  const canContinue =
    mode === "role"
      ? Boolean(selectedRole)
      : description.trim().length > 0;

  const handleAnalyze = async () => {
    if (!canContinue || isAnalyzing) return;

    if (!candidateProfile) {
      setError("Please upload your resume first.");
      return;
    }

    setError("");
    setIsAnalyzing(true);

    try {
      let profile;

      if (mode === "role") {
        const response = await API.get(
          `/roles/${encodeURIComponent(selectedRole)}/assessment`
        );

        profile = roleToJobProfile(response.data);
      } else {
        const response = await API.post("/jobs/analyze", {
          title: title.trim(),
          company: company.trim(),
          description: description.trim(),
        });

        profile = response.data.jobProfile;
      }

      if (!profile?.requiredSkills?.length) {
        throw new Error(
          "No job requirements could be extracted."
        );
      }

console.table(
  profile.requiredSkills.slice(0, 10).map((item) => ({
    skill: item.skill,
    canonicalSkillId: item.canonicalSkillId,
    requirementType: item.requirementType,
  }))
);

      const response = await API.post(
        "/analysis/candidate",
        {
          candidateProfile,
          jobProfile: profile,
        }
      );

      if (!response.data?.analysis) {
        throw new Error("Invalid analysis response.");
      }

      setJobProfile(profile);
      setAnalysis(response.data.analysis);

      navigate("/results");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Analysis failed. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="target-page">
      <nav className="target-navbar">
        <button
          className="upload-brand"
          onClick={() => navigate("/")}
        >
          <span className="brand-mark">↗</span>
          GapWise
        </button>

        <div className="upload-step">
          <span>01</span>
          <span>Resume</span>
          <span className="step-divider">/</span>
          <span className="active-step">02</span>
          <span>Target role</span>
          <span className="step-divider">/</span>
          <span>03</span>
          <span>Analysis</span>
        </div>
      </nav>

      <section className="target-content">
        <motion.div
          className="target-heading"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="eyebrow">
            STEP 02 — YOUR TARGET
          </div>

          <h1>
            What role are you
            <br />
            <span>aiming for?</span>
          </h1>

          <p>
            Choose your career path or analyze
            a specific job description.
          </p>
        </motion.div>

        <div className="target-options">
          <button
            type="button"
            className={`target-option ${
              mode === "role" ? "selected" : ""
            }`}
            aria-pressed={mode === "role"}
            onClick={() => {
              setMode("role");
              setError("");
            }}
          >
            <span className="target-option-icon">▦</span>
            <strong>Explore career roles</strong>
            <span>
              Choose from predefined career paths.
            </span>
          </button>

          <button
            type="button"
            className={`target-option ${
              mode === "custom" ? "selected" : ""
            }`}
            aria-pressed={mode === "custom"}
            onClick={() => {
              setMode("custom");
              setError("");
            }}
          >
            <span className="target-option-icon">≡</span>
            <strong>Use a job description</strong>
            <span>
              Analyze requirements from a job posting.
            </span>
          </button>
        </div>

        <div className="target-input-panel">
          {mode === "role" ? (
            <>
              <label htmlFor="target-role-select">
                Choose your target role
              </label>

              <select
                id="target-role-select"
                value={selectedRole}
                disabled={loadingRoles || isAnalyzing}
                onChange={(event) =>
                  setSelectedRole(event.target.value)
                }
              >
                <option value="">
                  {loadingRoles
                    ? "Loading career roles..."
                    : "Select a career role"}
                </option>

                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>

              {selectedRole && (
                <p className="target-hint">
                  {roles.find(
                    (role) => role.id === selectedRole
                  )?.description}
                </p>
              )}
            </>
          ) : (
            <div className="target-custom-fields">
              <label htmlFor="job-title">
                Job title <span>(optional)</span>
              </label>

              <input
                id="job-title"
                value={title}
                disabled={isAnalyzing}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Backend Developer"
              />

              <label htmlFor="job-company">
                Company <span>(optional)</span>
              </label>

              <input
                id="job-company"
                value={company}
                disabled={isAnalyzing}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Technologies"
              />

              <label htmlFor="job-description">
                Job description
              </label>

              <textarea
                id="job-description"
                rows={7}
                value={description}
                disabled={isAnalyzing}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Paste the complete job description here..."
              />
            </div>
          )}
        </div>

        {error && (
          <div className="upload-error" role="alert">
            {error}
          </div>
        )}

        <div className="target-actions">
          <button
            className="back-button"
            disabled={isAnalyzing}
            onClick={() => navigate("/upload")}
          >
            ← Back
          </button>

          <button
            className="continue-button"
            disabled={!canContinue || isAnalyzing}
            onClick={handleAnalyze}
          >
            {isAnalyzing
              ? "Analyzing..."
              : "Analyze my profile →"}
          </button>
        </div>

        <p className="target-note">
          Your profile will be compared against
          the selected job requirements.
        </p>
      </section>
    </main>
  );
}

export default TargetRole;
