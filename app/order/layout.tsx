export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "url('/hero-deep.jpg') center/cover no-repeat fixed",
        padding: "24px 12px",
      }}
    >
      {children}
    </div>
  );
}
