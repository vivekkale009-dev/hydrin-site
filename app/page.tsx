// app/page.tsx
import Hero from "./components/Hero";

export default function HomePage() {
  return (
    <>
      <main style={{ margin: 0, padding: 0 }}>
        <Hero />

        {/* LEARN MORE SECTION */}
        <section
          id="learn"
          style={{
            padding: "80px 20px",
            textAlign: "center",
            background: "#f9f9f9",
          }}
        >
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <h2>Purity & Source</h2>
            <p style={{ fontSize: "1.2rem", marginTop: "20px" }}>
              OxyHydra is sourced from protected springs and bottled with minimal
              contact. Our Purity Check provides batch-level analysis you can
              verify online.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
