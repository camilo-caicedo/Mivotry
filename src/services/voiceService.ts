/**
 * Voice dictation service using Web Speech API with cross-platform fallbacks.
 * Designed for Mivotry voice & chat input.
 */

// Define SpeechRecognition interface types safely for environments without DOM lib types
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

let activeRecognition: SpeechRecognitionInstance | null = null;
let isCurrentlyListening = false;

export const VoiceService = {
  /**
   * Checks whether Web Speech API is supported in the current environment.
   */
  isVoiceSupported(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    const win = window as any;
    return Boolean(win.webkitSpeechRecognition || win.SpeechRecognition);
  },

  /**
   * Starts voice listening and transcribes speech to text.
   * Defaults to 'es-CO' with fallback to 'es-ES'.
   *
   * @param onResult Callback invoked with recognized text.
   * @param onError Callback invoked with error message.
   * @param onEnd Callback invoked when listening session finishes.
   * @returns boolean whether voice recognition started successfully.
   */
  startListening(
    onResult: (text: string) => void,
    onError: (err: string) => void,
    onEnd: () => void
  ): boolean {
    if (!this.isVoiceSupported()) {
      onError('El reconocimiento de voz no está soportado en este entorno.');
      return false;
    }

    try {
      // Ensure any active instance is stopped before starting a new one
      this.stopListening();

      const win = window as any;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        onError('API de reconocimiento de voz no disponible.');
        return false;
      }

      const recognition: SpeechRecognitionInstance = new SpeechRecognitionClass();
      activeRecognition = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-CO';

      recognition.onstart = () => {
        isCurrentlyListening = true;
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const fullText = (finalTranscript + ' ' + interimTranscript).trim();
        if (fullText) {
          onResult(fullText);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        // 'no-speech' is a normal transient event when the user is silent
        if (event.error === 'no-speech') {
          return;
        }

        // Try es-ES fallback if Colombian Spanish language pack isn't present
        if (event.error === 'language-not-supported' && recognition.lang === 'es-CO') {
          recognition.lang = 'es-ES';
          try {
            recognition.start();
            return;
          } catch {
            // Fall through if fallback also fails
          }
        }

        const errorMsg = event.error ? `Error de voz: ${event.error}` : 'Error en reconocimiento de voz';
        onError(errorMsg);
      };

      recognition.onend = () => {
        isCurrentlyListening = false;
        activeRecognition = null;
        onEnd();
      };

      recognition.start();
      isCurrentlyListening = true;
      return true;
    } catch (err: any) {
      isCurrentlyListening = false;
      activeRecognition = null;
      onError(err?.message || 'No se pudo iniciar el dictado por voz');
      return false;
    }
  },

  /**
   * Stops active listening session cleanly.
   */
  stopListening(): void {
    if (activeRecognition) {
      try {
        activeRecognition.stop();
      } catch {
        try {
          activeRecognition.abort();
        } catch {
          // Ignored
        }
      }
      activeRecognition = null;
    }
    isCurrentlyListening = false;
  },

  /**
   * Checks whether the service is currently actively listening.
   */
  isListening(): boolean {
    return isCurrentlyListening;
  }
};

// Also export standalone named functions
export const isVoiceSupported = VoiceService.isVoiceSupported.bind(VoiceService);
export const startListening = VoiceService.startListening.bind(VoiceService);
export const stopListening = VoiceService.stopListening.bind(VoiceService);
