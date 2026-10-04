import { useEffect, useState } from "react";
import { Home } from "./screens/Home";
import { PalaceScreen } from "./screens/Palace";

// Two screens, two hash routes: #/ (Home) and #/p/<id> (a palace). No router library needed.
type Route = { name: "home" } | { name: "palace"; id: string };

function readRoute(): Route {
  const match = window.location.hash.match(/^#\/p\/([\w-]+)/);
  return match ? { name: "palace", id: match[1] } : { name: "home" };
}

export function go(path: string) {
  window.location.hash = path;
}

export function App() {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return (
    <div className="app">
      {route.name === "palace" ? <PalaceScreen key={route.id} id={route.id} /> : <Home />}
    </div>
  );
}
