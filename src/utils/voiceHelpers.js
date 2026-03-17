export function createSpeechRecognition(onResult, onEnd) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Browser does not support Speech Recognition. Use Chrome.");
    return null;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-NZ";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const latestResult = event.results[event.results.length - 1];

    if (!latestResult || !latestResult[0]) return;

    const text = String(latestResult[0].transcript || "")
      .trim()
      .toLowerCase();

    if (!text) return;

    onResult(text);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  recognition.onerror = () => {
    if (onEnd) onEnd();
  };

  return recognition;
}