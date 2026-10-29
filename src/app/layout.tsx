import type { Metadata } from "next";
import { Geist, Geist_Mono, Quicksand } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "WriteWise",
  description: "A writing assistant for security writeups, walkthroughs, and DFIR reports.",
};

// Runs before hydration to avoid a flash of the wrong theme: applies the user's stored
// explicit choice (storage.ts ww:v1:theme) immediately. No stored value = no class added,
// so the CSS media-query fallback in globals.css governs.
const THEME_INIT_SCRIPT = `
try {
  var t = JSON.parse(localStorage.getItem("ww:v1:theme"));
  if (t === "dark" || t === "light") document.documentElement.classList.add(t);
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${quicksand.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
