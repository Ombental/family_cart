export const MAX_HOUSEHOLD_COLORS = 8;

/**
 * Structured color set for each household. Used for dots, tags, and pills.
 */
export interface HouseholdColorSet {
  dot: string;       // Color bar + dot
  tagBg: string;     // Tag/pill background
  tagBorder: string; // Tag/pill border
  tagText: string;   // Tag/pill text
}

/**
 * Predefined household color sets. Assigned round-robin as households join a group.
 */
const HOUSEHOLD_COLOR_SETS: HouseholdColorSet[] = [
  { dot: "#5eb1ef", tagBg: "#e6f4fe", tagBorder: "#8ec8f6", tagText: "#0d74ce" },  // Blue
  { dot: "#ffba18", tagBg: "#feebe7", tagBorder: "#ffc182", tagText: "#ef5f00" },  // Orange
  { dot: "#ab4aba", tagBg: "#f2e2fc", tagBorder: "#be93e4", tagText: "#953ea3" },  // Purple
  { dot: "#e93d82", tagBg: "#fee9f5", tagBorder: "#f3c6e2", tagText: "#cb1d63" },  // Crimson
  { dot: "#12a594", tagBg: "#e0f8f3", tagBorder: "#83cdc1", tagText: "#067a6f" },  // Teal
  { dot: "#3e63dd", tagBg: "#edf2fe", tagBorder: "#aec0f5", tagText: "#3451b2" },  // Indigo
  { dot: "#d6409f", tagBg: "#feeef8", tagBorder: "#f3c6e2", tagText: "#cd1d8d" },  // Pink
  { dot: "#00a2c7", tagBg: "#e1f8fa", tagBorder: "#8ac7d7", tagText: "#0078a1" },  // Cyan
] as const;

/**
 * Pick a color for a new household based on how many already exist in the group.
 * Returns the dot color string for backward compatibility.
 */
export function pickHouseholdColor(existingCount: number): string {
  return HOUSEHOLD_COLOR_SETS[existingCount % HOUSEHOLD_COLOR_SETS.length].dot;
}

/**
 * Pick the full color set for a household based on how many already exist in the group.
 */
export function pickHouseholdColorSet(existingCount: number): HouseholdColorSet {
  return HOUSEHOLD_COLOR_SETS[existingCount % HOUSEHOLD_COLOR_SETS.length];
}
