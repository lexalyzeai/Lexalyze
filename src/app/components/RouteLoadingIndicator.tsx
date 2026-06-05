"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function isInternalNavigation(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  const url = new URL(href, window.location.origin);
  return url.origin === window.location.origin && url.pathname + url.search !== window.location.pathname + window.location.search;
}

export default function RouteLoadingIndicator() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    const clearRouteTimer = window.setTimeout(() => setIsNavigating(false), 0);
    return () => window.clearTimeout(clearRouteTimer);
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || !isInternalNavigation(anchor)) return;

      setIsNavigating(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setIsNavigating(false), 8000);
    }
    function handlePageShow() {
      setIsNavigating(false);
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("pageshow", handlePageShow);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!isNavigating) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100]">
      <div className="h-0.5 w-full overflow-hidden bg-[#C9A84C]/10">
        <div className="h-full w-1/3 animate-[loadingBar_1s_ease-in-out_infinite] rounded-full bg-[#C9A84C]" />
      </div>
      <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-white/[0.08] bg-[#0B0B0D]/90 px-4 py-2 text-xs font-semibold text-neutral-300 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <span className="size-3 animate-spin rounded-full border-2 border-neutral-600 border-t-[#C9A84C]" />
        Loading
      </div>
    </div>
  );
}
