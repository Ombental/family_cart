/**
 * seed-pilot-users.ts
 *
 * Provisions pilot household and users in Firestore for local testing.
 * Reads configuration from .env.pilot (gitignored).
 *
 * Usage:
 *   npx tsx scripts/seed-pilot-users.ts
 *
 * TODO:
 * - Read VITE_PILOT_HOUSEHOLD_ID and VITE_PILOT_HOUSEHOLD_NAME from .env.pilot
 * - Initialize Firebase Admin SDK with service account or emulator
 * - Create household document in Firestore
 * - Create pilot user documents associated with the household
 * - Log results
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.pilot from project root
config({ path: resolve(__dirname, '..', '.env.pilot') });

const householdId = process.env.VITE_PILOT_HOUSEHOLD_ID;
const householdName = process.env.VITE_PILOT_HOUSEHOLD_NAME;

if (!householdId || !householdName) {
  console.error(
    'Missing required environment variables.\n' +
      'Ensure .env.pilot exists with VITE_PILOT_HOUSEHOLD_ID and VITE_PILOT_HOUSEHOLD_NAME.'
  );
  process.exit(1);
}

console.log(`Pilot household: ${householdName} (${householdId})`);
console.log('TODO: Implement Firestore seeding logic');
