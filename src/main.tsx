import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/piazzolla/opsz.css";
import "@fontsource-variable/piazzolla/opsz-italic.css";
import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import "@fontsource/atkinson-hyperlegible-mono/500.css";
import "@fontsource/atkinson-hyperlegible-mono/700.css";
import "./styles/tokens.css";
import "./styles/app.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
