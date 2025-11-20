// app/page.tsx
import Hero from "./components/Hero";

export default function Page() {
  return (
    <>
      <main>
        <Hero />
        {/* Simple below-the-fold placeholder sections */}
        <section id="learn" className="section-learn">
          <div className="inner">
            <h2>Purity & Source</h2>
            <p>
              OxyHydra is sourced from protected springs and bottled with minimal contact.
              Our Purity Check provides batch-level analysis you can verify online.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
