// Every stop as a station on one line: where you are, where you've been, what you remembered.
export type DotState = "plain" | "current" | "seen" | "right" | "wrong";

type Props = {
  states: DotState[];
  label: (i: number) => string;
  onSelect?: (i: number) => void;
};

export function LineStrip({ states, label, onSelect }: Props) {
  const current = states.indexOf("current");
  return (
    <ol className="strip" aria-label="Stops on the route">
      {states.map((state, i) => (
        <li key={i} data-walked={current >= 0 ? (i < current ? "true" : "false") : state === "right" || state === "wrong" || state === "seen" ? "true" : "false"}>
          {onSelect ? (
            <button type="button" className="dot" data-state={state} aria-label={label(i)} aria-current={state === "current" ? "step" : undefined} onClick={() => onSelect(i)}>
              {i + 1}
            </button>
          ) : (
            <span className="dot" data-state={state} aria-label={label(i)} role="img">
              {i + 1}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
