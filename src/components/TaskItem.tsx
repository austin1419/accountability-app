"use client";
// ↑ Needed because this component has an onClick handler (user interaction)

import { categoryColors } from "@/lib/mockData";
import type { Task } from "@/lib/mockData";

type Props = {
  task: Task;
  // onToggle is optional — pass it in when you want the checkbox to be clickable.
  // If you don't pass it, the checkbox renders as visual-only (read-only).
  onToggle?: (id: string) => void;
};

export function TaskItem({ task, onToggle }: Props) {
  const badgeColor = categoryColors[task.category] ?? "bg-gray-100 text-gray-500";

  return (
    <li className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">

      {/* Checkbox button — calls onToggle when clicked */}
      <button
        onClick={() => onToggle?.(task.id)}
        disabled={!onToggle} // disable if no toggle handler provided
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          task.done
            ? "bg-blue-500 border-blue-500"
            : "border-gray-300"
        } ${onToggle ? "cursor-pointer hover:border-blue-400" : "cursor-default"}`}
      >
        {task.done && (
          // Simple SVG checkmark
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Task label and category */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            task.done ? "line-through text-gray-400" : "text-gray-800"
          }`}
        >
          {task.label}
        </p>
        <span className={`mt-0.5 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
          {task.category}
        </span>
      </div>

    </li>
  );
}
