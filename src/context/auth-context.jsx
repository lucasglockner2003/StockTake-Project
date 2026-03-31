import { useEffect, useState } from "react";
import { AuthContext } from "./auth-context-instance";
import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  logoutLocal,
  persistAuthSession,
  registerAuthSessionExpiredHandler,
  register as registerRequest,
  refreshSession,
  restoreAuthSession,
} from "../services/auth-service";

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
      const storedToken =
        typeof storedSession?.token === "string" ? storedSession.token : "";

      if (isMounted) {
        setToken(storedToken);
        setUser(storedSession.user);
      }

      try {
        const nextSession = await refreshSession();

        if (!isMounted) {
          return;
        }

        persistAuthSession({
          token: nextSession?.accessToken || "",
          user: nextSession?.user || null,
        });
        setToken(nextSession?.accessToken || "");
        setUser(nextSession?.user || null);
      } catch {
        if (!isMounted) {
          return;
        }

        if (storedToken) {
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

  async function establishAuthenticatedSession(authenticationResponse) {
    const nextToken =
      typeof authenticationResponse?.accessToken === "string"
        ? authenticationResponse.accessToken
        : "";

    if (!nextToken) {
      throw new Error("Authentication token was not returned by the API.");
    }

    try {
      const nextUser =
        authenticationResponse?.user && typeof authenticationResponse.user === "object"
          ? authenticationResponse.user
          : await getMe();

      persistAuthSession({
        token: nextToken,
        user: nextUser,
      });

      setToken(nextToken);
      setUser(nextUser);

      return {
        token: nextToken,
        user: nextUser,
      };
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
      return await establishAuthenticatedSession(response);
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
    setLoading(true);

    return logoutRequest().finally(() => {
      setToken("");
      setUser(null);
      setLoading(false);
    });
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
