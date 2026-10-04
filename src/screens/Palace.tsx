import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Expand, Shrink } from "lucide-react";
import type { Palace } from "../../shared/types";
import { go } from "../App";
import { LineStrip, type DotState } from "../components/LineStrip";
import { SceneCard } from "../components/SceneCard";
import { Stage, type PinState } from "../components/Stage";
import { liveAnchors, liveScenes, usePalaceBuild, type BuildPhase } from "../lib/build";
import { dropJob, getJob, type BuildJob } from "../lib/session";
import { peekPalace, savePalace } from "../lib/store";
import { formatDuration, useElapsed } from "../lib/time";

type Mode = "learn" | "recall" | "result";
const SOURCES = { anchors: liveAnchors, scenes: liveScenes };

export function PalaceScreen({ id }: { id: string }) {
  const [loaded, setLoaded] = useState(() => peekPalace(id));
  const job = loaded ? null : (getJob(id) ?? null);

  const onBuilt = useCallback(
    (palace: Palace) => {
      const own = job?.room.kind === "photo" ? job.room.photo : undefined;
      void savePalace(palace, own);
      setLoaded(peekPalace(palace.id));
      dropJob(palace.id);
    },
    [job],
  );

  if (!loaded && !job) return <Missing />;
  return <PalaceView loaded={loaded} job={job} onBuilt={onBuilt} />;
}

