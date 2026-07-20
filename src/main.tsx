import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import "./styles/variables.css";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "var(--bg)" }} />}>
      <RouterProvider router={router} />
    </Suspense>
  </React.StrictMode>
);
