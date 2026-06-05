const FALLBACK_SITE_URL = "https://lexalyze-one.vercel.app";

function normalizeUrl(url?: string | null) {
  if (!url) return "";
  const withProtocol = url.startsWith("http") ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, "");
}

export function getSiteUrl() {
  const configuredUrl = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredUrl) return configuredUrl;

  const vercelUrl = normalizeUrl(process.env.NEXT_PUBLIC_VERCEL_URL);
  if (vercelUrl) return vercelUrl;

  if (typeof window !== "undefined") {
    const browserOrigin = normalizeUrl(window.location.origin);
    if (browserOrigin) return browserOrigin;
  }

  return FALLBACK_SITE_URL;
}

export function getAuthRedirectUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}
