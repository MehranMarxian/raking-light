import { Controls } from "./Controls";
import { Method } from "./Method";
import { Plates } from "./Plates";
import { Stage } from "./Stage";
import { useSampleSolve } from "./useSampleSolve";
import { useSweep } from "./useSweep";
import "./App.css";

export function App() {
  useSampleSolve();
  useSweep();

  return (
    <div className="page">
      <main className="page__main">
        <section className="hero" aria-labelledby="title">
          <div className="hero__copy">
            <span className="eyebrow">Generative relief</span>
            <h1 id="title">Raking Light</h1>
            <p className="lede">
              One relief surface holds several pictures. Under flat light it reads as even, speckled
              plaster. Bring a lamp down low and move it around the edge, and each picture rises out
              of the shadows at its own angle.
            </p>
            <p className="muted">
              The surface shown here was solved in your browser when this page opened. Drag around
              the ring to move the lamp.
            </p>
            <Controls />
          </div>
          <Stage />
        </section>
        <Plates />
        <Method />
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
