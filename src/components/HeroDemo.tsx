import { useEffect, useRef, useState } from "react";
import { exampleRoom, preparedPalace } from "../examples/examples";
import { Stage, type PinState, type StageMode } from "./Stage";

const TICK_MS = 520;
const LIGHTS_ON_TICKS = 4;
const HOLD_TICKS = 6;

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(query.matches);
    query.addEventListener("change", on);
    return () => query.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** The product showing its own mechanic: the student room's route, lights out, each stop re-lit, the room back. */
export function HeroDemo() {
  const room = exampleRoom("kos");
  const prepared = preparedPalace("kos", "cranial-nerves");
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [tick, setTick] = useState(0);
  const total = prepared?.anchors.length ?? 0;
  const loop = LIGHTS_ON_TICKS + 1 + total + HOLD_TICKS;

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !visible || total === 0 || new URLSearchParams(window.location.search).has("still")) return;
    const id = window.setInterval(() => setTick((t) => (t + 1) % loop), TICK_MS);
    return () => window.clearInterval(id);
  }, [reduced, visible, total, loop]);

  if (!prepared) return null;
  // "?still=7" freezes the demo with 7 stops lit (for screenshots and video frames).
  const still = Number(new URLSearchParams(window.location.search).get("still"));
  const frozen = Number.isInteger(still) && still > 0 ? Math.min(total, still) : null;
  const lightsOn = frozen === null && !reduced && tick < LIGHTS_ON_TICKS;
  const litCount = frozen ?? (reduced ? total : Math.max(0, Math.min(total, tick - LIGHTS_ON_TICKS - 1)));
  const mode: StageMode = lightsOn ? "learn" : litCount >= total ? "result" : "recall";
  const states: PinState[] = prepared.anchors.map((_, i) => (lightsOn ? "plain" : i < litCount ? "right" : i === litCount ? "current" : "ahead"));

  return (
    <div ref={box} role="img" aria-label="An example palace in an AI-generated student room: twelve stops on real objects, joined by one route. With the lights out, each remembered item lights its stop again, until the whole room is back.">
      <div aria-hidden="true">
        <Stage
          photoUrl={`/rooms/${room.id}.jpg`}
          width={room.width}
          height={room.height}
          stops={prepared.anchors}
          states={states}
          mode={mode}
          lit={states.map((s) => s === "right")}
          allLit={mode === "result"}
          walked={lightsOn ? 0 : litCount}
          pinLabel={(i) => `Stop ${i + 1}`}
        />
      </div>
    </div>
  );
}
