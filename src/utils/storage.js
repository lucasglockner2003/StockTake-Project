const STORAGE_KEY = "smartops-quantities";
const VOICE_STORAGE_KEY = "smartops-voice-data";

const initialVoiceData = {
  selectedArea: "",
  transcriptLines: [],
  voiceEntriesByArea: {},
  usedAreasOrder: [],
};

export function loadQuantities() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function saveQuantities(quantities) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities));
  } catch {
    // ignore storage errors
  }
}

export function clearQuantities() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function getInitialVoiceData() {
  return {
    selectedArea: "",
    transcriptLines: [],
    voiceEntriesByArea: {},
    usedAreasOrder: [],
  };
}

export function loadVoiceData() {
  try {
    const saved = localStorage.getItem(VOICE_STORAGE_KEY);

    if (!saved) {
      return getInitialVoiceData();
    }

    const parsed = JSON.parse(saved);

    return {
      selectedArea: parsed?.selectedArea || "",
      transcriptLines: Array.isArray(parsed?.transcriptLines)
        ? parsed.transcriptLines
        : [],
      voiceEntriesByArea:
        parsed?.voiceEntriesByArea &&
        typeof parsed.voiceEntriesByArea === "object" &&
        !Array.isArray(parsed.voiceEntriesByArea)
          ? parsed.voiceEntriesByArea
          : {},
      usedAreasOrder: Array.isArray(parsed?.usedAreasOrder)
        ? parsed.usedAreasOrder
        : [],
    };
  } catch {
    return getInitialVoiceData();
  }
}

export function saveVoiceData(voiceData) {
  try {
    localStorage.setItem(
      VOICE_STORAGE_KEY,
      JSON.stringify({
        ...getInitialVoiceData(),
        ...voiceData,
      })
    );
  } catch {
    // ignore storage errors
  }
}

export function clearVoiceData() {
  try {
    localStorage.removeItem(VOICE_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}