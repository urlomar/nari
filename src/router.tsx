import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy } from "react";
import RootLayout from "./layouts/RootLayout";

const Landing = lazy(() => import("./pages/Landing"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ScannerRoute = lazy(() => import("./features/scanner/ScannerRoute"));
const ScanResults = lazy(() => import("./pages/ScanResults"));

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/app", element: <Navigate to="/scan" replace /> },
      { path: "/about", element: <About /> },
      { path: "/contact", element: <Contact /> },
      { path: "*", element: <NotFound /> }
    ]
  },
  // Scanner routes render full-screen, outside RootLayout — no marketing header/footer.
  { path: "/scan", element: <ScannerRoute /> },
  { path: "/scan/results", element: <ScanResults /> }
]);

export default router;
