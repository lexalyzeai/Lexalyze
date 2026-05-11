'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
      <div className="rounded-xl border border-white/10 bg-[#121212] p-8 text-center max-w-md w-full">
        <p className="text-lg font-medium text-white">Something went wrong</p>
        <p className="mt-2 text-sm text-neutral-400">
          An unexpected error occurred. Please try refreshing.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-[#C9A84C] px-6 py-2 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#d4b55d]"
        >
          Try again
        </button>
      </div>
    </div>
  )
}