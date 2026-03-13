"use client";

import { TasksProvider } from "@/context/TasksContext";

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return <TasksProvider>{children}</TasksProvider>;
}
