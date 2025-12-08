import { clsx } from "clsx"

export function cn(...inputs) {
  // Simplified: use clsx directly (no tailwind-merge dependency)
  return clsx(inputs)
}
