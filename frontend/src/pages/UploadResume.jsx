import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import API from "../services/api";
import { useGapWise } from "../context/useGapWise";

import "./UploadResume.css";

function UploadResume() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const { setResume, setCandidateProfile } = useGapWise();

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (file) => {
    setError("");

    if (!file) return;

    const allowedTypes = [
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type) || !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF resume.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Resume must be 5 MB or smaller.");
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    handleFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();

    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    handleFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("resume", selectedFile);

      const response = await API.post(
        "/resume",
        formData
      );

      const data = response.data;

      setResume({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      });

      setCandidateProfile(
        data.candidateProfile
      );

      navigate("/job");
    } catch (err) {
      console.error("Resume upload failed:", err);

      setError(
        err.response?.data?.message ||
        "Something went wrong while analyzing your resume."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="upload-page">

      {/* HEADER */}

      <nav className="upload-navbar">
        <button
          className="upload-brand"
          onClick={() => navigate("/")}
        >
          <span className="brand-mark">
            ↗
          </span>

          GapWise
        </button>

        <div className="upload-step">
          <span className="active-step">
            01
          </span>

          <span>Resume</span>

          <span className="step-divider">
            /
          </span>

          <span>02</span>

          <span>Target role</span>

          <span className="step-divider">
            /
          </span>

          <span>03</span>

          <span>Analysis</span>
        </div>
      </nav>

      {/* CONTENT */}

      <section className="upload-content">

        <motion.div
          className="upload-heading"
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
          }}
        >
          <div className="eyebrow">
            STEP 01 — YOUR PROFILE
          </div>

          <h1>
            Start with your
            <br />
            <span>resume.</span>
          </h1>

          <p>
            We'll extract your skills, experience,
            projects and evidence to build your
            candidate profile.
          </p>
        </motion.div>

        {/* DROP ZONE */}

        <motion.div
          className={`upload-zone ${
            isDragging ? "dragging" : ""
          } ${selectedFile ? "has-file" : ""}`}
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
            delay: 0.1,
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => {
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          onClick={() => {
            if (!isUploading) {
              fileInputRef.current?.click();
            }
          }}
        >

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            hidden
          />

          {!selectedFile ? (
            <>
              <div className="upload-icon">
                ↑
              </div>

              <h2>
                Drop your resume here
              </h2>

              <p>
                or click to browse your files
              </p>

              <span className="upload-format">
                PDF only · Maximum 5 MB
              </span>
            </>
          ) : (
            <div className="selected-file">

              <div className="file-icon">
                PDF
              </div>

              <div className="file-info">
                <strong>
                  {selectedFile.name}
                </strong>

                <span>
                  {(
                    selectedFile.size /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB
                </span>
              </div>

              <button
                className="remove-file"
                onClick={(event) => {
                  event.stopPropagation();

                  if (!isUploading) {
                    setSelectedFile(null);
                  }
                }}
              >
                ×
              </button>

            </div>
          )}

        </motion.div>

        {/* ERROR */}

        {error && (
          <div className="upload-error">
            {error}
          </div>
        )}

        {/* ACTION */}

        <div className="upload-actions">

          <button
            className="back-button"
            onClick={() => navigate("/")}
            disabled={isUploading}
          >
            ← Back
          </button>

          <button
            className="continue-button"
            disabled={
              !selectedFile ||
              isUploading
            }
            onClick={handleUpload}
          >
            {isUploading
              ? "Analyzing resume..."
              : "Continue"}

            {!isUploading && (
              <span>→</span>
            )}
          </button>

        </div>

        <div className="privacy-note">
          Your PDF is processed in memory to create your
          candidate profile. The PDF is not stored by GapWise.
          AI suggestions are an optional, synthetic-data-only prototype.
        </div>

      </section>
    </main>
  );
}

export default UploadResume;