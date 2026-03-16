/**
 * purgeExpiredSummaries
 *
 * Scheduled Cloud Function that permanently removes completed shopping trip
 * summaries after their 30-day retention period expires (NFR-03).
 *
 * Schedule: Every 24 hours
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

// Ensure Firebase Admin is initialized exactly once
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const purgeExpiredSummaries = onSchedule('every 24 hours', async () => {
  const cutoff = admin.firestore.Timestamp.fromMillis(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  );
  const snapshot = await db.collectionGroup('trips')
    .where('status', '==', 'complete')
    .where('completedAt', '<', cutoff)
    .get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`purgeExpiredSummaries: deleted ${snapshot.size} expired trip(s)`);
});
