

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { JobProvider } from "@/app/context/Jobcontext";
import { SelectedGeneProvider } from "@/app/context/SelectedGeneContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bioinformatics Copilot",
  description: "RNA-seq visual analytics and AI interpretation workspace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col TotalExt-Lang-en">
        <JobProvider>
          <SelectedGeneProvider>
            {children}
          </SelectedGeneProvider>
        </JobProvider>
      </body>
    </html>
  );
}
