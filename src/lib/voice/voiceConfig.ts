export const VOICE_CONFIG = {
  // Use hi-IN as it is highly effective at mixing English and Hindi
  // webkitSpeechRecognition will auto-detect code switching.
  defaultLanguage: "hi-IN",
  maxAlternativeResults: 1,
  apiEndpoint: "/api/voice",
};
