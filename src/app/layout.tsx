import type { Metadata } from "next";
import "./globals.css";
import { TasksProvider } from "@/context/TasksContext";

export const metadata: Metadata = {
  title: "IronTribe PULSE",
  description: "Track the habits that drive your progress",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable:        true,
    statusBarStyle: "default",
    title:          "IronTribe Pulse",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        <TasksProvider>{children}</TasksProvider>
      </body>
    </html>
  );
}
