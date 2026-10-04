import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { planRoute } from "../../shared/route";
import type { Anchor } from "../../shared/types";
import { go } from "../App";
import { LineStrip } from "../components/LineStrip";
import { Stage, type PinState } from "../components/Stage";
import { ApiError, findAnchors } from "../lib/api";
import { getJob, once, type BuildJob } from "../lib/session";

type Phase = { name: "finding" } | { name: "too-few"; available: number } | { name: "failed"; message: string } | { name: "routed" };

export function PalaceScreen({ id }: { id: string }) {
  const job = getJob(id);
  if (!job) return <Missing />;
  return <Building job={job} />;
}

function Building({ job }: { job: BuildJob }) {
  const [phase, setPhase] = useState<Phase>({ name: "finding" });
  const [stops, setStops] = useState<Anchor[]>([]);
  const [attempt, setAttempt] = useState(0);
  const photo = job.room.kind === "photo" ? job.room.photo : null;

  useEffect(() => {
    if (!photo) return;
    let live = true;
    setPhase({ name: "finding" });
    once(`anchors:${job.id}:${attempt}`, () => findAnchors(photo.base64))
      .then(({ anchors }) => {
        if (!live) return;
        const plan = planRoute(anchors, job.items.length, photo.width, photo.height);
        if (plan.available < job.items.length) {
          setPhase({ name: "too-few", available: plan.available });
          return;
        }
        setStops(plan.stops);
        setPhase({ name: "routed" });
      })
      .catch((err: unknown) => {
        if (live) setPhase({ name: "failed", message: err instanceof ApiError ? err.message : "Something went wrong while reading your photo." });
      });
    return () => {
      live = false;
    };
  }, [job, photo, attempt]);

  if (!photo) return <Missing />;
  const states: PinState[] = stops.map(() => "plain");

  return (
    <>
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={() => go("/")} aria-label="Back to your palaces">
          <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
        </button>
        <p className="topbar-title">{job.title}</p>
      </header>
      <main className="palace">
        <div className="stage-col">
          <Stage
            photoUrl={photo.url}
            width={photo.width}
            height={photo.height}
            stops={stops}
            states={states}
            mode="building"
            scanning={phase.name === "finding"}
            pinLabel={(i) => `Stop ${i + 1}: ${stops[i]?.label ?? ""}, item ${job.items[i]?.text ?? ""}`}
          />
          {stops.length > 0 && <LineStrip states={stops.map(() => "plain")} label={(i) => `Stop ${i + 1}: ${stops[i].label}`} />}
        </div>
        <section className="panel" aria-live="polite">
          <ol className="steps">
            <li data-state={phase.name === "finding" ? "active" : phase.name === "routed" ? "done" : "waiting"}>
              <span className="step-mark">{phase.name === "routed" && <Check size={16} strokeWidth={3} aria-hidden="true" />}</span>
              <span className="step-text">
                <strong>Finding objects in your room</strong>
                <span>{phase.name === "routed" ? `${stops.length} stops, joined from left to right.` : "This can take up to half a minute."}</span>
              </span>
            </li>
          </ol>
          {phase.name === "too-few" && (
            <div className="notice" data-tone="problem" role="alert">
              <h2>
                Found {phase.available} good spots for {job.items.length} items.
              </h2>
              <p>Two items never share one object. Shorten the list, or try a photo with more different things in it.</p>
            </div>
          )}
          {phase.name === "failed" && (
            <div className="notice" data-tone="problem" role="alert">
              <h2>{phase.message}</h2>
              <p>Your photo and list are still here.</p>
              <div className="actions">
                <button type="button" className="btn btn-primary" onClick={() => setAttempt((n) => n + 1)}>
                  Try again
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
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
