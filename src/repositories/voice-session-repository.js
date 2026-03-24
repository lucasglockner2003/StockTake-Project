import {
  readJsonStorageItem,
  removeStorageItem,
  writeJsonStorageItem,
} from "../services/browser-storage";

const VOICE_SESSION_STORAGE_KEY = "smartops-voice-data";

export function createEmptyVoiceSessionData() {
  return {
    selectedArea: "",
    transcriptLines: [],
    voiceEntriesByArea: {},
    usedAreasOrder: [],
  };
}

function normalizeVoiceSessionData(value) {
  const emptyVoiceSessionData = createEmptyVoiceSessionData();

  return {
    selectedArea: value?.selectedArea || emptyVoiceSessionData.selectedArea,
    transcriptLines: Array.isArray(value?.transcriptLines)
      ? value.transcriptLines
      : emptyVoiceSessionData.transcriptLines,
    voiceEntriesByArea:
      value?.voiceEntriesByArea &&
      typeof value.voiceEntriesByArea === "object" &&
      !Array.isArray(value.voiceEntriesByArea)
        ? value.voiceEntriesByArea
        : emptyVoiceSessionData.voiceEntriesByArea,
    usedAreasOrder: Array.isArray(value?.usedAreasOrder)
      ? value.usedAreasOrder
      : emptyVoiceSessionData.usedAreasOrder,
  };
}

export function getVoiceSessionData() {
  return readJsonStorageItem(
    VOICE_SESSION_STORAGE_KEY,
    createEmptyVoiceSessionData(),
    normalizeVoiceSessionData
  );
}

export function saveVoiceSessionData(voiceSessionData) {
  writeJsonStorageItem(
    VOICE_SESSION_STORAGE_KEY,
    normalizeVoiceSessionData(voiceSessionData)
  );
}

export function clearVoiceSessionData() {
  removeStorageItem(VOICE_SESSION_STORAGE_KEY);
}
