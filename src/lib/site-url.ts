const FALLBACK_SITE_URL = "https://app.lexalyzeai.workers.dev";

function normalizeUrl(url?: string | null) {
  if (!url) return "";
  const withProtocol = url.startsWith("http") ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, "");
}

export function getSiteUrl() {
  const configuredUrl = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredUrl) return configuredUrl;

  const cloudflareUrl = normalizeUrl(process.env.NEXT_PUBLIC_CLOUDFLARE_URL);
  if (cloudflareUrl) return cloudflareUrl;

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
