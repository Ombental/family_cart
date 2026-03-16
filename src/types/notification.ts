/** Notification event types — used in message payloads and future preference toggles. */
export type NotificationType =
  | 'trip_started'
  | 'trip_completed'
  | 'join_request_received'
  | 'join_request_resolved'
  | 'item_added_during_trip';
