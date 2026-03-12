





//seria o nome da gaveta que os dados tão guardados
const STORAGE_KEY = "smartops-quantities";
const VOICE_STORAGE_KEY = "smartops-voice-data";

// pegar do navegador as quantidades que já estavam salvas.
export function loadQuantities() {
  const saved = localStorage.getItem(STORAGE_KEY); // Aqui o navegador vai procurar o valor salvo dentro da chave "smartops-quantities".
  return saved ? JSON.parse(saved) : {}; // Se saved existir, converte para objeto : se não existir, retorna objeto vazio
}

export function saveQuantities(quantities) { // salvar no navegador o objeto quantities.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities)); // Transforma o objeto JavaScript em texto JSON.
}

export function clearQuantities() { //apagar do navegador as quantidades salvas.
  localStorage.removeItem(STORAGE_KEY); // “Apaga a gaveta inteira.”
}

export function loadVoiceData() {
  const saved = localStorage.getItem(VOICE_STORAGE_KEY);
  return saved
    ? JSON.parse(saved)
    : {
        selectedArea: "",
        transcriptLines: [],
        voiceEntriesByArea: {},
        usedAreasOrder: [],
      };
}

export function saveVoiceData(voiceData) {
  localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify(voiceData));
}

export function clearVoiceData() {
  localStorage.removeItem(VOICE_STORAGE_KEY);
}