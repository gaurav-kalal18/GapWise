import { useState } from "react";
import GapWiseContext from "./GapWiseContext";

function GapWiseProvider({ children }) {
  const [resume, setResume] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [jobProfile, setJobProfile] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  return (
    <GapWiseContext.Provider
      value={{
        resume,
        setResume,
        candidateProfile,
        setCandidateProfile,
        jobProfile,
        setJobProfile,
        analysis,
        setAnalysis,
      }}
    >
      {children}
    </GapWiseContext.Provider>
  );
}

export default GapWiseProvider;