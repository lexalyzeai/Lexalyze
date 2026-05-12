export default function DashboardLoading() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="flex items-center gap-3 text-sm text-neutral-400">
          <span className="size-4 animate-spin rounded-full border-2 border-neutral-600 border-t-[#C9A84C]" />
          Loading...
        </div>
      </div>
    )
  }