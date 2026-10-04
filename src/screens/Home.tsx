import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { listTitle, parseList } from "../../shared/list";
import { go } from "../App";
import { HeroDemo } from "../components/HeroDemo";
import { ListBox } from "../components/ListBox";
import { Mark } from "../components/Mark";
import { PalaceList } from "../components/PalaceList";
import { RoomPicker } from "../components/RoomPicker";
import { addJob, newId, type RoomChoice } from "../lib/session";
import { deletePalace, listPalaces, type Loaded } from "../lib/store";
import { EXAMPLE_LISTS } from "../examples/lists";

export function Home() {
  const [room, setRoom] = useState<RoomChoice | null>(null);
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseList(text), [text]);
  const [palaces, setPalaces] = useState<Loaded[]>([]);

  useEffect(() => {
    let live = true;
    void listPalaces().then((list) => live && setPalaces(list));
    return () => {
      live = false;
    };
  }, []);

  async function remove(id: string) {
    await deletePalace(id);
    setPalaces((list) => list.filter((p) => p.palace.id !== id));
  }

  const blocker = !room ? "Pick a photo of your room first." : parsed.problem;
  // An example list stays an example (with prepared scenes) only while its text is unchanged.
  const exampleList = EXAMPLE_LISTS.find((l) => l.text === text) ?? null;

  function build() {
    if (!room || parsed.problem) return;
    const id = newId();
    addJob({ id, title: exampleList?.name ?? listTitle(parsed.items), items: parsed.items, room, exampleListId: exampleList?.id ?? null });
    go(`/p/${id}`);
  }

  function tryExample() {
    const list = EXAMPLE_LISTS[0];
    const id = newId();
    addJob({ id, title: list.name, items: parseList(list.text).items, room: { kind: "example", id: "kos" }, exampleListId: list.id });
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
        <section className="hero">
          <div className="home-intro">
            <h1>Your room is the memory palace.</h1>
            <p>
              Photograph your room and paste a list you need to learn. Loci puts each item on a real object along one route, with a strange
              little scene to remember it by. Then the lights go out, and you say the list back.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary" onClick={tryExample}>
                Try it: 12 cranial nerves
                <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
              </button>
              <a className="btn btn-text" href="#new-palace-form" onClick={(e) => (e.preventDefault(), document.getElementById("new-palace")?.scrollIntoView({ behavior: "smooth" }))}>
                <ArrowDown size={17} strokeWidth={2} aria-hidden="true" />
                Use your own room
              </a>
            </div>
          </div>
          <figure className="hero-demo">
            <HeroDemo />
            <figcaption>An AI-generated example room. In recall the lights go out, and each item you remember turns its stop back on.</figcaption>
          </figure>
        </section>

        {palaces.length > 0 && (
          <section className="section" aria-labelledby="your-palaces">
            <h2 id="your-palaces">Your palaces</h2>
            <PalaceList palaces={palaces} onDelete={remove} />
          </section>
        )}

        <section className="section" aria-labelledby="new-palace">
          <h2 id="new-palace">New palace</h2>
          <form
            id="new-palace-form"
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              build();
            }}
          >
            <RoomPicker value={room} onChange={setRoom} />
            <ListBox text={text} parsed={parsed} onChange={setText}>
              <div className="chips" role="group" aria-label="Example lists">
                {EXAMPLE_LISTS.map((l) => (
                  <button key={l.id} type="button" className="chip" aria-pressed={exampleList?.id === l.id} onClick={() => setText(l.text)} title={l.note}>
                    {l.name}
                  </button>
                ))}
              </div>
            </ListBox>
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
