import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Work_Sans } from "next/font/google";
import localFont from "next/font/local";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

const bbhBartle = localFont({
  src: "../../public/assets/fonts/BBH_Bartle/BBHBartle-Regular.ttf",
  variable: "--font-bbh-bartle",
  fallback: ["serif"],
});

export const metadata: Metadata = {
  title: "EckeSchnecke",
  description: "A minimal consumer web app that turns your Berlin address history into a continuous path that becomes a unique geometric “badge,” exportable as SVG.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${workSans.variable} ${bbhBartle.variable}`}>
      <body
        className="antialiased font-sans"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
            <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
