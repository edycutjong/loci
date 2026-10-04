// The shapes everything else agrees on. Shared by the browser app and the two server helpers.

/** A box around an object: [ymin, xmin, ymax, xmax], each 0–1000 of the photo's height (y) or width (x). */
export type Box = [number, number, number, number];

/** An object the AI found in the room photo. */
export type Anchor = { label: string; box: Box };

/** One list item: the text shown, plus other answers the learner accepts ("Vestibulocochlear / auditory"). */
export type Item = { text: string; accepts: string[] };

/** A memory scene written for one stop. */
export type Scene = { scene: string; soundsLike: string };

/** One stop on the route: item k sits on the k-th object along the line. */
export type Stop = { item: Item; anchor: Anchor; scene: string; soundsLike: string };

/** One finished recall of the whole palace. */
export type Walk = {
  at: number;
  firstTry: boolean[];
  afterRetry: boolean[] | null;
  learnMs: number | null;
  recallMs: number;
};

export type ExampleRoomId = "kos" | "studio" | "kitchen";

export type Palace = {
  id: string;
  createdAt: number;
  title: string;
  room: { kind: "example"; id: ExampleRoomId } | { kind: "photo" };
  photo: { width: number; height: number };
  stops: Stop[];
  made: { anchors: string; scenes: string; prepared: boolean };
  walks: Walk[];
};
