export default function TestimonialSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="glass rounded-[3rem] p-12 md:p-20 relative overflow-hidden text-center">
          {/* Decorative background quote mark */}
          <div
            className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none select-none"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-[10rem]">format_quote</span>
          </div>

          <div className="max-w-3xl mx-auto relative">
            {/* 5-star rating */}
            <div className="flex justify-center gap-1 mb-8" aria-label="5 out of 5 stars">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined text-primary fill-1 text-2xl"
                  aria-hidden="true"
                >
                  star
                </span>
              ))}
            </div>

            {/* Quote */}
            <blockquote>
              <p className="text-3xl md:text-4xl font-bold italic leading-relaxed text-white mb-10">
                &ldquo;The AI calling agent qualified three seller leads and booked two listing
                appointments in its first week. It pays for itself 10x over every single
                month.&rdquo;
              </p>

              {/* Attribution */}
              <footer className="flex items-center justify-center gap-4">
                <div
                  className="w-16 h-16 rounded-full bg-slate-800 border-2 border-white/10"
                  aria-hidden="true"
                />
                <div className="text-left">
                  <cite className="font-bold text-xl text-white not-italic">Marcus Thorne</cite>
                  <p className="text-slate-400 text-sm mt-0.5">Director at Thorne Realty Group</p>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
}
