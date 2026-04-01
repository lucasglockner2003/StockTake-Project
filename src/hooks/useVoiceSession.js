import { useEffect, useRef, useState } from "react";
import { ENTRY_STATUSES, SOURCES } from "../constants/app";
import {
  createSpeechRecognition,
  isSpeechRecognitionSecureContext,
  isSpeechRecognitionSupported,
  parseVoiceLine,
} from "../utils/voice";
import { findBestMatchInArea } from "../utils/matching";
import {
  createMatchedEntryFromMatchResult,
  updateEntryQuantity,
  updateEntryMatchSearch,
  selectEntryMatchedItem,
  deleteEntryAtIndex,
  clearOpenSearchKeyIfDeleted,
} from "../utils/entries";

function getVoiceErrorMessage(errorCode) {
  if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
    return "Microphone access was blocked. Allow microphone permission and try again.";
  }

  if (errorCode === "audio-capture") {
    return "No microphone was found. Check your audio input device.";
  }

  if (errorCode === "no-speech") {
    return "No speech was detected. Speak clearly and try again.";
  }

  if (errorCode === "network") {
    return "Speech recognition network error. Retry on localhost or a stable HTTPS connection.";
  }

  if (errorCode === "aborted") {
    return "Speech recognition was stopped before a result was captured.";
  }

  return "Voice recognition failed. Check microphone permission and try again.";
}

const MIN_LISTENING_DURATION_MS = 3000;

