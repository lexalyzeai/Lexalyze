import type { Metadata } from "next";
import "./globals.css";
import AuthRecovery from "@/app/components/AuthRecovery";

export const metadata: Metadata = {
  title: "Lexalyze",
  description: "Lexalyze",
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
        {children}
      </body>
    </html>
  );
}