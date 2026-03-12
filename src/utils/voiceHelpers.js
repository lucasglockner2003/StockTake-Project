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

  recognition.onresult = (event) => {
    const text = event.results[event.results.length - 1][0].transcript
      .trim()
      .toLowerCase();

    onResult(text);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  return recognition;
}