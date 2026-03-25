import { createContext, useEffect, useState } from "react";
import {
  getMe,
  login as loginRequest,
  logoutLocal,
  persistAuthSession,
  registerAuthSessionExpiredHandler,
  register as registerRequest,
  restoreAuthSession,
} from "../services/auth-service";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unregisterUnauthorizedHandler = registerAuthSessionExpiredHandler(() => {
      logoutLocal();
      setToken("");
      setUser(null);
      setLoading(false);
      setIsReady(true);
    });

    return unregisterUnauthorizedHandler;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrateAuthState() {
      setLoading(true);
      const storedSession = restoreAuthSession();

      if (!storedSession.token) {
        if (isMounted) {
          setLoading(false);
          setIsReady(true);
        }

        return;
      }

      if (isMounted) {
        setToken(storedSession.token);
        setUser(storedSession.user);
      }

      try {
        const nextUser = await getMe();

        if (!isMounted) {
          return;
        }

        persistAuthSession({
          token: storedSession.token,
          user: nextUser,
        });
        setUser(nextUser);
      } catch {
        if (!isMounted) {
          return;
        }

        logoutLocal();
        setToken("");
        setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsReady(true);
        }
      }
    }

    hydrateAuthState();

    return () => {
      isMounted = false;
    };
  }, []);

  async function establishAuthenticatedSession(nextToken) {
    if (!nextToken) {
      throw new Error("Authentication token was not returned by the API.");
    }

    try {
      persistAuthSession({
        token: nextToken,
        user: null,
      });

      const nextUser = await getMe();
      const nextSession = {
        token: nextToken,
        user: nextUser,
      };

      persistAuthSession(nextSession);
      setToken(nextSession.token);
      setUser(nextSession.user);

      return nextSession;
    } catch (error) {
      logoutLocal();
      setToken("");
      setUser(null);
      throw error;
    }
  }

  async function login(credentials) {
    setLoading(true);

    try {
      const response = await loginRequest(credentials);
      return await establishAuthenticatedSession(response?.accessToken || "");
    } finally {
      setLoading(false);
    }
  }

  async function register(payload) {
    setLoading(true);

    try {
      await registerRequest(payload);
      return await login({
        email: payload.email,
        password: payload.password,
      });
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile() {
    if (!token) {
      return null;
    }

    setLoading(true);

    try {
      const nextUser = await getMe();
      persistAuthSession({
        token,
        user: nextUser,
      });
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      logoutLocal();
      setToken("");
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    logoutLocal();
    setToken("");
    setUser(null);
    setLoading(false);
  }

  const authValue = {
    user,
    token,
    isAuthenticated: Boolean(token),
    loading,
    isReady,
    login,
    register,
    getMe: refreshProfile,
    logout,
  };

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}
