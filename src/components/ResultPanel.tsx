import { useState } from "react";
import { Copy, Eye, RotateCcw, Sun } from "lucide-react";
import { count, resultLine, type Result } from "../lib/recall";
import { formatDuration } from "../lib/time";

type Props = {
  result: Result;
  total: number;
  onRetry: (stops: number[]) => void;
  onRelearn: (stops: number[]) => void;
  onWalkAgain: () => void;
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function ResultPanel({ result, total, onRetry, onRelearn, onWalkAgain }: Props) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const first = count(result.firstTry);
  const now = result.afterRetry ?? result.firstTry;
  const misses = now.flatMap((ok, i) => (ok ? [] : [i]));
  const allLit = misses.length === 0;
  const line = resultLine(result, total, new Date(result.at), formatDuration);

  return (
    <article className="result" aria-labelledby="result-title">
      <h1 id="result-title" className="result-title">
        {first === total ? `You remembered all ${total} on the first try.` : `You remembered ${first} of ${total} on the first try.`}
      </h1>
      {result.afterRetry && (
        <p className="result-retry">
          <span className="nowrap">
            After retrying: <span className="num">{count(result.afterRetry)}</span> of <span className="num">{total}</span>.
          </span>
        </p>
      )}
      <p className="result-times">
        {result.learnMs !== null && (
          <>
            <span className="nowrap">
              Learning took <span className="num">{formatDuration(result.learnMs)}</span>.
            </span>{" "}
          </>
        )}
        <span className="nowrap">
          Recall took <span className="num">{formatDuration(result.recallMs)}</span>.
        </span>
      </p>
      {allLit && (
        <p className="result-lit">
          <Sun size={18} strokeWidth={2} aria-hidden="true" /> Every light is on.
        </p>
      )}

      <div className="result-actions">
        {!allLit && (
          <>
            <button type="button" className="btn btn-primary" onClick={() => onRetry(misses)}>
              <RotateCcw size={18} strokeWidth={2.25} aria-hidden="true" />
              {misses.length === 1 ? "Retry the missed stop" : `Retry the ${misses.length} missed stops`}
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => onRelearn(misses)}>
              <Eye size={18} strokeWidth={2} aria-hidden="true" />
              {misses.length === 1 ? "Look at its scene again" : "Look at their scenes again"}
            </button>
          </>
        )}
        <button type="button" className={allLit ? "btn btn-primary" : "btn btn-quiet"} onClick={onWalkAgain}>
          Walk it again
        </button>
        <button
          type="button"
          className="btn btn-text"
          onClick={async () => setCopied((await copyText(line)) ? "done" : "failed")}
          aria-describedby="result-line"
        >
          <Copy size={17} strokeWidth={2} aria-hidden="true" />
          Copy result
        </button>
      </div>
      <p className="result-line num" id="result-line">
        {line}
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {copied === "done" ? "Result copied." : copied === "failed" ? "Couldn't copy. Select the line and copy it." : ""}
      </p>
      {copied !== "idle" && (
        <p className="made-note" aria-hidden="true">
          {copied === "done" ? "Copied." : "Couldn't copy here. Select the line above and copy it."}
        </p>
      )}
    </article>
  );
}
