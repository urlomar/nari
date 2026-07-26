import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import { GrainOverlay } from "./components/GrainOverlay";
import { ThemeProvider } from "./styles/useTheme";
import "./styles/variables.css";
import "./styles/global.css";

// Browsers restore scroll position on reload by default; the app wants a
// full scroll-to-top instead (ScrollToTop.tsx only covers in-app route
// changes, not reloads — that's a separate, one-time browser behavior).
history.scrollRestoration = "manual";
window.scrollTo(0, 0);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <Suspense fallback={<div style={{ minHeight: "100dvh", background: "var(--bg)" }} />}>
        <RouterProvider router={router} />
      </Suspense>
      <GrainOverlay />
    </ThemeProvider>
  </React.StrictMode>
);
