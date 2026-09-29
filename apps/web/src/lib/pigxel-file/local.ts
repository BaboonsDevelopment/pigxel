import { PIGXEL_MIME_TYPE, pigxelFileName } from "./format";

/** Saves the file to the computer through the browser's download. */
export function downloadPigxel(name: string, contents: string) {
  const url = URL.createObjectURL(
    new Blob([contents], { type: PIGXEL_MIME_TYPE }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = pigxelFileName(name);
  link.click();
  // Revoked later so the download can start first.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
