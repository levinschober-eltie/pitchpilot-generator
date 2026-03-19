import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import Dashboard from "./components/Dashboard";

const Wizard = lazy(() => import("./components/Wizard"));
const Presentation = lazy(() => import("./components/PresentationRenderer"));
const Settings = lazy(() => import("./components/Settings"));

function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div className="spinner" style={{ width: 40, height: 40, border: "3px solid #D0D0CC", borderTopColor: "#FFCE00", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPresentation = location.pathname.startsWith("/present/");

  if (isPresentation) {
    return (
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/present/:id" element={<Presentation />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 onClick={() => navigate("/")}>
          PITCH<span>PILOT</span>
        </h1>
        <nav>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/")}>Projekte</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate("/new")}>+ Neuer Pitch</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/settings")}>Einstellungen</button>
        </nav>
      </header>
      <main className="app-main">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new" element={<Wizard />} />
            <Route path="/edit/:id" element={<Wizard />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