export function useVoiceSession({
  selectedArea,
  isListening,
  setIsListening,
  setTranscriptLines,
  voiceEntriesByArea,
  setVoiceEntriesByArea,
  setUsedAreasOrder,
  handleBackToStock,
  items,
  applyVoiceEntries,
  applySingleVoiceEntry,
  clearVoiceSession,
  autoApplyMode,
  setVoiceToast,
}) {
  const recognitionRef = useRef(null);
  const microphoneStreamRef = useRef(null);
  const isStartingRecognitionRef = useRef(false);
  const listeningStartedAtRef = useRef(0);
  const userStopRequestedRef = useRef(false);
  const hasCapturedTranscriptRef = useRef(false);
  const toastTimeoutRef = useRef(null);
  const [openSearchKey, setOpenSearchKey] = useState(null);
  const [voiceError, setVoiceError] = useState("");
  const [voiceStatusMessage, setVoiceStatusMessage] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isInitializingRecognition, setIsInitializingRecognition] = useState(false);
  const isSpeechSupported = isSpeechRecognitionSupported();
  const isSecureVoiceContext = isSpeechRecognitionSecureContext();

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      try {
        recognitionRef.current?.stop?.();
      } catch (error) {
        console.warn("[voice] cleanup stop failed", error);
      }

      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach((track) => track.stop());
        microphoneStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    console.info("[voice] environment", {
      supported: isSpeechSupported,
      secureContext: isSecureVoiceContext,
      origin: window.location.origin,
    });

    if (!isSpeechSupported) {
      setVoiceError(
        "Speech recognition is not supported in this browser. Use Chrome on localhost or HTTPS."
      );
      return;
    }

    if (!isSecureVoiceContext) {
      setVoiceError(
        `Speech recognition requires HTTPS or localhost. Current origin: ${window.location.origin}`
      );
      return;
    }

    setVoiceError("");
    setVoiceStatusMessage("Microphone is ready.");
  }, [isSecureVoiceContext, isSpeechSupported]);

  function releaseMicrophoneStream() {
    if (!microphoneStreamRef.current) {
      return;
    }

    microphoneStreamRef.current.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;
  }

  async function ensureMicrophonePermission() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      console.error("[voice] microphone api unavailable");
      setVoiceError(
        "This browser does not expose navigator.mediaDevices.getUserMedia for microphone access."
      );
      setVoiceStatusMessage("");
      return false;
    }

    try {
      console.log("Voice requesting microphone access");
      console.info("[voice] requesting microphone permission");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;
      console.log("Voice microphone permission granted");
      console.info("[voice] microphone permission granted");
      setVoiceError("");
      return true;
    } catch (error) {
      console.error("[voice] microphone permission failed", error);
      setVoiceError(error?.message || "Unable to access microphone.");
      setVoiceStatusMessage("");
      return false;
    } finally {
      releaseMicrophoneStream();
    }
  }

  function handleEditEntryQuantity(areaName, indexToUpdate, newQuantity) {
    setVoiceEntriesByArea((prev) => ({
      ...prev,
      [areaName]: updateEntryQuantity(
        prev[areaName] || [],
        indexToUpdate,
        newQuantity
      ),
    }));
  }

  function handleMatchSearchChange(areaName, indexToUpdate, newSearch) {
    setVoiceEntriesByArea((prev) => ({
      ...prev,
      [areaName]: updateEntryMatchSearch(
        prev[areaName] || [],
        indexToUpdate,
        newSearch
      ),
    }));
  }

  function handleSelectMatchedItem(areaName, indexToUpdate, item) {
    setVoiceEntriesByArea((prev) => ({
      ...prev,
      [areaName]: selectEntryMatchedItem(
        prev[areaName] || [],
        indexToUpdate,
        item
      ),
    }));
  }

  function showVoiceToast(message) {
    setVoiceToast(message);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setVoiceToast("");
    }, 2000);
  }

  function stopRecognition(nextStatusMessage = "") {
    userStopRequestedRef.current = true;
    isStartingRecognitionRef.current = false;
    setIsInitializingRecognition(false);
    setLiveTranscript("");

    try {
      recognitionRef.current?.stop?.();
      console.info("[voice] stop requested");
    } catch (error) {
      console.error("[voice] stop failed", error);
    }

    setIsListening(false);

    if (nextStatusMessage) {
      setVoiceStatusMessage(nextStatusMessage);
    }
  }

  function handleConfirmAndApply() {
    if (isListening) {
      alert("Stop listening before applying voice entries.");
      return;
    }

    const hasEntries = Object.values(voiceEntriesByArea).some(
      (entries) => entries.length > 0
    );

    if (!hasEntries) {
      alert("There are no voice entries to apply.");
      return;
    }

    const hasInvalidQuantity = Object.values(voiceEntriesByArea).some((entries) =>
      entries.some(
        (entry) =>
          (entry.status === ENTRY_STATUSES.MATCHED ||
            entry.status === ENTRY_STATUSES.FUZZY_MATCH) &&
          (entry.quantity === "" ||
            entry.quantity === null ||
            entry.quantity === undefined)
      )
    );

    if (hasInvalidQuantity) {
      alert("Please fill in all quantities before applying.");
      return;
    }

    const confirmed = window.confirm("Confirm the captured entries and send them to Stock Take?");

    if (!confirmed) return;

    applyVoiceEntries(voiceEntriesByArea);
    clearVoiceSession();
    setOpenSearchKey(null);
    handleBackToStock();
  }

  function addVoiceEntryToArea(area, entry) {
    setVoiceEntriesByArea((prev) => {
      const existingAreaEntries = prev[area] || [];

      return {
        ...prev,
        [area]: [...existingAreaEntries, entry],
      };
    });

    setUsedAreasOrder((prev) => {
      if (prev.includes(area)) return prev;
      return [...prev, area];
    });
  }

  async function handleVoiceToggle() {
    if (!isListening) {
      if (!selectedArea) {
        setVoiceError("Select an area before starting voice capture.");
        setVoiceStatusMessage("");
        return;
      }

      if (!isSpeechSupported) {
        console.error("[voice] speech recognition unavailable");
        setVoiceError(
          "Speech recognition is not supported in this browser. Use Chrome on localhost or HTTPS."
        );
        setVoiceStatusMessage("");
        return;
      }

      if (!isSecureVoiceContext) {
        console.error("[voice] insecure context");
        setVoiceError(
          "Speech recognition only works on HTTPS or localhost. Open the app on localhost:5173 or a secure origin."
        );
        setVoiceStatusMessage("");
        return;
      }

      if (isStartingRecognitionRef.current) {
        console.warn("[voice] start ignored because initialization is already in progress");
        return;
      }

      isStartingRecognitionRef.current = true;
      userStopRequestedRef.current = false;
      hasCapturedTranscriptRef.current = false;
      setIsInitializingRecognition(true);
      setVoiceError("");
      setVoiceStatusMessage("Requesting microphone permission...");
      setLiveTranscript("");

      const hasMicrophonePermission = await ensureMicrophonePermission();

      if (!hasMicrophonePermission) {
        isStartingRecognitionRef.current = false;
        setIsInitializingRecognition(false);
        return;
      }

      const recognition = createSpeechRecognition({
        recognition: recognitionRef.current,
        onStart: () => {
          isStartingRecognitionRef.current = false;
          listeningStartedAtRef.current = Date.now();
          userStopRequestedRef.current = false;
          setIsInitializingRecognition(false);
          setIsListening(true);
          setVoiceStatusMessage("Listening... Speak now.");
          setVoiceError("");
        },
        onInterimResult: (text) => {
          if (text) {
            console.info("[voice] interim transcript:", text);
          }
          setLiveTranscript(text);
          setVoiceStatusMessage("Listening... Speak now.");
        },
        onResult: (text) => {
          hasCapturedTranscriptRef.current = true;
          console.info("[voice] final transcript:", text);
          setLiveTranscript("");
          setVoiceStatusMessage("Speech captured.");
          setTranscriptLines((prev) => [...prev, `[${selectedArea}] ${text}`]);

          const parsedLine = parseVoiceLine(text);

          if (!parsedLine) {
            showVoiceToast(
              "Speech captured but could not be parsed. Try: item name plus quantity."
            );
            return;
          }

          const matchResult = findBestMatchInArea(
            parsedLine.spokenName,
            selectedArea,
            items
          );

          const newEntry = createMatchedEntryFromMatchResult({
            rawLine: parsedLine.rawLine,
            spokenName: parsedLine.spokenName,
            quantity: parsedLine.quantity,
            matchResult,
            source: parsedLine.source || SOURCES.VOICE,
          });

          addVoiceEntryToArea(selectedArea, newEntry);

          if (autoApplyMode) {
            const applied = applySingleVoiceEntry(newEntry);

            if (applied) {
              showVoiceToast(`${newEntry.matchedItem} updated`);
            }
          }
        },
        onError: (event) => {
          isStartingRecognitionRef.current = false;
          setIsInitializingRecognition(false);
          setIsListening(false);
          setLiveTranscript("");
          setVoiceError(getVoiceErrorMessage(event?.error));
          setVoiceStatusMessage("");
        },
        onEnd: () => {
          const listeningDurationMs = listeningStartedAtRef.current
            ? Date.now() - listeningStartedAtRef.current
            : 0;

          isStartingRecognitionRef.current = false;
          setIsInitializingRecognition(false);
          setIsListening(false);
          setLiveTranscript("");

          if (hasCapturedTranscriptRef.current) {
            setVoiceStatusMessage("Speech captured.");
            return;
          }

          if (
            !userStopRequestedRef.current &&
            listeningDurationMs > 0 &&
            listeningDurationMs < MIN_LISTENING_DURATION_MS
          ) {
            setVoiceStatusMessage("Listening stopped too quickly. Try speaking again.");
            return;
          }

          setVoiceStatusMessage("Microphone stopped.");
        },
      });

      if (!recognition) {
        isStartingRecognitionRef.current = false;
        setIsInitializingRecognition(false);
        setVoiceError(
          "Speech recognition is not available. Use Chrome on localhost:5173 or HTTPS."
        );
        setVoiceStatusMessage("");
        return;
      }

      recognitionRef.current = recognition;

      try {
        console.info("[voice] calling recognition.start()");
        recognition.start();
      } catch (error) {
        console.error("[voice] recognition.start failed", error);
        isStartingRecognitionRef.current = false;
        setIsInitializingRecognition(false);
        setIsListening(false);
        setLiveTranscript("");
        setVoiceError(error?.message || "Failed to start speech recognition.");
        setVoiceStatusMessage("");
      }

      return;
    }

    const listeningDurationMs = listeningStartedAtRef.current
      ? Date.now() - listeningStartedAtRef.current
      : MIN_LISTENING_DURATION_MS;

    if (listeningDurationMs < MIN_LISTENING_DURATION_MS) {
      const remainingSeconds = Math.ceil(
        (MIN_LISTENING_DURATION_MS - listeningDurationMs) / 1000
      );
      setVoiceStatusMessage(
        `Listening... keep speaking for at least ${remainingSeconds} more second${
          remainingSeconds === 1 ? "" : "s"
        }.`
      );
      return;
    }

    stopRecognition("Microphone stopped.");
  }

  function handleBackClick() {
    if (isListening) {
      const confirmed = window.confirm(
        "Voice capture is still running. Stop and go back?"
      );

      if (!confirmed) return;

      stopRecognition("Microphone stopped.");
    }

    setOpenSearchKey(null);
    handleBackToStock();
  }

  function handleDeleteEntry(areaName, indexToRemove) {
    setVoiceEntriesByArea((prev) => {
      const updatedAreaEntries = deleteEntryAtIndex(
        prev[areaName] || [],
        indexToRemove
      );
      const updated = { ...prev };

      if (updatedAreaEntries.length > 0) {
        updated[areaName] = updatedAreaEntries;
      } else {
        delete updated[areaName];
      }

      return updated;
    });

    setUsedAreasOrder((prev) => {
      const currentEntries = voiceEntriesByArea[areaName] || [];
      const remainingEntries = deleteEntryAtIndex(currentEntries, indexToRemove);

      if (remainingEntries.length > 0) return prev;

      return prev.filter((area) => area !== areaName);
    });

    setOpenSearchKey((prev) =>
      clearOpenSearchKeyIfDeleted(prev, `${areaName}-${indexToRemove}`)
    );
  }

  return {
    openSearchKey,
    setOpenSearchKey,
    handleEditEntryQuantity,
    handleMatchSearchChange,
    handleSelectMatchedItem,
    handleConfirmAndApply,
    handleVoiceToggle,
    handleBackClick,
    handleDeleteEntry,
    liveTranscript,
    voiceError,
    voiceStatusMessage,
    isInitializingRecognition,
    isSpeechSupported,
    isSecureVoiceContext,
  };
}
