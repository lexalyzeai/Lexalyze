"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const GA_MEASUREMENT_ID = "G-2969X3BWX7";

function sanitizePath(pathname: string) {
  if (/^\/share\/[^/]+/.test(pathname)) return "/share/[token]";
  if (/^\/dashboard\/analysis\/[^/]+/.test(pathname)) return "/dashboard/analysis/[id]";
  if (/^\/dashboard\/history\/[^/]+/.test(pathname)) return "/dashboard/history/[id]";
  return pathname || "/";
}

export default function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;

    const pagePath = sanitizePath(pathname);
    let cancelled = false;
    let attempts = 0;

    function sendPageView() {
      if (cancelled) return;

      if (window.gtag) {
        window.gtag("event", "page_view", {
          page_path: pagePath,
          page_location: `${window.location.origin}${pagePath}`,
          page_title: document.title,
        });
        return;
      }

      attempts += 1;
      if (attempts <= 20) {
        window.setTimeout(sendPageView, 250);
      }
    }

    sendPageView();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
