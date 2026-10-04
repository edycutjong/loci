import { useRef, useState } from "react";
import { ImagePlus, LockKeyhole } from "lucide-react";
import { shrinkPhoto, UnreadablePhoto } from "../lib/image";
import type { RoomChoice } from "../lib/session";
import { EXAMPLE_ROOMS } from "../examples/examples";

type Props = {
  value: RoomChoice | null;
  onChange: (room: RoomChoice) => void;
};

export function RoomPicker({ value, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange({ kind: "photo", photo: await shrinkPhoto(file) });
    } catch (err) {
      setError(err instanceof UnreadablePhoto ? err.message : "That photo couldn't be opened. Try another one.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const own = value?.kind === "photo" ? value.photo : null;

  return (
    <div className="field" role="group" aria-labelledby="room-label">
      <div>
        <h2 id="room-label" className="field-label">
          Your room
        </h2>
        <p className="field-hint">A wide photo with lots of different things in it works best. Or borrow one of the example rooms.</p>
      </div>
      <div className="room-choices">
        <button
          type="button"
          className={own ? "room-choice" : "room-choice upload"}
          aria-pressed={own ? "true" : "false"}
          aria-describedby="privacy-note"
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          {own ? (
            <>
              <img src={own.url} alt="" />
              <span className="room-name">
                Your photo
                <small>Tap to change</small>
              </span>
            </>
          ) : (
            <>
              <ImagePlus size={26} strokeWidth={1.75} aria-hidden="true" />
              <span>{busy ? "Opening…" : "Take or choose a photo"}</span>
            </>
          )}
        </button>
        {EXAMPLE_ROOMS.map((r) => (
          <button
            key={r.id}
            type="button"
            className="room-choice"
            aria-pressed={value?.kind === "example" && value.id === r.id ? "true" : "false"}
            onClick={() => onChange({ kind: "example", id: r.id })}
          >
            <img src={`/rooms/${r.id}-thumb.jpg`} alt="" />
            <span className="room-name">
              {r.name}
              <small>AI-generated example</small>
            </span>
          </button>
        ))}
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-label="Photo of your room"
          data-testid="photo-input"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      {error && (
        <p className="list-status" role="alert">
          <span className="problem">{error}</span>
        </p>
      )}
      <p className="privacy" id="privacy-note">
        <LockKeyhole size={15} strokeWidth={2} aria-hidden="true" />
        <span>
          Your photo is sent once to an AI (Google Gemini, or DeepSeek if Gemini is busy) to find objects. It is never stored on a server; your
          palace stays on this device. Leave people and private papers out of the shot.
        </span>
      </p>
    </div>
  );
}
