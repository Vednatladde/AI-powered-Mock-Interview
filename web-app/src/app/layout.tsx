import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mock Interview Studio | AI-Powered Interview Prep",
  description: "Practice with realistic AI mock interviews, get personalized feedback, and land your dream job.",
  openGraph: {
    title: "Mock Interview Studio | AI-Powered Interview Prep",
    description: "Practice with realistic AI mock interviews, get personalized feedback, and land your dream job.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-surface-lowest text-on-surface antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
