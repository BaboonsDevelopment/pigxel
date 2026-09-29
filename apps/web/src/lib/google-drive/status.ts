/** Whether Google Drive can be used, and whether this person has connected it. */
export type DriveStatus = {
  /** The server is set up for Google (client ID, client secret, secret key). */
  available: boolean;
  connected: boolean;
  /** The Google account the Drive files belong to. */
  email: string | null;
};

export const DRIVE_UNAVAILABLE: DriveStatus = {
  available: false,
  connected: false,
  email: null,
};

/** Starts Google sign-in, account linking or Drive connection, then returns to `next`. */
export function connectDriveUrl(next: string) {
  return `/auth/google?next=${encodeURIComponent(next)}`;
}
