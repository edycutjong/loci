// The palace builder: objects → route → scenes, with progress, and a retry that repeats only the step that failed.
import { useEffect, useState } from "react";
import { planRoute } from "../../shared/route";
import type { Anchor, Palace, Scene } from "../../shared/types";
import { ApiError, findAnchors, writeScenes } from "./api";
import { once, type BuildJob } from "./session";

export type BuildPhase =
  | { name: "finding" }
  | { name: "writing" }
  | { name: "too-few"; available: number }
  | { name: "failed"; step: "finding" | "writing"; message: string }
  | { name: "done" };

export type PhotoSize = { width: number; height: number };

/** Objects, prepared in advance or freshly found, with which model found them. */
export type AnchorSource = (job: BuildJob) => Promise<{ anchors: Anchor[]; model: string; size: PhotoSize }>;
/** Scenes, prepared in advance or freshly written. */
export type SceneSource = (job: BuildJob, route: Anchor[]) => Promise<{ scenes: Scene[]; model: string; prepared: boolean }>;

export const liveAnchors: AnchorSource = async (job) => {
  if (job.room.kind !== "photo") throw new Error("No photo to read.");
  const { anchors, model } = await findAnchors(job.room.photo.base64);
  return { anchors, model, size: { width: job.room.photo.width, height: job.room.photo.height } };
};

export const liveScenes: SceneSource = async (job, route) => {
  const { scenes, model } = await writeScenes(route.map((a, i) => ({ object: a.label, item: job.items[i].text })));
  return { scenes, model, prepared: false };
};

const message = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export function assemble(job: BuildJob, route: Anchor[], scenes: Scene[], size: PhotoSize, made: Palace["made"]): Palace {
  return {
    id: job.id,
    createdAt: Date.now(),
    title: job.title,
    room: job.room.kind === "photo" ? { kind: "photo" } : { kind: "example", id: job.room.id },
    photo: size,
    stops: route.map((anchor, i) => ({ item: job.items[i], anchor, scene: scenes[i].scene, soundsLike: scenes[i].soundsLike })),
    made,
    walks: [],
  };
}

export function usePalaceBuild(job: BuildJob | null, onDone: (palace: Palace) => void, sources: { anchors: AnchorSource; scenes: SceneSource }) {
  const [phase, setPhase] = useState<BuildPhase>({ name: "finding" });
  const [route, setRoute] = useState<Anchor[]>([]);
  const [found, setFound] = useState<{ model: string; size: PhotoSize } | null>(null);
  const [tries, setTries] = useState({ finding: 0, writing: 0 });

  // Step 1: find objects and lay the route.
  useEffect(() => {
    if (!job) return;
    let live = true;
    setPhase({ name: "finding" });
    once(`anchors:${job.id}:${tries.finding}`, () => sources.anchors(job))
      .then(({ anchors, model, size }) => {
        if (!live) return;
        const plan = planRoute(anchors, job.items.length, size.width, size.height);
        if (plan.available < job.items.length) return setPhase({ name: "too-few", available: plan.available });
        setFound({ model, size });
        setRoute(plan.stops);
        setPhase({ name: "writing" });
      })
      .catch((err) => live && setPhase({ name: "failed", step: "finding", message: message(err, "Something went wrong while reading your photo.") }));
    return () => {
      live = false;
    };
    // `sources` is stable per screen; re-running only on a new job or a retry is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, tries.finding]);

  // Step 2: write a scene for each stop.
  useEffect(() => {
    if (!job || !found || route.length === 0) return;
    let live = true;
    setPhase({ name: "writing" });
    once(`scenes:${job.id}:${tries.writing}:${tries.finding}`, () => sources.scenes(job, route))
      .then(({ scenes, model, prepared }) => {
        if (!live) return;
        setPhase({ name: "done" });
        onDone(assemble(job, route, scenes, found.size, { anchors: found.model, scenes: model, prepared }));
      })
      .catch((err) => live && setPhase({ name: "failed", step: "writing", message: message(err, "Something went wrong while writing your scenes.") }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, found, route, tries.writing]);

  const retry = () => {
    if (phase.name !== "failed") return;
    setTries((t) => (phase.step === "finding" ? { ...t, finding: t.finding + 1 } : { ...t, writing: t.writing + 1 }));
  };

  return { phase, route, size: found?.size ?? null, retry };
}
