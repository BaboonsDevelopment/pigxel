/** Saves `blob` to the computer through the browser's download. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoked later so the download can start first.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
