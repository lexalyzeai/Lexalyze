import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const projectRoot = process.cwd();

process.env.XDG_CONFIG_HOME ??= path.join(projectRoot, ".wrangler-config");

initOpenNextCloudflareForDev();

const productionSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_CLOUDFLARE_URL ||
  process.env.CF_PAGES_URL ||
  "https://lexalyze.pages.dev";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: productionSiteUrl,
    NEXT_PUBLIC_CLOUDFLARE_URL: process.env.NEXT_PUBLIC_CLOUDFLARE_URL,
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
