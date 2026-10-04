// Builds that were started on Home and are being run on the Palace screen. Memory only: a build is short,
// and reloading mid-build simply sends you back to Home with your photo and list to try again.
import type { ExampleRoomId, Item } from "../../shared/types";
import type { ShrunkPhoto } from "./image";

export type RoomChoice = { kind: "photo"; photo: ShrunkPhoto } | { kind: "example"; id: ExampleRoomId };

export type BuildJob = {
  id: string;
  title: string;
  items: Item[];
  room: RoomChoice;
  /** Set when the list is one of the example lists (prepared scenes may exist). */
  exampleListId: string | null;
};

const jobs = new Map<string, BuildJob>();

export const addJob = (job: BuildJob) => void jobs.set(job.id, job);
export const getJob = (id: string) => jobs.get(id);
export const dropJob = (id: string) => void jobs.delete(id);

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 13) : Math.random().toString(36).slice(2, 15);

// React's development double-run would start a build step twice; both runs share one promise instead.
const inflight = new Map<string, Promise<unknown>>();
export function once<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = run().finally(() => setTimeout(() => inflight.delete(key), 0));
  inflight.set(key, p);
  return p;
}
