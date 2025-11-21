export const metadata = {
  title: "OxyHydra",
  description: "Premium hydration. Inspired by purity.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
