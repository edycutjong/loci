// Every stop as a station on one line: where you are, where you've been, what you remembered.
import { Check, X } from "lucide-react";
export type DotState = "plain" | "current" | "seen" | "right" | "wrong";

type Props = {
  states: DotState[];
  label: (i: number) => string;
  onSelect?: (i: number) => void;
};

export function LineStrip({ states, label, onSelect }: Props) {
  const current = states.indexOf("current");
  return (
    <ol className="strip" aria-label="Stops on the route" style={{ "--n": states.length } as React.CSSProperties}>
      {states.map((state, i) => (
        <li key={i} data-walked={current >= 0 ? (i < current ? "true" : "false") : state === "right" || state === "wrong" || state === "seen" ? "true" : "false"}>
          {onSelect ? (
            <button type="button" className="dot" data-state={state} aria-label={label(i)} title={label(i)} aria-current={state === "current" ? "step" : undefined} onClick={() => onSelect(i)}>
              <Mark state={state} n={i + 1} />
            </button>
          ) : (
            <span className="dot" data-state={state} aria-label={label(i)} title={label(i)} role="img">
              <Mark state={state} n={i + 1} />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Right and wrong carry a tick or a cross, never colour alone; every other station shows its number. */
function Mark({ state, n }: { state: DotState; n: number }) {
  if (state === "right") return <Check size={13} strokeWidth={3.25} aria-hidden="true" />;
  if (state === "wrong") return <X size={13} strokeWidth={3.25} aria-hidden="true" />;
  return <>{n}</>;
}
