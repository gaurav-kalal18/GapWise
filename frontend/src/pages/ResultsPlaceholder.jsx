
import { useNavigate } from "react-router-dom";
import { useGapWise } from "../context/useGapWise";

export default function ResultsPlaceholder() {
  const navigate = useNavigate();
  const { analysis, jobProfile } = useGapWise();

  if (!analysis) {
    return (
      <main style={{ padding: 40 }}>
        <h1>No analysis available</h1>
        <p>Please complete your resume and target role first.</p>
        <button onClick={() => navigate("/upload")}>
          Start analysis
        </button>
      </main>
    );
  }

  return (
    <main style={{
      maxWidth: 900,
      margin: "80px auto",
      padding: 24
    }}>
      <h1>Analysis completed</h1>
      <p>Target: {jobProfile?.title || "Custom job"}</p>

      <h2>Backend response</h2>
      <pre style={{
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        padding: 20,
        background: "#e7f0ea",
        borderRadius: 12
      }}>
        {JSON.stringify(analysis, null, 2)}
      </pre>

      <button onClick={() => navigate("/job")}>
        Change target role
      </button>
    </main>
  );
}
