export default function Hero() {
  return (
    <section className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">

      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-900 to-black opacity-90"></div>

      {/* Spotlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] bg-white/5 rounded-full blur-[150px] opacity-40"></div>

      {/* Bottle */}
      <img
        src="/hero-bottle.png"
        alt="Hydrin Bottle"
        className="relative z-10 h-[450px] drop-shadow-[0_0_50px_var(--hydrin-glow)]"
      />

      {/* Text */}
      <div className="absolute bottom-32 text-center z-20 px-4">
        <h2 className="text-white text-5xl font-light tracking-wide">
          Hydration, Elevated.
        </h2>
        <p className="text-neutral-300 mt-4 text-lg">
          Pure. Clean. Perfectly Balanced.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <a
            href="/purity-check"
            className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition"
          >
            Purity Check
          </a>
          <a
            href="#learn-more"
            className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition"
          >
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}
