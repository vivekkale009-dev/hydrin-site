"use client";

export default function Navbar() {
  return (
    <nav className="w-full fixed top-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <h1 className="text-white text-2xl font-semibold tracking-wide">
          HYDRIN
        </h1>

        <div className="flex items-center gap-6 text-white/80">
          <a href="/purity-check" className="hover:text-white transition">
            Purity Check
          </a>
          <a href="#learn-more" className="hover:text-white transition">
            Learn More
          </a>
        </div>
      </div>
    </nav>
  );
}
