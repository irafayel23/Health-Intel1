import { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to load token from localStorage (if you want persistent session)
  useEffect(() => {
    const savedToken = localStorage.getItem("health_intel_token");
    if (savedToken) {
      setToken(savedToken);
      // Optionally decode token to get user info or fetch profile
      // For now, just set a fake user from localStorage
      const savedUser = JSON.parse(
        localStorage.getItem("health_intel_user") || "null",
      );
      setUser(savedUser);
    }
    setLoading(false);
  }, []);

  const login = async (systemId, password) => {
    const response = await api.post("/api/login", {
      system_id: systemId,
      password,
    });
    const { token, redirect } = response.data;
    if (token) {
      setToken(token);
      localStorage.setItem("health_intel_token", token);
      // Decode token or store minimal user data (you might need a /me endpoint)
      const userData = {
        system_id: systemId,
        role: guessRoleFromRedirect(redirect),
      };
      setUser(userData);
      localStorage.setItem("health_intel_user", JSON.stringify(userData));
      return redirect;
    }
    throw new Error("Login failed");
  };

  const register = async (payload) => {
    await api.post("/api/register", payload);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("health_intel_token");
    localStorage.removeItem("health_intel_user");
    // Navigate to /login
    window.location.href = "/login";
  };

  const value = { user, token, login, register, logout, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

// Helper to guess role from redirect (e.g., /admin -> admin)
function guessRoleFromRedirect(redirect) {
  const parts = redirect.split("/");
  return parts[1] || "bhw";
}
