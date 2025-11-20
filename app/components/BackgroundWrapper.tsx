export default function BackgroundWrapper({ children, backgroundStyle }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        ...backgroundStyle, // <-- Ensures your image gets applied
      }}
    >
      {children}
    </div>
  );
}
