import Link from "next/link";
import BrandMark from "@/app/components/BrandMark";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050507] px-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101010] p-7 text-center shadow-2xl">
        <BrandMark href="/" size="sm" className="justify-center" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.25em] text-[#C9A84C]">404</p>
        <h1 className="mt-3 text-2xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-400">
          This page does not exist or may have moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg bg-[#C9A84C] px-5 py-2.5 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d]"
        >
          Go home
        </Link>
      </section>
    </main>
  );
}
