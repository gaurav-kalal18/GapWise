
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "./AuthPage.css";

export default function AuthPage({ mode = "login" }) {
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const location = useLocation();

  const { login, register, isAuthenticated, isLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (isLoading) {
    return <main className="auth-page auth-loading">
      Checking session...
    </main>;
  }

  if (isAuthenticated) {
  return <Navigate to="/workspace" replace />;
}

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;

    setError("");

    if (isSignup) {
      if (name.trim().length < 2 || name.trim().length > 80) {
        setError("Name must contain 2–80 characters.");
        return;
      }

      if (
        password.length < 12 ||
        password.length > 128 ||
        new TextEncoder().encode(password).length > 256
      ) {
        setError("Password must contain 12–128 characters (up to 256 bytes).");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setBusy(true);

    try {
      if (isSignup) {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
        });

        navigate("/login", {
          replace: true,
          state: { registered: true, email: email.trim() },
        });
      } else {
        await login({
          email: email.trim(),
          password,
        });

       navigate("/workspace", { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (isSignup
          ? "Unable to create account. Please try again."
          : "Unable to sign in. Please try again.")
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <nav className="auth-nav">
        <Link to="/" className="auth-brand">
          <span className="auth-brand-mark">↗</span>
          GapWise
        </Link>
        <Link to="/" className="auth-back">
          Back to home
        </Link>
      </nav>

      <section className="auth-layout">
        <div className="auth-intro">
          <span className="auth-eyebrow">YOUR CAREER JOURNEY</span>
          <h1>
            Progress starts
            <br />
            <span>with clarity.</span>
          </h1>
          <p>
            Analyze your skills, understand the gaps,
            and work toward your next career opportunity.
          </p>
          <div className="auth-intro-note">
            Built around evidence, not assumptions.
          </div>
        </div>

        <section className="auth-card" aria-labelledby="auth-heading">
          <span className="auth-card-kicker">
            {isSignup ? "GET STARTED" : "WELCOME BACK"}
          </span>

          <h2 id="auth-heading">
            {isSignup ? "Create your account." : "Sign in to GapWise."}
          </h2>

          <p className="auth-card-description">
            {isSignup
              ? "Create your account to get started with GapWise."
              : "Enter your details to continue."}
          </p>

          {!isSignup && location.state?.registered && (
            <p className="auth-success" role="status">
              Account created successfully. You can now sign in.
            </p>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {isSignup && (
              <div className="auth-field">
                <label htmlFor="auth-name">Full name</label>
                <input
                  id="auth-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  required
                  disabled={busy}
                />
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={254}
                required
                disabled={busy}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <div className="auth-password-wrap">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete={
                    isSignup ? "new-password" : "current-password"
                  }
                  minLength={isSignup ? 12 : undefined}
                  required
                  disabled={busy}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {isSignup && (
                <span className="auth-hint">
                  Use at least 12 characters.
                </span>
              )}
            </div>

            {isSignup && (
              <div className="auth-field">
                <label htmlFor="auth-confirm">Confirm password</label>
                <input
                  id="auth-confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  disabled={busy}
                />
              </div>
            )}

            {error && (
              <p className="auth-error" role="alert">{error}</p>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={busy}
            >
              {busy
                ? "Please wait..."
                : isSignup ? "Create account" : "Sign in"}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? "Already have an account?" : "New to GapWise?"}
            {" "}
            <Link to={isSignup ? "/login" : "/signup"}>
              {isSignup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </section>
      </section>
    </main>
  );
}
