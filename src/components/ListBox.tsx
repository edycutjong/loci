import { MAX_ITEMS, MAX_WORDS, type ParsedList } from "../../shared/list";

type Props = {
  text: string;
  parsed: ParsedList;
  onChange: (text: string) => void;
  children?: React.ReactNode; // example-list chips
};

export function ListBox({ text, parsed, onChange, children }: Props) {
  const count = parsed.items.length;
  const showProblem = text.trim().length > 0 && parsed.problem;
  return (
    <div className="field">
      <div>
        <label htmlFor="list" className="field-label">
          Your list
        </label>
        <p className="field-hint" id="list-hint">
          One item per line, in the order you need to learn them. Up to {MAX_ITEMS} items, {MAX_WORDS} words or fewer each. Add other accepted answers
          after " / ".
        </p>
      </div>
      {children}
      <textarea
        id="list"
        className="list-input"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"Olfactory\nOptic\nOculomotor\n…"}
        spellCheck={false}
        autoCapitalize="off"
        aria-describedby="list-hint list-count"
        aria-invalid={showProblem ? "true" : "false"}
        rows={12}
      />
      <p className="list-status" id="list-count" aria-live="polite">
        <span className="num">
          {count} {count === 1 ? "item" : "items"}
        </span>
        {showProblem && <span className="problem">{parsed.problem}</span>}
      </p>
      {parsed.tooLong.length > 0 && (
        <ul className="list-long">
          {parsed.tooLong.map((i) => (
            <li key={i}>
              Line {i + 1}, “{parsed.items[i].text}”: keep items to {MAX_WORDS} words or fewer.
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
