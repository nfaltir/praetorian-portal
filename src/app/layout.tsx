import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { site } from "@/config/site";
import "./globals.css";

/* Self-hosted (OFL licensed, see app/fonts): no request to Google from members' browsers. */
const inter = localFont({
  variable: "--font-inter",
  src: [
    { path: "./fonts/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/inter-latin-wght-italic.woff2", weight: "100 900", style: "italic" },
  ],
});

const cormorant = localFont({
  variable: "--font-cormorant",
  src: [
    { path: "./fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-600-italic.woff2", weight: "600", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: `${site.className} Reunion ${site.reunionYear}`,
    template: `%s | ${site.className} Reunion`,
  },
  description: `Private portal for the ${site.schoolName} ${site.className}.`,
  /* Private site: keep it out of search engines */
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: "#092c2a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
