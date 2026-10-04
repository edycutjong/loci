import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { listTitle, parseList } from "../../shared/list";
import { go } from "../App";
import { ListBox } from "../components/ListBox";
import { Mark } from "../components/Mark";
import { RoomPicker } from "../components/RoomPicker";
import { addJob, newId, type RoomChoice } from "../lib/session";

export function Home() {
  const [room, setRoom] = useState<RoomChoice | null>(null);
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseList(text), [text]);

  const blocker = !room ? "Pick a photo of your room first." : parsed.problem;

  function build() {
    if (!room || parsed.problem) return;
    const id = newId();
    addJob({ id, title: listTitle(parsed.items), items: parsed.items, room, exampleListId: null });
    go(`/p/${id}`);
  }

  return (
    <>
      <header className="topbar">
        <a className="wordmark" href="#/" aria-label="Loci, home">
          <Mark />
          Loci
        </a>
      </header>
      <main className="home">
        <section className="home-intro">
          <h1>Your room is the memory palace.</h1>
          <p>
            Photograph your room and paste a list you need to learn. Loci puts each item on a real object along one route, with a strange little
            scene to remember it by. Then the lights go out, and you say the list back.
          </p>
        </section>

        <section className="section" aria-labelledby="new-palace">
          <h2 id="new-palace">New palace</h2>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              build();
            }}
          >
            <RoomPicker value={room} onChange={setRoom} />
            <ListBox text={text} parsed={parsed} onChange={setText} />
            <div className="build-bar">
              <button type="submit" className="btn btn-primary" disabled={!!blocker} aria-describedby="build-why">
                Build my palace
                <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
              </button>
              <p className="why" id="build-why">
                {blocker ?? `${parsed.items.length} items, ready.`}
              </p>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}
