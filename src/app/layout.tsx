import type { Metadata } from "next";
import "./globals.css";
<<<<<<< HEAD
import { PostHogProvider } from "./providers";
=======
import AuthRecovery from "@/app/components/AuthRecovery";
import RouteLoadingIndicator from "@/app/components/RouteLoadingIndicator";
>>>>>>> 53772b6ce5a9cca4f21f76537401a6c5a2bdd372

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
<<<<<<< HEAD
        <PostHogProvider>{children}</PostHogProvider>
=======
        <AuthRecovery />
        <RouteLoadingIndicator />
        {children}
>>>>>>> 53772b6ce5a9cca4f21f76537401a6c5a2bdd372
      </body>
    </html>
  );
}
