import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles.css";
const query = new URLSearchParams(window.location.search);
const workspaceLink =
  ["demo", "sample", "view"].some((key) => query.has(key)) ||
  !!window.location.hash;
if (window.location.pathname === "/" && !workspaceLink) {
  window.location.replace(`/landing/${window.location.search}`);
} else
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
