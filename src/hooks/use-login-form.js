import { useState } from "react";

import { useAuth } from "./use-auth";

function getEmptyCredentials() {
  return {
    email: "",
    password: "",
  };
}

export function useLoginForm(onLoginSuccess) {
  const { login, loading } = useAuth();
  const [credentials, setCredentials] = useState(getEmptyCredentials());
  const [errorMessage, setErrorMessage] = useState("");

  function handleFieldChange(event) {
    const { name, value } = event.target;

    setCredentials((currentCredentials) => ({
      ...currentCredentials,
      [name]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    try {
      const session = await login({
        email: credentials.email.trim(),
        password: credentials.password,
      });

      if (typeof onLoginSuccess === "function") {
        onLoginSuccess(session);
      }
    } catch (error) {
      setErrorMessage(error?.message || "Failed to sign in.");
    }
  }

  return {
    credentials,
    errorMessage,
    isSubmitting: loading,
    handleFieldChange,
    handleSubmit,
  };
}
