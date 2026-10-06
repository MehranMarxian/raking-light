import { useEffect } from "react";
import { useAppStore } from "../state/store";
import { connectSolver } from "../workers/solverClient";
import { Stage } from "./Stage";
import "./App.css";

export function App() {
  const setSolver = useAppStore((s) => s.setSolver);

  useEffect(() => {
    let connection;
    try {
      connection = connectSolver();
    } catch {
      setSolver("unavailable");
      return;
    }
    let live = true;
    connection.ready.then(
      () => {
        if (live) setSolver("ready");
      },
      () => {
        if (live) setSolver("unavailable");
      },
    );
    return () => {
      live = false;
      connection.dispose();
    };
  }, [setSolver]);

  return (
    <div className="shell">
      <main className="hero">
        <div className="hero__copy">
          <span className="eyebrow">Generative relief</span>
          <h1>Raking Light</h1>
          <p className="lede">
            One relief surface holds several pictures. Under flat light it reads as even, speckled
            plaster. Bring a lamp down low and move it around the edge, and each picture rises out
            of the shadows at its own angle.
          </p>
          <p className="muted hero__note">
            Work in progress. The stage is set and the lamp is lit; the solver that hides pictures
            in the plaster comes next.
          </p>
        </div>
        <Stage />
      </main>

      <footer className="foot">
        <span className="cap">Raking Light · MIT · Mehran Ahmadi, 2026</span>
        <span className="cap">Nothing you upload leaves this browser.</span>
        <a className="cap" href="https://github.com/MehranMarxian/raking-light">
          Source on GitHub
        </a>
      </footer>
    </div>
  );
}
