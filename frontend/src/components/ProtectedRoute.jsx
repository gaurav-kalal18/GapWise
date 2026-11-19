
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute({ children }) {
  const {
    status,
    isAuthenticated,
    refreshUser,
  } = useAuth();

  const location = useLocation();

  if (status === "loading") {
    return (
      <main className="gw-route-state">
        Checking your session...
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="gw-route-state">
        <h2>Unable to verify your session.</h2>
        <p>Check your connection and try again.</p>
        <button
          type="button"
          onClick={() => {
            refreshUser().catch(() => {});
          }}
        >
          Retry
        </button>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return children;
}
