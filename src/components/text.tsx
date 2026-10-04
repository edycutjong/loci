import { Fragment, type ReactNode } from "react";

/** Keeps hyphenated words whole in headings ("mid-century" never breaks into "mid- / century"). */
export function keepHyphens(text: string): ReactNode {
  const parts = text.split(/(\S+-\S+)/);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    /\S+-\S+/.test(part) ? (
      <span key={i} className="nowrap">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
