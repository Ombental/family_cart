/**
 * purgeDeletedItems
 *
 * Scheduled Cloud Function that permanently removes soft-deleted grocery items
 * after their retention period (10 seconds) expires.
 *
 * Schedule: Every 1 minute
 *
 * NOTE: The project spec originally called for the v1 `functions.pubsub.schedule` API,
 * but this project uses firebase-functions v7 which only exposes the v2 API.
 * The logic is identical; only the import/export pattern differs.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

// Ensure Firebase Admin is initialized exactly once
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const purgeDeletedItems = onSchedule('every 1 minutes', async () => {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 10_000);
  const snapshot = await db.collectionGroup('items')
    .where('deleted', '==', true)
    .where('deletedAt', '<', cutoff)
    .get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
});
