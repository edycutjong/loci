// The palace builder: objects → route → scenes, with progress, and a retry that repeats only the step that failed.
import { useEffect, useState } from "react";
import { listTitle } from "../../shared/list";
import { planRoute } from "../../shared/route";
import type { Anchor, Palace, Scene } from "../../shared/types";
import { ApiError, findAnchors, writeScenes } from "./api";
import { once, type BuildJob } from "./session";
import { exampleRoom, preparedPalace } from "../examples/examples";

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
  if (job.room.kind === "example") {
    // Example rooms carry the objects the real helper found when the example was prepared.
    const room = exampleRoom(job.room.id);
    return { anchors: room.anchors, model: `${room.model}, prepared in advance`, size: { width: room.width, height: room.height } };
  }
  const { anchors, model } = await findAnchors(job.room.photo.base64);
  return { anchors, model, size: { width: job.room.photo.width, height: job.room.photo.height } };
};

const sameRoute = (a: Anchor[], b: Anchor[]) => a.length === b.length && a.every((x, i) => x.label === b[i].label && x.box.every((v, j) => v === b[i].box[j]));

export const liveScenes: SceneSource = async (job, route) => {
  if (job.room.kind === "example" && job.exampleListId) {
    // Example room + example list: scenes prepared in advance by the real helper, if the route is the same one.
    const prepared = preparedPalace(job.room.id, job.exampleListId);
    if (prepared && sameRoute(prepared.anchors, route)) return { scenes: prepared.scenes, model: `${prepared.model}, prepared in advance`, prepared: true };
  }
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
  const [found, setFound] = useState<{ anchors: Anchor[]; model: string; size: PhotoSize } | null>(null);
  const [route, setRoute] = useState<Anchor[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const [tries, setTries] = useState({ finding: 0, writing: 0 });

  // The list as built: all items, or the first `limit` when the photo has fewer good spots.
  const items = job ? (limit === null ? job.items : job.items.slice(0, limit)) : [];
  const built: BuildJob | null = job && limit !== null ? { ...job, items, title: job.exampleListId ? job.title : listTitle(items) } : job;

  // Step 1: find objects in the photo (or take the example's).
  useEffect(() => {
    if (!job) return;
    let live = true;
    setPhase({ name: "finding" });
    once(`anchors:${job.id}:${tries.finding}`, () => sources.anchors(job))
      .then((answer) => live && setFound(answer))
      .catch((err) => live && setPhase({ name: "failed", step: "finding", message: message(err, "Something went wrong while reading your photo.") }));
    return () => {
      live = false;
    };
    // `sources` is stable per screen; re-running only on a new job or a retry is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, tries.finding]);

  // Step 1b: choose the stops and lay the route (plain code, instant). Shortening the list re-plans without asking the AI again.
  useEffect(() => {
    if (!job || !found) return;
    const plan = planRoute(found.anchors, items.length, found.size.width, found.size.height);
    if (plan.available < items.length) {
      setRoute([]);
      setPhase({ name: "too-few", available: plan.available });
      return;
    }
    setRoute(plan.stops);
    setPhase({ name: "writing" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, found, limit]);

  // Step 2: write a scene for each stop.
  useEffect(() => {
    if (!built || !found || route.length === 0 || route.length !== items.length) return;
    let live = true;
    setPhase({ name: "writing" });
    once(`scenes:${job!.id}:${tries.writing}:${tries.finding}:${route.length}`, () => sources.scenes(built, route))
      .then(({ scenes, model, prepared }) => {
        if (!live) return;
        setPhase({ name: "done" });
        onDone(assemble(built, route, scenes, found.size, { anchors: found.model, scenes: model, prepared }));
      })
      .catch((err) => live && setPhase({ name: "failed", step: "writing", message: message(err, "Something went wrong while writing your scenes.") }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, route, tries.writing]);

  const retry = () => {
    if (phase.name !== "failed") return;
    setTries((t) => (phase.step === "finding" ? { ...t, finding: t.finding + 1 } : { ...t, writing: t.writing + 1 }));
  };

  /** Keep only as many items as the photo has good spots for. */
  const shorten = (count: number) => setLimit(Math.max(1, count));

  return { phase, route, size: found?.size ?? null, retry, shorten, items };
}
