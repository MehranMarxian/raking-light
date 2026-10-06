import { Stage } from "./Stage";
import { useSampleSolve } from "./useSampleSolve";
import "./App.css";

export function App() {
  useSampleSolve();

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
            Work in progress. This surface was solved in your browser when the page opened. Switch
            lamps to see each picture; dragging the lamp around the ring comes next.
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
