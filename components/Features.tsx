export default function Features() {
  return (
    <section id="learn-more" className="bg-black text-white py-24">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-10">

        <div className="glass-box p-8">
          <h3 className="text-xl font-semibold mb-3">Ultra-Pure</h3>
          <p className="text-neutral-300">
            Every drop is filtered through advanced multi-stage purification.
          </p>
        </div>

        <div className="glass-box p-8">
          <h3 className="text-xl font-semibold mb-3">Mineral Balanced</h3>
          <p className="text-neutral-300">
            Carefully balanced minerals to enhance hydration naturally.
          </p>
        </div>

        <div className="glass-box p-8">
          <h3 className="text-xl font-semibold mb-3">Laboratory Verified</h3>
          <p className="text-neutral-300">
            Batch-level lab analysis ensures unmatched quality.
          </p>
        </div>

      </div>
    </section>
  );
}
