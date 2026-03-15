





//seria o nome da gaveta que os dados tão guardados
const STORAGE_KEY = "smartops-quantities";
const VOICE_STORAGE_KEY = "smartops-voice-data";

// pegar do navegador as quantidades que já estavam salvas.
export function loadQuantities() {
  try {
  const saved = localStorage.getItem(STORAGE_KEY); // Aqui o navegador vai procurar o valor salvo dentro da chave "smartops-quantities".
  return saved ? JSON.parse(saved) : {}; // Se saved existir, converte para objeto : se não existir, retorna objeto vazio
} catch {
  return {};
  }}

export function saveQuantities(quantities) { // salvar no navegador o objeto quantities.
  try {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities)); // Transforma o objeto JavaScript em texto JSON.
}catch {
    // ignore storage errors
  }}

export function clearQuantities() { //apagar do navegador as quantidades salvas.
  try {
  localStorage.removeItem(STORAGE_KEY); // “Apaga a gaveta inteira.”
} catch {
    // ignore storage errors
  }
}

export function loadVoiceData() {
  try {
  const saved = localStorage.getItem(VOICE_STORAGE_KEY);
  return saved
    ? JSON.parse(saved)
    : {
        selectedArea: "",
        transcriptLines: [],
        voiceEntriesByArea: {},
        usedAreasOrder: [],
      };
    }  catch {
    return {
      selectedArea: "",
      transcriptLines: [],
      voiceEntriesByArea: {},
      usedAreasOrder: [],
    };
  }
}

export function saveVoiceData(voiceData) {
  try {
  localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify(voiceData));
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