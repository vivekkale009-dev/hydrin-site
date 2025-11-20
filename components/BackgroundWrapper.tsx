export default function BackgroundWrapper({ children, backgroundStyle = {} }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        ...backgroundStyle,
      }}
    >
      <div style={{ width: "100%" }}>{children}</div>
    </div>
  );
}