function PalaceView({ loaded, job, onBuilt }: { loaded: ReturnType<typeof peekPalace>; job: BuildJob | null; onBuilt: (p: Palace) => void }) {
  const build = usePalaceBuild(loaded ? null : job, onBuilt, SOURCES);
  const palace = loaded?.palace ?? null;

  const photoUrl = loaded?.photoUrl ?? (job?.room.kind === "photo" ? job.room.photo.url : job?.room.kind === "example" ? `/rooms/${job.room.id}.jpg` : "");
  const size = palace?.photo ?? build.size ?? (job?.room.kind === "photo" ? job.room.photo : { width: 4, height: 3 });
  const anchors = palace ? palace.stops.map((s) => s.anchor) : build.route;
  const title = palace?.title ?? job?.title ?? "";

  const [mode, setMode] = useState<Mode>("learn");
  const [current, setCurrent] = useState(0);
  const [overview, setOverview] = useState(false);
  const [learnSince, setLearnSince] = useState<number | null>(null);

  // Learning time starts when Learn first opens on a finished palace.
  useEffect(() => {
    if (palace && mode === "learn" && learnSince === null) setLearnSince(Date.now());
  }, [palace, mode, learnSince]);
  const learnElapsed = useElapsed(learnSince, !!palace && mode === "learn");

  const total = anchors.length;
  const step = useCallback(
    (delta: number) => {
      setOverview(false);
      setCurrent((c) => Math.min(total - 1, Math.max(0, c + delta)));
    },
    [total],
  );

  // Left and right arrow keys walk the route (not while typing).
  useEffect(() => {
    if (!palace || mode !== "learn") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palace, mode, step]);

  const learnStates: PinState[] = anchors.map((_, i) => (i === current ? "current" : i < current ? "seen" : "plain"));
  const learning = !!palace && mode === "learn";
  const stop = palace?.stops[current];

  return (
    <>
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={() => go("/")} aria-label="Back to your palaces">
          <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
        </button>
        <p className="topbar-title">{title}</p>
        {learning && (
          <span className="topbar-meta">
            Learning <span className="num">{formatDuration(learnElapsed)}</span>
          </span>
        )}
      </header>
      <main className="palace">
        <div className="stage-col">
          <Stage
            photoUrl={photoUrl}
            width={size.width}
            height={size.height}
            stops={anchors}
            states={learning ? learnStates : anchors.map(() => "plain")}
            mode={palace ? mode : "building"}
            focus={learning && !overview ? current : null}
            walked={learning ? current : 0}
            scanning={!palace && build.phase.name === "finding"}
            label={learning && stop ? { index: current, text: stop.anchor.label } : null}
            pinLabel={(i) => `Stop ${i + 1} of ${total}: ${anchors[i]?.label ?? ""}`}
            onSelect={learning ? (i) => (setOverview(false), setCurrent(i)) : undefined}
            onSwipe={learning ? (d) => step(d) : undefined}
          >
            {learning && (
              <button
                type="button"
                className="icon-btn"
                onClick={() => setOverview((o) => !o)}
                aria-label={overview ? `Back to stop ${current + 1}` : "See the whole room"}
                aria-pressed={overview}
              >
                {overview ? <Shrink size={18} aria-hidden="true" /> : <Expand size={18} aria-hidden="true" />}
              </button>
            )}
          </Stage>
          {total > 0 && (
            <LineStrip
              states={anchors.map<DotState>((_, i) => (learning ? (i === current ? "current" : i < current ? "seen" : "plain") : "plain"))}
              label={(i) => `Stop ${i + 1}: ${anchors[i].label}`}
              onSelect={learning ? (i) => (setOverview(false), setCurrent(i)) : undefined}
            />
          )}
        </div>
        <section className="panel">
          {!palace && <BuildProgress phase={build.phase} stops={total} items={job?.items.length ?? 0} onRetry={build.retry} />}
          {learning && stop && (
            <>
              <SceneCard
                stop={stop}
                index={current}
                total={total}
                next={palace.stops[current + 1] ?? null}
                onBack={() => step(-1)}
                onNext={() => step(1)}
                onRecall={() => setMode("recall")}
              />
              <p className="made-note">
                {palace.made.prepared ? "Prepared in advance: " : ""}objects found by {palace.made.anchors}; scenes written by {palace.made.scenes}.
              </p>
            </>
          )}
          {palace && mode === "recall" && (
            <div className="notice">
              <h2>Recall arrives in the next build step.</h2>
              <div className="actions">
                <button type="button" className="btn btn-quiet" onClick={() => setMode("learn")}>
                  Back to learning
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function BuildProgress({ phase, stops, items, onRetry }: { phase: BuildPhase; stops: number; items: number; onRetry: () => void }) {
  const findState = phase.name === "finding" ? "active" : phase.name === "too-few" || (phase.name === "failed" && phase.step === "finding") ? "waiting" : "done";
  const writeState = phase.name === "writing" ? "active" : phase.name === "done" ? "done" : "waiting";
  const steps = useMemo(
    () => [
      { state: findState, title: "Finding objects in your room", detail: findState === "done" ? `${stops} stops, joined from left to right.` : "This can take up to half a minute." },
      { state: writeState, title: "Writing a scene for each stop", detail: writeState === "done" ? "Ready." : "A short, strange scene ties each item to its object." },
    ],
    [findState, writeState, stops],
  );
  return (
    <>
      <ol className="steps" aria-live="polite">
        {steps.map((s) => (
          <li key={s.title} data-state={s.state}>
            <span className="step-mark">{s.state === "done" && <Check size={16} strokeWidth={3} aria-hidden="true" />}</span>
            <span className="step-text">
              <strong>{s.title}</strong>
              <span>{s.detail}</span>
            </span>
          </li>
        ))}
      </ol>
      {phase.name === "too-few" && (
        <div className="notice" data-tone="problem" role="alert">
          <h2>
            Found {phase.available} good spots for {items} items.
          </h2>
          <p>Two items never share one object. Shorten the list, or try a photo with more different things in it.</p>
        </div>
      )}
      {phase.name === "failed" && (
        <div className="notice" data-tone="problem" role="alert">
          <h2>{phase.message}</h2>
          <p>Your photo and list are still here.</p>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              Try again
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Missing() {
  return (
    <main className="home">
      <div className="notice" role="alert">
        <h2>This palace isn't on this device.</h2>
        <p>It may have been built in another browser, or the page was reloaded while it was being built.</p>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => go("/")}>
            Back to your palaces
          </button>
        </div>
      </div>
    </main>
  );
}
