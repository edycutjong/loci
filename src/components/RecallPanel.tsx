import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CornerDownLeft, Ear, Mic, MicOff, X } from "lucide-react";
import { LISTEN_ERRORS, type ListenError } from "../lib/speech";
import type { Stop } from "../../shared/types";
import { keepHyphens } from "./text";

export type Feedback = { stop: number; kind: "right" | "wrong" | "skip" | "not-caught"; item: string };

type Props = {
  stop: Stop;
  index: number;
  asked: number;
  total: number;
  retry: boolean;
  feedback: Feedback | null;
  onAnswer: (text: string) => void;
  onSkip: () => void;
  /** Voice controls, when the browser can listen. */
  voice?: ReactNode;
  /** Put the cursor in the answer box on each stop (off while listening, so a phone keyboard doesn't pop up). */
  focusInput?: boolean;
};

export function feedbackText(f: Feedback): string {
  if (f.kind === "right") return `Stop ${f.stop + 1}: ${f.item}. Right.`;
  if (f.kind === "skip") return `Stop ${f.stop + 1}: skipped.`;
  if (f.kind === "not-caught") return "Didn't catch that. Say it again, or type it.";
  return `Stop ${f.stop + 1}: not this one.`;
}

export function RecallPanel({ stop, index, asked, total, retry, feedback, onAnswer, onSkip, voice, focusInput = true }: Props) {
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);

  // Each new stop starts with an empty box, ready to type.
  useEffect(() => {
    setText("");
    if (focusInput) input.current?.focus({ preventScroll: true });
  }, [index, focusInput]);

  return (
    <article className="recall" aria-labelledby="recall-place">
      <div className="scene-head">
        <span className="scene-disc num" aria-hidden="true">
          {index + 1}
        </span>
        <div className="scene-titles">
          <h1 id="recall-place" className="recall-place">
            the {keepHyphens(stop.anchor.label)}
          </h1>
          <p className="scene-where">
            What did you leave here?
            <span className="scene-count">
              {" "}
              · <span className="nowrap">{retry ? "retry" : "stop"} {asked + 1} of {total}</span>
            </span>
          </p>
        </div>
      </div>

      {voice}

      <form
        className="answer-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return input.current?.focus();
          onAnswer(text);
          setText("");
        }}
      >
        <input
          ref={input}
          className="answer-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type it"
          aria-label={`Your answer for stop ${index + 1}, the ${stop.anchor.label}`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
        />
        <button type="submit" className="btn btn-primary">
          Check
          <CornerDownLeft size={17} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </form>

      <div className="recall-foot">
        <button type="button" className="btn-text btn" onClick={onSkip}>
          I don't know, skip
        </button>
      </div>

      <p className="feedback" role="status" aria-live="polite" data-kind={feedback?.kind ?? "none"}>
        {feedback && (
          <>
            {feedback.kind === "right" ? (
              <Check size={18} strokeWidth={3} aria-hidden="true" />
            ) : feedback.kind === "not-caught" ? (
              <Ear size={18} strokeWidth={2.25} aria-hidden="true" />
            ) : (
              <X size={18} strokeWidth={3} aria-hidden="true" />
            )}
            <span>{feedbackText(feedback)}</span>
          </>
        )}
      </p>
    </article>
  );
}

type VoiceProps = {
  supported: boolean;
  listening: boolean;
  error: ListenError | null;
  heard: string;
  interim: string;
  onToggle: () => void;
};

/** One tap starts listening for the rest of the walk; what the browser heard is always shown. */
export function VoiceControl({ supported, listening, error, heard, interim, onToggle }: VoiceProps) {
  if (!supported) {
    return <p className="voice-note">Voice isn't available in this browser. Type your answers.</p>;
  }
  return (
    <div className="voice">
      <button type="button" className="mic" aria-pressed={listening} onClick={onToggle}>
        {listening ? <MicOff size={20} strokeWidth={2} aria-hidden="true" /> : <Mic size={20} strokeWidth={2} aria-hidden="true" />}
        {listening ? "Listening. Tap to stop" : "Say it instead"}
      </button>
      <p className="heard" aria-live="polite">
        {error ? (
          <span className="problem">{LISTEN_ERRORS[error]}</span>
        ) : interim ? (
          <>
            Hearing <q>{interim}</q>
          </>
        ) : heard ? (
          <>
            Heard <q>{heard}</q>
          </>
        ) : listening ? (
          "Say each item in turn. Say “skip” if you don't know one."
        ) : (
          "Close your eyes and say the list, one item at a time."
        )}
      </p>
    </div>
  );
}
