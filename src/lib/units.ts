/**
 * Canonical unit list for grocery item entry.
 * Grouped by category; order determines dropdown display order.
 */
export const UNIT_OPTIONS: { label: string; value: string }[] = [
  // Count / packaging
  { label: "pcs", value: "pcs" },
  { label: "pack", value: "pack" },
  { label: "dozen", value: "dozen" },
  // Weight (metric)
  { label: "g", value: "g" },
  { label: "kg", value: "kg" },
  // Volume (metric)
  { label: "ml", value: "ml" },
  { label: "L", value: "L" },
  // Packaged goods
  { label: "can", value: "can" },
  { label: "bottle", value: "bottle" },
  { label: "box", value: "box" },
  { label: "bag", value: "bag" },
  { label: "bunch", value: "bunch" },
  { label: "loaf", value: "loaf" },
];
