export default function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050507] px-6">
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E0E12]/85 px-8 py-7 text-center shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="mx-auto mb-4 size-10 rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/5 p-2.5">
          <span className="block size-full animate-spin rounded-full border-2 border-[#C9A84C]/25 border-t-[#C9A84C]" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C9A84C]">Lexalyze</p>
        <p className="mt-2 text-sm font-medium text-neutral-400">Preparing your workspace...</p>
      </div>
    </div>
  );
}
