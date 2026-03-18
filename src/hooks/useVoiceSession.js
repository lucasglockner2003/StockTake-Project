import { useEffect, useRef, useState } from "react";
import { ENTRY_STATUSES, SOURCES } from "../constants/app";
import { createSpeechRecognition, parseVoiceLine } from "../utils/voice";
import { findBestMatchInArea } from "../utils/matching";
import {
  createMatchedEntryFromMatchResult,
  updateEntryQuantity,
  updateEntryMatchSearch,
  selectEntryMatchedItem,
  deleteEntryAtIndex,
  clearOpenSearchKeyIfDeleted,
} from "../utils/entries";

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
  const toastTimeoutRef = useRef(null);
  const [openSearchKey, setOpenSearchKey] = useState(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

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

    const confirmed = window.confirm(
      "Confirmar o envio das informaÃ§Ãµes para o Stock Take?"
    );

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

  function handleVoiceToggle() {
    if (!isListening) {
      const recognition = createSpeechRecognition(
        (text) => {
          setTranscriptLines((prev) => [...prev, `[${selectedArea}] ${text}`]);

          const parsedLine = parseVoiceLine(text);

          if (parsedLine && selectedArea) {
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
          }
        },
        () => {
          setIsListening(false);
        }
      );

      if (!recognition) return;

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      return;
    }

    recognitionRef.current?.stop();
    setIsListening(false);
  }

  function handleBackClick() {
    if (isListening) {
      const confirmed = window.confirm(
        "Voice capture is still running. Stop and go back?"
      );

      if (!confirmed) return;

      recognitionRef.current?.stop();
      setIsListening(false);
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
  };
}
