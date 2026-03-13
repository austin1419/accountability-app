"use client";

// ─────────────────────────────────────────────
// LinkCard — clickable wrapper for dashboard cards
//
// Reads selectedDate from DateContext and navigates
// to the target page. Wraps any card content with
// tap/hover affordance and a chevron indicator.
// ─────────────────────────────────────────────

import { useRouter } from "next/navigation";

type Props = {
  href: string;               // target path, e.g. "/tasks" or "/progress"
  children: React.ReactNode;
};

export function LinkCard({ href, children }: Props) {
  const router = useRouter();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => { if (e.key === "Enter") router.push(href); }}
      className="relative group cursor-pointer [&>section]:border-transparent [&>section]:hover:border-[#B8933A]/40 [&>section]:active:bg-[#1A1A1A] [&>section]:transition-colors"
    >
      {/* Chevron affordance */}
      <span className="absolute top-4 right-4 z-10 text-[#807868] group-hover:text-[#B8933A] transition-colors text-lg leading-none">
        ›
      </span>
      {children}
    </div>
  );
}
