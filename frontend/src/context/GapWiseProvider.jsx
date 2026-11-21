
import { useEffect, useRef, useState } from "react";

import GapWiseContext from "./GapWiseContext";
import { useAuth } from "./useAuth";

function GapWiseProvider({ children }) {
  const { user, status } = useAuth();

  const [resume, setResume] = useState(null);
  const [candidateProfile, setCandidateProfile] =
    useState(null);
  const [jobProfile, setJobProfile] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  // Track the account that was previously authenticated.
  const previousUserId = useRef(null);

  useEffect(() => {
    const currentUserId =
      status === "authenticated"
        ? user?.id ?? null
        : null;

    const previousId = previousUserId.current;

    // A confirmed logout or a switch between accounts
    // must clear the previous user's unsaved analysis.
    const loggedOut =
      status === "guest" && previousId !== null;

    const switchedAccounts =
      status === "authenticated" &&
      previousId !== null &&
      currentUserId !== previousId;

    if (loggedOut || switchedAccounts) {
      setResume(null);
      setCandidateProfile(null);
      setJobProfile(null);
      setAnalysis(null);
    }

    // Preserve state during a temporary network error.
    if (status === "authenticated") {
      previousUserId.current = currentUserId;
    } else if (status === "guest") {
      previousUserId.current = null;
    }
  }, [status, user?.id]);

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