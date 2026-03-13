import type { Metadata } from "next";
import "./globals.css";
import { DateProvider }  from "@/context/DateContext";
import { TasksProvider } from "@/context/TasksContext";

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
        {/* Static splash blocker — rendered in server HTML so it covers
            the page before any client JS hydrates. SplashScreen.tsx
            removes it on mount; the inline script is a safe fallback
            in case hydration is delayed or fails entirely. */}
        <div
          id="splash-blocker"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "#0D0D0D",
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `setTimeout(function(){var b=document.getElementById("splash-blocker");if(b)b.remove()},6000);`,
          }}
        />

        <DateProvider>
          <TasksProvider>{children}</TasksProvider>
        </DateProvider>
      </body>
    </html>
  );
}
