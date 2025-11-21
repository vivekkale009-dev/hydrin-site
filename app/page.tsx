export default function Home() {
  return (
    <main
      style={{
        padding: "80px",
        textAlign: "center",
        color: "white",
      }}
    >
      <h1 style={{ fontSize: "3rem", marginBottom: "20px" }}>
        Welcome to Hydrin
      </h1>

      <p style={{ fontSize: "1.4rem" }}>
        Premium hydration. Inspired by purity.
      </p>

      <a
        href="/purity-check"
        style={{
          marginTop: "30px",
          display: "inline-block",
          padding: "12px 28px",
          background: "white",
          color: "black",
          borderRadius: "8px",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Check Purity
      </a>
    </main>
  );
}
