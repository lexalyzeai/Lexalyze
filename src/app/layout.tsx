import type { Metadata } from "next";
import AuthRecovery from "@/app/components/AuthRecovery";
import RouteLoadingIndicator from "@/app/components/RouteLoadingIndicator";
import { PostHogProvider } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lexalyze",
  description: "Lexalyze",
  icons: {
    icon: [
      { url: "/lexalyze-tab-icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/lexalyze-tab-icon.svg",
    apple: "/lexalyze-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <PostHogProvider>
          <AuthRecovery />
          <RouteLoadingIndicator />
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
