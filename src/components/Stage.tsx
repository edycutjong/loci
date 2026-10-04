import { useId, useRef, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { boxCentre } from "../../shared/route";
import type { Anchor, Box } from "../../shared/types";

export type PinState = "plain" | "current" | "seen" | "ahead" | "right" | "wrong";
export type StageMode = "building" | "learn" | "recall" | "result";

type Props = {
  photoUrl: string;
  width: number;
  height: number;
  /** Objects in route order: stop k is stops[k]. */
  stops: Anchor[];
  states: PinState[];
  mode: StageMode;
  /** Learn: the stop the camera walks to; null shows the whole room. */
  focus?: number | null;
  /** Recall/result: which stops have their pool of light on. */
  lit?: boolean[];
  /** Every stop remembered: the whole room comes back. */
  allLit?: boolean;
  /** Segments up to this stop are drawn solid (walked); the rest stay dotted. */
  walked?: number;
  scanning?: boolean;
  listening?: boolean;
  /** The station name shown beside one pin. */
  label?: { index: number; text: string } | null;
  pinLabel: (i: number) => string;
  onSelect?: (i: number) => void;
  onSwipe?: (direction: 1 | -1) => void;
  children?: ReactNode;
};

/** Where the camera goes to look at one object: zoom so the box fills ~60% of the stage, never past the photo edges. */
export function cameraFor(box: Box | null): { z: number; tx: number; ty: number } {
  if (!box) return { z: 1, tx: 0, ty: 0 };
  const [y0, x0, y1, x1] = box.map((v) => v / 1000);
  const z = Math.min(2.4, Math.max(1, Math.min(0.6 / (x1 - x0), 0.6 / (y1 - y0))));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const clamp = (v: number) => Math.min(0, Math.max(1 - z, v));
  return { z, tx: clamp(0.5 - cx * z), ty: clamp(0.5 - cy * z) };
}

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

export function Stage(props: Props) {
  const { photoUrl, width, height, stops, states, mode, focus = null, lit = [], allLit = false, walked = 0 } = props;
  const uid = useId().replace(/:/g, "");
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const focusBox = mode === "learn" && focus !== null && stops[focus] ? stops[focus].box : null;
  const cam = cameraFor(focusBox);
  const centres = stops.map((s) => boxCentre(s.box, width, height));
  // Where each stop lands on screen, as a share of the stage, given the camera.
  const onScreen = centres.map((c) => ({ x: (c.x / width) * cam.z + cam.tx, y: (c.y / height) * cam.z + cam.ty }));

  const dimAt = focusBox
    ? {
        "--cx": pct((focusBox[1] + focusBox[3]) / 2000),
        "--cy": pct((focusBox[0] + focusBox[2]) / 2000),
        "--rw": pct(((focusBox[3] - focusBox[1]) / 1000) * 0.95 + 0.08),
        "--rh": pct(((focusBox[2] - focusBox[0]) / 1000) * 0.95 + 0.08),
      }
    : {};

  const label = props.label && onScreen[props.label.index] ? { ...props.label, at: onScreen[props.label.index] } : null;

  return (
    <div
      className="stage"
      data-mode={mode}
      data-focused={focusBox ? "true" : "false"}
      data-all-lit={allLit ? "true" : "false"}
      style={{ "--ar": width / height, "--z": cam.z, "--tx": pct(cam.tx), "--ty": pct(cam.ty) } as React.CSSProperties}
      onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const start = swipe.current;
        swipe.current = null;
        if (!start || !props.onSwipe) return;
        const dx = e.clientX - start.x;
        if (Math.abs(dx) > 48 && Math.abs(e.clientY - start.y) < 60) props.onSwipe(dx < 0 ? 1 : -1);
      }}
    >
      <div className="camera">
        <img src={photoUrl} alt="" draggable={false} />
        <div
          className="focus-dim"
          style={{
            ...dimAt,
            background: "radial-gradient(ellipse var(--rw) var(--rh) at var(--cx) var(--cy), transparent 62%, rgb(14 21 52 / 0.5) 100%)",
          } as React.CSSProperties}
        />
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id={`${uid}-pool`}>
              <stop offset="0%" stopColor="#000" />
              <stop offset="58%" stopColor="#000" />
              <stop offset="100%" stopColor="#fff" />
            </radialGradient>
            <mask id={`${uid}-lights`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
              <rect width={width} height={height} fill="#fff" />
              {stops.map((s, i) => {
                const c = centres[i];
                const r = Math.max(((s.box[3] - s.box[1]) / 1000) * width, ((s.box[2] - s.box[0]) / 1000) * height) * 0.62 + Math.hypot(width, height) * 0.03;
                return <circle key={i} className="pool" data-on={lit[i] ? "true" : "false"} cx={c.x} cy={c.y} r={r} fill={`url(#${uid}-pool)`} />;
              })}
            </mask>
          </defs>
          <rect className="night" width={width} height={height} mask={`url(#${uid}-lights)`} />
          {centres.slice(1).map((c, i) => {
            const from = centres[i];
            const d = `M${from.x} ${from.y}L${c.x} ${c.y}`;
            const shown = { animationDelay: `${(i + 1) * 70}ms` };
            return (
              <g key={i} className="seg-pair" style={shown}>
                <path className="seg casing" d={d} />
                <path className="seg track" d={d} data-walked={i + 1 <= walked ? "true" : "false"} />
              </g>
            );
          })}
        </svg>
        {props.scanning && <div className="scan" />}
      </div>

      <div className="pins">
        {stops.map((_, i) => (
          <button
            key={i}
            type="button"
            className="pin"
            data-state={states[i] ?? "plain"}
            data-listening={props.listening && states[i] === "current" ? "true" : "false"}
            data-off={onScreen[i].x < -0.02 || onScreen[i].x > 1.02 || onScreen[i].y < -0.02 || onScreen[i].y > 1.02 ? "true" : "false"}
            style={{ "--px": pct(onScreen[i].x), "--py": pct(onScreen[i].y), "--delay": `${i * 70}ms` } as React.CSSProperties}
            aria-label={props.pinLabel(i)}
            aria-current={states[i] === "current" ? "step" : undefined}
            tabIndex={props.onSelect ? 0 : -1}
            onClick={() => props.onSelect?.(i)}
          >
            {states[i] === "right" ? (
              <Check size={17} strokeWidth={3} aria-hidden="true" />
            ) : states[i] === "wrong" ? (
              <X size={17} strokeWidth={3} aria-hidden="true" />
            ) : (
              <span className="pin-num">{i + 1}</span>
            )}
          </button>
        ))}
        {label && (
          <span className="station-label" data-side={label.at.x > 0.62 ? "left" : "right"} style={{ "--px": pct(label.at.x), "--py": pct(label.at.y) } as React.CSSProperties}>
            {label.text}
          </span>
        )}
      </div>
      {props.children && <div className="stage-tools">{props.children}</div>}
    </div>
  );
}
