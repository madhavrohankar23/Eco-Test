/**
 * Speech-to-Text service using Web Speech API.
 * 
 * Configured for robust multilingual recognition of Hindi, English, 
 * and Marathi mixed speech. Uses hi-IN as the primary language
 * with continuous mode for natural conversational input.
 */
export class SpeechService {
  private recognition: any = null;
  private isActive = false;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === "undefined") return;
    
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    // Use continuous mode so it keeps listening for the full sentence
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    // hi-IN is excellent for code-switching between Hindi/English/Marathi
    this.recognition.lang = "hi-IN";
  }

  isSupported() {
    return this.recognition !== null;
  }

  start(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (err: string) => void,
    onEnd: () => void
  ) {
    if (!this.recognition) {
      onError("Speech recognition not supported in this browser. Please use Chrome.");
      return;
    }

    if (this.isActive) {
      // Already listening, stop first
      this.stop();
    }

    // Reinitialize to clear any stale event handlers
    this.initRecognition();
    if (!this.recognition) {
      onError("Failed to initialize speech recognition.");
      return;
    }

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    this.recognition.lang = "hi-IN";

    let fullTranscript = "";
    let hasFinal = false;

    this.recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += transcript;
          hasFinal = true;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        fullTranscript = finalTranscript;
      }

      // Show the most current text (final if available, otherwise interim)
      const displayText = fullTranscript || interimTranscript;
      
      if (displayText) {
        console.log("[Speech] Result:", displayText, "isFinal:", hasFinal);
        onResult(displayText, hasFinal);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error("[Speech] Error:", event.error);
      this.isActive = false;
      
      // Don't treat "no-speech" as fatal — it just means silence
      if (event.error === "no-speech") {
        // Let onEnd handle it
        return;
      }
      
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        onError("Microphone permission denied. Please allow microphone access.");
        return;
      }
      
      if (event.error === "network") {
        onError("Network error. Speech recognition requires internet in Chrome.");
        return;
      }
      
      onError(`Speech error: ${event.error}`);
    };

    this.recognition.onend = () => {
      console.log("[Speech] Recognition ended. fullTranscript:", fullTranscript);
      this.isActive = false;
      onEnd();
    };

    try {
      this.isActive = true;
      this.recognition.start();
      console.log("[Speech] Started listening...");
    } catch (e) {
      this.isActive = false;
      console.error("[Speech] Start failed:", e);
      onError("Microphone is already in use or permission denied.");
    }
  }

  stop() {
    if (this.recognition && this.isActive) {
      try {
        this.recognition.stop();
      } catch (_) {
        // Ignore errors when stopping
      }
      this.isActive = false;
    }
  }
}

export const speechService = new SpeechService();
