import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Derive a short code from a household name for compact display.
 *
 * Heuristics:
 * 1. If the name contains a digit+letter pattern (e.g. "Apt 3A"), extract "3A".
 * 2. If the name contains "&" (e.g. "Mom & Dad"), take initials => "M&D".
 * 3. Fallback: first 2 characters uppercased.
 */
export function getShortCode(name: string): string {
  // Try to extract apartment/unit number pattern like "3A", "12B"
  const aptMatch = name.match(/(\d+\w?)/);
  if (aptMatch) return aptMatch[1];

  // If name has "&", take initials of each part
  if (name.includes("&")) {
    const parts = name.split("&").map((p) => p.trim());
    return parts
      .map((p) => p.charAt(0).toUpperCase())
      .join("&");
  }

  // Fallback: first 2 chars
  return name.slice(0, 2).toUpperCase();
}
