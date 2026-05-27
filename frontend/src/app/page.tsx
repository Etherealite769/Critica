export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl space-y-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Capstone Critica
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            A simple landing page so you can see the frontend in action.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-300">
            This is a dummy homepage for the Next.js app. You can use it as a
            placeholder while the real UI and API connections are being built.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <a
              href="/auth"
              className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Get Started
            </a>
            <a
              href="#"
              className="rounded-full border border-slate-700 px-6 py-3 font-semibold text-white transition hover:border-slate-500"
            >
              View Demo
            </a>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { title: "Frontend", text: "Next.js app ready to render and iterate on." },
            { title: "Backend", text: "Django API can connect here as features come online." },
            { title: "Results", text: "A visible placeholder so you can confirm the UI is working." },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5"
            >
              <h2 className="text-lg font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
