import type { Metadata } from "next";
import "./globals.css";
import AuthRecovery from "@/app/components/AuthRecovery";
import RouteLoadingIndicator from "@/app/components/RouteLoadingIndicator";

export const metadata: Metadata = {
  title: "Lexalyze",
  description: "Lexalyze",
  icons: {
    icon: [
      { url: "/lexalyze-mark.svg", type: "image/svg+xml" },
    ],
    shortcut: "/lexalyze-mark.svg",
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
        <AuthRecovery />
        <RouteLoadingIndicator />
        {children}
      </body>
    </html>
  );
}
