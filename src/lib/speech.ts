// The browser's own speech-to-text (Web Speech API). Chrome and Edge have it; Firefox doesn't; Safari partly.
// One tap starts listening; it keeps listening through pauses until recall ends or the learner stops it.

type Alternative = { transcript: string; confidence: number };
type RecognitionResult = ArrayLike<Alternative> & { isFinal: boolean };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  phrases?: unknown[];
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = (new () => Recognition) & { available?: (o: { langs: string[]; processLocally: boolean }) => Promise<string> };

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canListen = () => recognitionCtor() !== null;

export type ListenError = "blocked" | "no-mic" | "network" | "failed";

export const LISTEN_ERRORS: Record<ListenError, string> = {
  blocked: "The microphone is blocked. Allow it in your browser, or type your answers.",
  "no-mic": "No microphone was found. Type your answers instead.",
  network: "Voice needs an internet connection here. Type your answers, or try again.",
  failed: "Voice couldn't start. Type your answers instead.",
};

type Handlers = {
  onPhrase: (alternatives: string[]) => void;
  onInterim: (text: string) => void;
  onListening: (on: boolean) => void;
  onError: (error: ListenError) => void;
};

/** Where on-device recognition is already installed, hint it with the list's own words (Chrome's phrase biasing).
 *  Says whether the hints are on. */
async function biasTowards(rec: Recognition, phrases: string[]): Promise<boolean> {
  const Ctor = recognitionCtor();
  const Phrase = (window as unknown as { SpeechRecognitionPhrase?: new (text: string, boost: number) => unknown }).SpeechRecognitionPhrase;
  if (!phrases.length || !Phrase || !Ctor?.available || !("phrases" in rec)) return false;
  try {
    const status = await Promise.race([Ctor.available({ langs: ["en-US"], processLocally: true }), new Promise<string>((r) => setTimeout(() => r("timeout"), 1500))]);
    if (status !== "available") return false;
    rec.processLocally = true;
    rec.phrases = phrases.map((p) => new Phrase(p, 5));
    return true;
  } catch {
    // Biasing is a bonus; plain recognition still works.
    return false;
  }
}

export function createListener(handlers: Handlers) {
  let rec: Recognition | null = null;
  let wanted = false;

  async function start(phrases: string[]) {
    const Ctor = recognitionCtor();
    if (!Ctor) return handlers.onError("failed");
    stop();
    wanted = true;
    const r = new Ctor();
    rec = r;
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 5;
    // With the hints on, Chrome's on-device model echoes them in its in-progress guesses ("Permian Triassic Permian
    // Cambrian Cambrian…") even when asked for final answers only; its final answers stay clean, so only those are shown.
    let hinted = await biasTowards(r, phrases);
    r.onstart = () => handlers.onListening(true);
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const alternatives = Array.from(result, (a) => a.transcript);
        if (result.isFinal) handlers.onPhrase(alternatives);
        else if (!hinted) handlers.onInterim(alternatives[0] ?? "");
      }
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") fail("blocked");
      else if (e.error === "audio-capture") fail("no-mic");
      else if (e.error === "network") fail("network");
      else if (e.error === "phrases-not-supported") {
        r.phrases = [];
        r.processLocally = false;
        hinted = false;
      }
      // "no-speech" and "aborted" are normal pauses: the end handler starts listening again.
    };
    r.onend = () => {
      if (wanted && rec === r) {
        try {
          r.start(); // Chrome stops after a silence; keep listening until recall ends
          return;
        } catch {
          wanted = false;
        }
      }
      if (rec === r) handlers.onListening(false);
    };
    try {
      r.start();
    } catch {
      fail("failed");
    }
  }

  function fail(error: ListenError) {
    wanted = false;
    handlers.onError(error);
    handlers.onListening(false);
  }

  function stop() {
    wanted = false;
    const r = rec;
    rec = null;
    try {
      r?.stop();
    } catch {
      // already stopped
    }
    handlers.onListening(false);
  }

  return { start, stop };
}
