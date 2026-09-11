import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "../components/navbar";

export const metadata: Metadata = {
  title: "Classroom | Autonomous Code Judge",
  description: "Minimalist open-source GitHub Classroom with automated test evaluation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-base text-textPrimary flex flex-col selection:bg-accent/20 selection:text-accent">
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-borderSubtle py-6 text-center text-xs text-textMuted font-mono">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>classroom_ // autonomous code judge</span>
            <span className="text-gray-600">Built for instructors & students</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
