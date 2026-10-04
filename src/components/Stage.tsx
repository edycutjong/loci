import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { boxCentre } from "../../shared/route";
import type { Anchor, Box } from "../../shared/types";
import { keepHyphens } from "./text";

export type PinState = "plain" | "current" | "seen" | "ahead" | "right" | "wrong";
export type StageMode = "building" | "learn" | "recall" | "result";

type Props = {
  photoUrl: string;
  /** The photo's coordinate size (the shrunk copy the AI read). */
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

type Size = { w: number; h: number };
export type Camera = { fit: number; scale: number; tx: number; ty: number };

/** Never show more than this many device pixels per source pixel, so a zoomed photo stays sharp
 *  (the example rooms top out at 1536 px; a gentler zoom beats a soft one). */
const MAX_UPSCALE = 1.5;
const MAX_ZOOM = 2.4;

const centred = (offset: number, content: number, frame: number) =>
  content <= frame ? (frame - content) / 2 : Math.min(0, Math.max(frame - content, offset));

/**
 * Where the camera looks, in frame pixels. The whole room fits the frame; walking to a stop fills the frame and
 * zooms until the object takes about 60% of it, capped by the photo's real resolution and the screen's pixel density.
 */
export function cameraFor(box: Box | null, photo: Size, frame: Size, naturalWidth: number, dpr: number): Camera {
  const fit = Math.min(frame.w / photo.w, frame.h / photo.h);
  if (!box || frame.w === 0 || frame.h === 0) {
    return { fit, scale: fit, tx: (frame.w - photo.w * fit) / 2, ty: (frame.h - photo.h * fit) / 2 };
  }
  const cover = Math.max(frame.w / photo.w, frame.h / photo.h);
  const [y0, x0, y1, x1] = box.map((v) => v / 1000);
  const wanted = Math.min((0.6 * frame.w) / ((x1 - x0) * photo.w), (0.6 * frame.h) / ((y1 - y0) * photo.h));
  const sharp = (MAX_UPSCALE * naturalWidth) / (photo.w * dpr);
  const scale = Math.max(cover, Math.min(wanted, fit * MAX_ZOOM, sharp));
  const cx = ((x0 + x1) / 2) * photo.w;
  const cy = ((y0 + y1) / 2) * photo.h;
  return { fit, scale, tx: centred(frame.w / 2 - cx * scale, photo.w * scale, frame.w), ty: centred(frame.h / 2 - cy * scale, photo.h * scale, frame.h) };
}

const px = (v: number) => `${v.toFixed(2)}px`;

export function Stage(props: Props) {
  const { photoUrl, width, height, stops, states, mode, focus = null, lit = [], allLit = false, walked = 0 } = props;
  const uid = useId().replace(/:/g, "");
  const frameRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [frame, setFrame] = useState<Size>({ w: 0, h: 0 });
  const [natural, setNatural] = useState(0);

  // The camera works in the frame's real pixels, so it needs the frame's size (and its changes).
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setFrame({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const photo = { w: width, h: height };
  const focusBox = mode === "learn" && focus !== null && stops[focus] ? stops[focus].box : null;
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const cam = cameraFor(focusBox, photo, frame, natural || width, dpr);
  const z = cam.fit > 0 ? cam.scale / cam.fit : 1;
  const ready = frame.w > 0;

  const centres = stops.map((s) => boxCentre(s.box, width, height));
  // The night overhangs the photo and the camera clips both together: at fractional sizes the photo's edge pixel
  // could paint past the SVG's, which left a thin lit sliver at the frame edge in recall on phones.
  const bleed = Math.max(width, height) * 0.01;
  const offscreen = (i: number) => {
    const x = centres[i].x * cam.scale + cam.tx;
    const y = centres[i].y * cam.scale + cam.ty;
    return x < -12 || y < -12 || x > frame.w + 12 || y > frame.h + 12;
  };
  const dim = focusBox
    ? {
        "--fcx": px(((focusBox[1] + focusBox[3]) / 2000) * width * cam.fit),
        "--fcy": px(((focusBox[0] + focusBox[2]) / 2000) * height * cam.fit),
        "--frw": px(((focusBox[3] - focusBox[1]) / 1000) * width * cam.fit * 0.9 + 28 / z),
        "--frh": px(((focusBox[2] - focusBox[0]) / 1000) * height * cam.fit * 0.9 + 28 / z),
      }
    : {};
  const stageStyle = { "--ar": width / height, "--z": z, "--tx": px(cam.tx), "--ty": px(cam.ty), ...dim } as Record<string, string | number> as React.CSSProperties;
  const label = props.label && centres[props.label.index] ? props.label : null;
  const labelLeft = label ? centres[label.index].x * cam.scale + cam.tx > frame.w * 0.62 : false;

  return (
    <div
      ref={frameRef}
      className="stage"
      data-mode={mode}
      data-ready={ready ? "true" : "false"}
      data-focused={focusBox ? "true" : "false"}
      data-all-lit={allLit ? "true" : "false"}
      style={stageStyle}
      onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const start = swipe.current;
        swipe.current = null;
        if (!start || !props.onSwipe) return;
        const dx = e.clientX - start.x;
        if (Math.abs(dx) > 48 && Math.abs(e.clientY - start.y) < 60) props.onSwipe(dx < 0 ? 1 : -1);
      }}
    >
      <div className="camera" style={{ width: px(width * cam.fit), height: px(height * cam.fit) }}>
        <img src={photoUrl} alt="" draggable={false} onLoad={(e) => setNatural(e.currentTarget.naturalWidth)} />
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            {/* Each pool is black (photo shows) fading to transparent, so overlapping pools merge instead of ringing. */}
            <radialGradient id={`${uid}-pool`}>
              <stop offset="0%" stopColor="#000" stopOpacity="1" />
              <stop offset="55%" stopColor="#000" stopOpacity="1" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <mask id={`${uid}-lights`} maskUnits="userSpaceOnUse" x={-bleed} y={-bleed} width={width + 2 * bleed} height={height + 2 * bleed}>
              <rect x={-bleed} y={-bleed} width={width + 2 * bleed} height={height + 2 * bleed} fill="#fff" />
              {stops.map((s, i) => {
                const c = centres[i];
                const r = Math.max(((s.box[3] - s.box[1]) / 1000) * width, ((s.box[2] - s.box[0]) / 1000) * height) * 0.62 + Math.hypot(width, height) * 0.03;
                return <circle key={i} className="pool" data-on={lit[i] ? "true" : "false"} cx={c.x} cy={c.y} r={r} fill={`url(#${uid}-pool)`} />;
              })}
            </mask>
          </defs>
          <rect className="night" x={-bleed} y={-bleed} width={width + 2 * bleed} height={height + 2 * bleed} mask={`url(#${uid}-lights)`} />
          {centres.slice(1).map((c, i) => {
            const from = centres[i];
            const d = `M${from.x} ${from.y}L${c.x} ${c.y}`;
            return (
              <g key={i} className="seg-pair" style={{ animationDelay: `${(i + 1) * 70}ms` }}>
                <path className="seg casing" d={d} />
                <path className="seg track" d={d} data-walked={i + 1 <= walked ? "true" : "false"} />
              </g>
            );
          })}
        </svg>
        {props.scanning && <div className="scan" />}
      </div>

      <div className="focus-dim" aria-hidden="true" />

      <div className="pins">
        {stops.map((_, i) => (
          <button
            key={i}
            type="button"
            className="pin"
            data-state={states[i] ?? "plain"}
            data-listening={props.listening && states[i] === "current" ? "true" : "false"}
            data-off={ready && offscreen(i) ? "true" : "false"}
            style={{ "--cx": px(centres[i].x * cam.fit), "--cy": px(centres[i].y * cam.fit), "--delay": `${i * 70}ms` } as React.CSSProperties}
            aria-label={props.pinLabel(i)}
            aria-current={states[i] === "current" ? "step" : undefined}
            tabIndex={props.onSelect && !(ready && offscreen(i)) ? 0 : -1}
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
          <span
            className="station-label"
            data-side={labelLeft ? "left" : "right"}
            style={{ "--cx": px(centres[label.index].x * cam.fit), "--cy": px(centres[label.index].y * cam.fit) } as React.CSSProperties}
          >
            {keepHyphens(label.text)}
          </span>
        )}
      </div>
      {props.children && <div className="stage-tools">{props.children}</div>}
    </div>
  );
}
