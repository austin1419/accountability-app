import type { Metadata } from "next";
import "./globals.css";
import { DateProvider }  from "@/context/DateContext";

export const metadata: Metadata = {
  title: "PULSE",
  description: "Track the habits that drive your progress",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable:        true,
    statusBarStyle: "default",
    title:          "Pulse",
  },
  icons: {
    icon: "/pulse-icon.svg",
    apple: "/pulse-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        <DateProvider>
          {children}
        </DateProvider>
      </body>
    </html>
  );
}
