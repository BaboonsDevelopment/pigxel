import { downloadBlob } from "@/lib/download";
import { PIGXEL_MIME_TYPE, pigxelFileName, safeFileBase } from "./format";

/** Saves the tile as a .aseprite file through the browser's download. */
export function downloadAseprite(name: string, contents: Uint8Array) {
  downloadBlob(
    new Blob([new Uint8Array(contents)], { type: "application/octet-stream" }),
    `${safeFileBase(name)}.aseprite`,
  );
}

/** Saves the file to the computer through the browser's download. */
export function downloadPigxel(name: string, contents: string) {
  downloadBlob(
    new Blob([contents], { type: PIGXEL_MIME_TYPE }),
    pigxelFileName(name),
  );
}
