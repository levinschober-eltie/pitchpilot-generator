import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import Dashboard from "./components/Dashboard";

/** Lazy import with automatic retry on chunk load failure (stale deployments) */
function lazyRetry(fn) {
  return lazy(() => fn().catch(() => {
    window.location.reload();
    return new Promise(() => {}); // never resolves — reload handles it
  }));
}

const Wizard = lazyRetry(() => import("./components/Wizard"));
const Presentation = lazyRetry(() => import("./components/PresentationRenderer"));
const SharedPresentation = lazyRetry(() => import("./components/SharedPresentation"));
const NamedShare = lazyRetry(() => import("./components/NamedShare"));
const Settings = lazyRetry(() => import("./components/Settings"));

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
  const isShared = location.pathname.startsWith("/shared");
  const isNamedShare = location.pathname.startsWith("/p/");

  if (isPresentation || isShared || isNamedShare) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/present/:id" element={<Presentation />} />
            <Route path="/shared" element={<SharedPresentation />} />
            <Route path="/p/:slug" element={<NamedShare />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
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
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </ErrorBoundary>
  );
}
