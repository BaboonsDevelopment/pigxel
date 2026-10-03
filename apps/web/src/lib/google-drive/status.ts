export type DriveStatus = {
  available: boolean;
  connected: boolean;
  email: string | null;
};

export const DRIVE_UNAVAILABLE: DriveStatus = {
  available: false,
  connected: false,
  email: null,
};

export function connectDriveUrl(next: string) {
  return `/auth/google?next=${encodeURIComponent(next)}`;
}
