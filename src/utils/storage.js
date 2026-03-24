import {
  clearStockTakeQuantities,
  getStockTakeQuantities,
  saveStockTakeQuantities,
} from "../repositories/stock-take-repository";
import {
  clearVoiceSessionData,
  createEmptyVoiceSessionData,
  getVoiceSessionData,
  saveVoiceSessionData,
} from "../repositories/voice-session-repository";

export function loadQuantities() {
  return getStockTakeQuantities();
}

export function saveQuantities(quantities) {
  saveStockTakeQuantities(quantities);
}

export function clearQuantities() {
  clearStockTakeQuantities();
}

export function getInitialVoiceData() {
  return createEmptyVoiceSessionData();
}

export function loadVoiceData() {
  return getVoiceSessionData();
}

export function saveVoiceData(voiceData) {
  saveVoiceSessionData({
    ...getInitialVoiceData(),
    ...voiceData,
  });
}

export function clearVoiceData() {
  clearVoiceSessionData();
}
