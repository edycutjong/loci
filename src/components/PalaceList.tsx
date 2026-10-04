import { useState } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import type { Palace } from "../../shared/types";
import type { Loaded } from "../lib/store";

type Props = {
  palaces: Loaded[];
  onDelete: (id: string) => void;
};

const shortDate = (at: number) => new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function lastWalk(palace: Palace): { text: string; flags: boolean[] | null } {
  const walk = palace.walks.at(-1);
  if (!walk) return { text: "Not walked yet", flags: null };
  const total = walk.firstTry.length;
  const first = walk.firstTry.filter(Boolean).length;
  const after = walk.afterRetry ? `, ${walk.afterRetry.filter(Boolean).length}/${total} after retry` : "";
  return { text: `${first}/${total} first try${after} · ${shortDate(walk.at)}`, flags: walk.afterRetry ?? walk.firstTry };
}

export function PalaceList({ palaces, onDelete }: Props) {
  const [confirming, setConfirming] = useState<string | null>(null);
  return (
    <ul className="palaces">
      {palaces.map(({ palace, photoUrl }) => {
        const last = lastWalk(palace);
        return (
          <li key={palace.id} className="palace-row">
            <a className="palace-open" href={`#/p/${palace.id}`}>
              <img src={photoUrl} alt="" loading="lazy" />
              <span className="palace-info">
                <span className="palace-title">{palace.title}</span>
                <span className="palace-meta">
                  {palace.stops.length} stops · {last.text}
                </span>
                {last.flags && (
                  <span className="mini-strip" aria-hidden="true">
                    {last.flags.map((ok, i) => (
                      <i key={i} data-ok={ok ? "true" : "false"} />
                    ))}
                  </span>
                )}
              </span>
              <ArrowRight className="palace-go" size={18} strokeWidth={2} aria-hidden="true" />
            </a>
            {confirming === palace.id ? (
              <span className="confirm" role="group" aria-label={`Delete ${palace.title}?`}>
                <button type="button" className="btn btn-quiet confirm-yes" onClick={() => onDelete(palace.id)}>
                  Delete
                </button>
                <button type="button" className="btn btn-text" onClick={() => setConfirming(null)}>
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" className="icon-btn" onClick={() => setConfirming(palace.id)} aria-label={`Delete the palace ${palace.title}`}>
                <Trash2 size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
