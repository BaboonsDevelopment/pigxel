import { PIGXEL_MIME_TYPE, pigxelFileName } from "./format";

/**
 * Google Drive from the browser. Access tokens come from Pigxel's server, which
 * keeps the person's linked Google account, so no Google popup is needed here
 * and autosave keeps working across reloads. The `drive.file` scope only
 * reaches files Pigxel created.
 */

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

export type DriveFile = { id: string; name: string; modifiedTime?: string };

export class DriveError extends Error {
  /** True when the person must connect (or reconnect) their Google account. */
  needsConnect = false;
}

function notConnected() {
  const error = new DriveError(
    "Connect your Google account to save in Google Drive. Your changes are kept in this browser.",
  );
  error.needsConnect = true;
  return error;
}

let token: { value: string; expiresAt: number } | undefined;

async function getToken(): Promise<string> {
  if (token && token.expiresAt > Date.now()) return token.value;
  let response: Response;
  try {
    response = await fetch("/api/google-drive/token", { method: "POST" });
  } catch {
    throw new DriveError("Couldn’t reach Pigxel. Check your connection.");
  }
  if (response.status === 409) throw notConnected();
  if (response.status === 401)
    throw new DriveError("You’ve been signed out. Log in again to use Drive.");
  if (!response.ok)
    throw new DriveError("Google Drive isn’t available right now. Try again.");
  const body = (await response.json()) as {
    accessToken: string;
    expiresIn: number;
  };
  token = {
    value: body.accessToken,
    expiresAt: Date.now() + (body.expiresIn - 60) * 1000,
  };
  return token.value;
}

/** Pigxel files in the person's Drive, most recently changed first. */
export async function listDriveFiles(): Promise<DriveFile[]> {
  const query = new URLSearchParams({
    q: `mimeType='${PIGXEL_MIME_TYPE}' and trashed=false`,
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "100",
    spaces: "drive",
  });
  const response = await driveFetch(`${DRIVE_API}?${query}`);
  const body = (await response.json()) as { files?: DriveFile[] };
  return body.files ?? [];
}

export async function readDriveFile(id: string): Promise<string> {
  const response = await driveFetch(
    `${DRIVE_API}/${encodeURIComponent(id)}?alt=media`,
  );
  return response.text();
}

/** Creates a file in the root of the person's Drive, or updates `id` when given. */
export async function saveDriveFile(
  file: { id?: string; name: string },
  contents: string,
): Promise<DriveFile> {
  const metadata = {
    name: pigxelFileName(file.name),
    mimeType: PIGXEL_MIME_TYPE,
  };
  const body = () => {
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    );
    form.append("file", new Blob([contents], { type: PIGXEL_MIME_TYPE }));
    return form;
  };
  const fields = "fields=id,name,modifiedTime";
  const url = file.id
    ? `${UPLOAD_API}/${encodeURIComponent(file.id)}?uploadType=multipart&${fields}`
    : `${UPLOAD_API}?uploadType=multipart&${fields}`;
  const response = await driveFetch(url, () => ({
    method: file.id ? "PATCH" : "POST",
    body: body(),
  }));
  return (await response.json()) as DriveFile;
}

/** Calls Drive, fetching a fresh token and retrying once if Google rejects the cached one. */
async function driveFetch(
  url: string,
  init: () => RequestInit = () => ({}),
  retried = false,
): Promise<Response> {
  const accessToken = await getToken();
  let response: Response;
  try {
    response = await fetch(url, {
      ...init(),
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new DriveError("Couldn’t reach Google Drive. Check your connection.");
  }
  if (response.status === 401 && !retried) {
    token = undefined;
    return driveFetch(url, init, true);
  }
  if (response.status === 401) throw notConnected();
  if (response.status === 404)
    throw new DriveError("That file is no longer in Google Drive.");
  if (!response.ok)
    throw new DriveError(
      response.status === 403
        ? "Google Drive refused access to this file."
        : "Google Drive couldn’t complete the request. Try again.",
    );
  return response;
}
