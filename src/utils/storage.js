import {
  clearVoiceSessionData,
  createEmptyVoiceSessionData,
  getVoiceSessionData,
  saveVoiceSessionData,
} from "../repositories/voice-session-repository";

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
