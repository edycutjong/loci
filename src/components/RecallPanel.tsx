import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CornerDownLeft, X } from "lucide-react";
import type { Stop } from "../../shared/types";

export type Feedback = { stop: number; kind: "right" | "wrong" | "skip"; item: string };

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
};

export function feedbackText(f: Feedback): string {
  if (f.kind === "right") return `Stop ${f.stop + 1}: ${f.item}. Right.`;
  if (f.kind === "skip") return `Stop ${f.stop + 1}: skipped.`;
  return `Stop ${f.stop + 1}: not this one.`;
}

export function RecallPanel({ stop, index, asked, total, retry, feedback, onAnswer, onSkip, voice }: Props) {
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);

  // Each new stop starts with an empty box, ready to type.
  useEffect(() => {
    setText("");
    input.current?.focus({ preventScroll: true });
  }, [index]);

  return (
    <article className="recall" aria-labelledby="recall-place">
      <div className="scene-head">
        <span className="scene-disc num" aria-hidden="true">
          {index + 1}
        </span>
        <div className="scene-titles">
          <h1 id="recall-place" className="recall-place">
            the {stop.anchor.label}
          </h1>
          <p className="scene-where">
            What did you leave here?
            <span className="scene-count">
              {" "}
              · {retry ? "retry" : "stop"} {asked + 1} of {total}
            </span>
          </p>
        </div>
      </div>

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

      {voice}

      <div className="recall-foot">
        <button type="button" className="btn-text btn" onClick={onSkip}>
          I don't know, skip
        </button>
      </div>

      <p className="feedback" role="status" aria-live="polite" data-kind={feedback?.kind ?? "none"}>
        {feedback && (
          <>
            {feedback.kind === "right" ? <Check size={18} strokeWidth={3} aria-hidden="true" /> : <X size={18} strokeWidth={3} aria-hidden="true" />}
            <span>{feedbackText(feedback)}</span>
          </>
        )}
      </p>
    </article>
  );
}
