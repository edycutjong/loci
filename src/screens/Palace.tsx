import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Expand, Shrink } from "lucide-react";
import { isRight } from "../../shared/score";
import type { Palace } from "../../shared/types";
import { go } from "../App";
import { LineStrip, type DotState } from "../components/LineStrip";
import { RecallPanel, type Feedback } from "../components/RecallPanel";
import { ResultPanel } from "../components/ResultPanel";
import { SceneCard } from "../components/SceneCard";
import { Stage, type PinState } from "../components/Stage";
import { liveAnchors, liveScenes, usePalaceBuild, type BuildPhase } from "../lib/build";
import { answer, currentStop, fold, startWalk, type Result, type Walking } from "../lib/recall";
import { dropJob, getJob, type BuildJob } from "../lib/session";
import { peekPalace, savePalace, saveWalk, type Loaded } from "../lib/store";
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

function PalaceView({ loaded, job, onBuilt }: { loaded: Loaded | null; job: BuildJob | null; onBuilt: (p: Palace) => void }) {
  const build = usePalaceBuild(loaded ? null : job, onBuilt, SOURCES);
  const palace = loaded?.palace ?? null;

  const photoUrl = loaded?.photoUrl ?? (job?.room.kind === "photo" ? job.room.photo.url : job?.room.kind === "example" ? `/rooms/${job.room.id}.jpg` : "");
  const size = palace?.photo ?? build.size ?? (job?.room.kind === "photo" ? job.room.photo : { width: 4, height: 3 });
  const anchors = palace ? palace.stops.map((s) => s.anchor) : build.route;
  const total = anchors.length;
  const title = palace?.title ?? job?.title ?? "";

  const [mode, setMode] = useState<Mode>("learn");
  const [current, setCurrent] = useState(0);
  const [overview, setOverview] = useState(false);
  const [learnOnly, setLearnOnly] = useState<number[] | null>(null);
  const [learnSpent, setLearnSpent] = useState(0);
  const [learnSince, setLearnSince] = useState<number | null>(null);
  const [walk, setWalk] = useState<Walking | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Learning time runs while Learn is open on a finished palace.
  useEffect(() => {
    if (palace && mode === "learn" && learnSince === null) setLearnSince(Date.now());
  }, [palace, mode, learnSince]);
  const learnNow = useElapsed(learnSince, !!palace && mode === "learn");
  const learnShown = learnSpent + (mode === "learn" ? learnNow : 0);
  const recallNow = useElapsed(walk?.startedAt ?? null, mode === "recall");

  const stopLearnClock = () => {
    const spent = learnSince !== null ? learnSpent + (Date.now() - learnSince) : learnSpent;
    setLearnSpent(spent);
    setLearnSince(null);
    return spent;
  };

  // In Learn, the stops you can step through: all of them, or only the ones to relearn.
  const path = useMemo(() => learnOnly ?? anchors.map((_, i) => i), [learnOnly, anchors]);
  const step = useCallback(
    (delta: number) => {
      setOverview(false);
      setCurrent((c) => {
        const at = Math.max(0, path.indexOf(c));
        return path[Math.min(path.length - 1, Math.max(0, at + delta))] ?? c;
      });
    },
    [path],
  );

  useEffect(() => {
    if (!palace || mode !== "learn") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palace, mode, step]);

  function startRecall(retryStops?: number[]) {
    if (!palace) return;
    stopLearnClock();
    setOverview(false);
    setFeedback(null);
    setWalk(startWalk(total, Date.now(), retryStops));
    setMode("recall");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finish(done: Walking, learnMs: number) {
    if (!palace) return;
    const next = fold(done.kind === "full" ? null : result, done, done.kind === "full" ? (learnMs > 0 ? learnMs : null) : (result?.learnMs ?? null));
    setResult(next);
    setLearnSpent(0);
    void saveWalk(palace.id, { at: next.at, firstTry: next.firstTry, afterRetry: next.afterRetry, learnMs: next.learnMs, recallMs: next.recallMs }, done.kind === "retry");
    setMode("result");
  }

  function respond(right: boolean, kind: Feedback["kind"]) {
    if (!walk || !palace) return;
    const stop = currentStop(walk);
    if (stop === null) return;
    const next = answer(walk, right, Date.now());
    setFeedback({ stop, kind, item: palace.stops[stop].item.text });
    setWalk(next);
    if (next.endedAt !== null) finish(next, learnSpent);
  }

  function toLearn(only: number[] | null = null) {
    setLearnOnly(only);
    setCurrent(only?.[0] ?? 0);
    setOverview(false);
    setWalk(null);
    setMode("learn");
  }

  const learning = !!palace && mode === "learn";
  const asking = walk ? currentStop(walk) : null;
  const finalFlags = result ? (result.afterRetry ?? result.firstTry) : null;

  // What each pin shows in each mode.
  const pinStates: PinState[] = anchors.map((_, i) => {
    if (!palace) return "plain";
    if (mode === "learn") return i === current ? "current" : i < current ? "seen" : "plain";
    if (mode === "recall" && walk) {
      if (walk.outcomes[i] === "right") return "right";
      if (walk.outcomes[i] === "wrong") return "wrong";
      if (i === asking) return "current";
      if (walk.kind === "retry" && !walk.order.includes(i)) return result && (result.afterRetry ?? result.firstTry)[i] ? "right" : "wrong";
      return "ahead";
    }
    if (mode === "result" && finalFlags) return finalFlags[i] ? "right" : "wrong";
    return "plain";
  });
  const lit = pinStates.map((s) => s === "right");
  const allLit = mode === "result" && !!finalFlags && finalFlags.every(Boolean);
  const dots: DotState[] = pinStates.map((s) => (s === "ahead" ? "plain" : s));

  const stop = palace?.stops[current];
  const askingStop = palace && asking !== null ? palace.stops[asking] : null;
  const labelIndex = learning ? current : mode === "recall" ? asking : null;

  return (
    <>
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={() => go("/")} aria-label="Back to your palaces">
          <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
        </button>
        <p className="topbar-title">{title}</p>
        {learning && (
          <span className="topbar-meta" aria-label={`Learning time ${formatDuration(learnShown)}`}>
            Learning <span className="num">{formatDuration(learnShown)}</span>
          </span>
        )}
        {mode === "recall" && walk && (
          <span className="topbar-meta" aria-label={`Recall time ${formatDuration(recallNow)}`}>
            Recall <span className="num">{formatDuration(recallNow)}</span>
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
            states={pinStates}
            mode={palace ? mode : "building"}
            focus={learning && !overview ? current : null}
            walked={learning ? current : mode === "recall" && asking !== null ? asking : mode === "result" ? total : 0}
            lit={lit}
            allLit={allLit}
            scanning={!palace && build.phase.name === "finding"}
            label={labelIndex !== null && anchors[labelIndex] ? { index: labelIndex, text: anchors[labelIndex].label } : null}
            pinLabel={(i) => pinLabel(i, total, anchors[i]?.label ?? "", pinStates[i], palace?.stops[i]?.item.text)}
            onSelect={learning ? (i) => (setOverview(false), setLearnOnly(null), setCurrent(i)) : undefined}
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
              states={dots}
              label={(i) => pinLabel(i, total, anchors[i].label, pinStates[i], undefined)}
              onSelect={learning ? (i) => (setOverview(false), setLearnOnly(null), setCurrent(i)) : undefined}
            />
          )}
        </div>
        <section className="panel">
          {!palace && <BuildProgress phase={build.phase} stops={total} items={job?.items.length ?? 0} onRetry={build.retry} />}
          {palace && (
            <div className="modes" role="group" aria-label="Mode">
              <button type="button" className="mode" aria-pressed={mode === "learn"} onClick={() => mode !== "learn" && toLearn()}>
                Learn
              </button>
              <button type="button" className="mode" aria-pressed={mode !== "learn"} onClick={() => mode === "learn" && startRecall()}>
                Recall, lights out
              </button>
            </div>
          )}
          {learning && stop && (
            <>
              <SceneCard
                stop={stop}
                index={current}
                total={total}
                next={(() => {
                  const at = path.indexOf(current);
                  const n = at >= 0 ? path[at + 1] : undefined;
                  return n !== undefined ? palace.stops[n] : null;
                })()}
                isLast={path.indexOf(current) === path.length - 1}
                onBack={() => step(-1)}
                onNext={() => step(1)}
                onRecall={() => startRecall(learnOnly ?? undefined)}
                finishLabel={learnOnly ? (learnOnly.length === 1 ? "Retry this stop" : `Retry these ${learnOnly.length} stops`) : undefined}
              />
              <p className="made-note">
                {palace.made.prepared ? "Prepared in advance: " : ""}objects found by {palace.made.anchors}; scenes written by {palace.made.scenes}.
              </p>
            </>
          )}
          {mode === "recall" && walk && askingStop && asking !== null && (
            <RecallPanel
              stop={askingStop}
              index={asking}
              asked={walk.pos}
              total={walk.order.length}
              retry={walk.kind === "retry"}
              feedback={feedback}
              onAnswer={(text) => {
                const ok = isRight(text, askingStop.item);
                respond(ok, ok ? "right" : "wrong");
              }}
              onSkip={() => respond(false, "skip")}
            />
          )}
          {mode === "result" && result && (
            <ResultPanel result={result} total={total} onRetry={(stops) => startRecall(stops)} onRelearn={(stops) => toLearn(stops)} onWalkAgain={() => startRecall()} />
          )}
        </section>
      </main>
    </>
  );
}

function pinLabel(i: number, total: number, object: string, state: PinState | undefined, item?: string): string {
  const base = `Stop ${i + 1} of ${total}: the ${object}`;
  if (state === "right") return `${base}, remembered${item ? `: ${item}` : ""}`;
  if (state === "wrong") return `${base}, missed`;
  if (state === "current") return `${base}, current stop`;
  return base;
}

function BuildProgress({ phase, stops, items, onRetry }: { phase: BuildPhase; stops: number; items: number; onRetry: () => void }) {
  const findState = phase.name === "finding" ? "active" : phase.name === "too-few" || (phase.name === "failed" && phase.step === "finding") ? "waiting" : "done";
  const writeState = phase.name === "writing" ? "active" : phase.name === "done" ? "done" : "waiting";
  const steps = [
    { state: findState, title: "Finding objects in your room", detail: findState === "done" ? `${stops} stops, joined from left to right.` : "This can take up to half a minute." },
    { state: writeState, title: "Writing a scene for each stop", detail: writeState === "done" ? "Ready." : "A short, strange scene ties each item to its object." },
  ];
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
