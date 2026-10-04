import { ArrowLeft, ArrowRight, AudioLines } from "lucide-react";
import type { Stop } from "../../shared/types";
import { keepHyphens } from "./text";

type Props = {
  stop: Stop;
  index: number;
  total: number;
  next: Stop | null;
  onBack: () => void;
  onNext: () => void;
  onRecall: () => void;
  /** Relearning only the missed stops: the last button starts their retry instead. */
  finishLabel?: string;
  /** Whether this is the last stop of the path being learned (all stops, or only the missed ones). */
  isLast?: boolean;
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const bounded = (source: string) => `(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`;

/** Marks the item's words inside the scene: the whole item where it appears, otherwise each of its words of 3+ letters. */
export function markItem(scene: string, item: string): (string | { mark: string })[] {
  const whole = bounded(escape(item.trim()));
  const words = item.split(/\s+/).filter((w) => w.length >= 3).map(escape);
  const source = new RegExp(whole, "iu").test(scene) ? whole : words.length ? bounded(words.join("|")) : null;
  if (!source) return [scene];
  const out: (string | { mark: string })[] = [];
  let last = 0;
  for (const m of scene.matchAll(new RegExp(source, "giu"))) {
    const at = m.index ?? 0;
    if (at > last) out.push(scene.slice(last, at));
    out.push({ mark: m[0] });
    last = at + m[0].length;
  }
  if (last < scene.length) out.push(scene.slice(last));
  return out.length ? out : [scene];
}

export function SceneCard({ stop, index, total, next, onBack, onNext, onRecall, finishLabel, isLast }: Props) {
  const parts = markItem(stop.scene, stop.item.text);
  const sounds = stop.soundsLike && stop.soundsLike.toLowerCase() !== stop.item.text.toLowerCase() ? stop.soundsLike : "";
  const last = isLast ?? index === total - 1;
  return (
    <article className="scene" aria-labelledby="scene-item">
      <div className="scene-head">
        <span className="scene-disc num" aria-hidden="true">
          {index + 1}
        </span>
        <div className="scene-titles">
          <h1 id="scene-item" className="scene-item" lang="en">
            {stop.item.text}
          </h1>
          <p className="scene-where">
            on the {keepHyphens(stop.anchor.label)}
            <span className="scene-count">
              {" "}
              · <span className="nowrap">stop {index + 1} of {total}</span>
            </span>
          </p>
        </div>
      </div>
      <p className="scene-text">
        {parts.map((p, i) =>
          typeof p === "string" ? (
            p
          ) : (
            <mark key={i} className="scene-mark">
              {p.mark}
            </mark>
          ),
        )}
      </p>
      {sounds && (
        <p className="scene-sounds">
          <AudioLines size={16} strokeWidth={2} aria-hidden="true" />
          <span>
            Sounds like <em>{sounds}</em>
          </span>
        </p>
      )}
      <div className="scene-nav">
        <button type="button" className="icon-btn" onClick={onBack} disabled={index === 0} aria-label="Previous stop">
          <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
        </button>
        {last ? (
          <button type="button" className="btn btn-primary grow" onClick={onRecall}>
            {finishLabel ?? "Lights out: start recall"}
          </button>
        ) : (
          <button type="button" className="btn btn-primary grow" onClick={onNext}>
            <span className="next-label">Next stop: the {next ? keepHyphens(next.anchor.label) : ""}</span>
            <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
