
import { useCallback, useEffect, useMemo, useState } from "react";

import AuthContext from "./AuthContext";

import {
  registerAccount,
  loginAccount,
  getCurrentUser,
  logoutAccount,
} from "../services/authApi";

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();

      setUser(currentUser);
      setStatus("authenticated");

      return currentUser;
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null);
        setStatus("guest");
        return null;
      }

      // A server/network failure must not be treated as
      // a confirmed logout.
      setUser(null);
      setStatus("error");

      throw error;
    }
  }, []);

  useEffect(() => {
    // React StrictMode may run effects twice in development.
    // Avoid updating state after this effect is cleaned up.
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (!active) return;

        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch((error) => {
        if (!active) return;

        setUser(null);

        setStatus(
          error.response?.status === 401 ? "guest" : "error"
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await loginAccount(credentials);

    setUser(result.user);
    setStatus("authenticated");

    return result.user;
  }, []);

  const register = useCallback(async (details) => {
    return registerAccount(details);
  }, []);

  const logout = useCallback(async () => {
    await logoutAccount();

    setUser(null);
    setStatus("guest");
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      isLoading: status === "loading",
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, status, login, register, logout, refreshUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
