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
    <li className="flex items-center gap-3 py-3 border-b border-[#252525] last:border-0">

      {/* Checkbox button — calls onToggle when clicked */}
      <button
        onClick={() => onToggle?.(task.id)}
        disabled={!onToggle} // disable if no toggle handler provided
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
        className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          task.done
            ? "bg-[#B8933A] border-[#B8933A]"
            : "border-[#7A7060]"
        } ${onToggle ? "cursor-pointer hover:border-[#C9A44A]" : "cursor-default"}`}
      >
        {task.done && (
          // Simple SVG checkmark
          <svg className="w-3 h-3 text-[#0D0D0D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Task label and category */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            task.done ? "line-through text-[#807868]" : "text-[#DDD5C0]"
          }`}
        >
          {task.label}
        </p>
        <span className={`mt-0.5 inline-block text-xs font-medium px-2 py-0.5 rounded ${badgeColor}`}>
          {task.category}
        </span>
      </div>

    </li>
  );
}
