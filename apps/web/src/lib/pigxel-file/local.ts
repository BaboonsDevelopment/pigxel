import { downloadBlob } from "@/lib/download";
import { PIGXEL_MIME_TYPE, pigxelFileName } from "./format";

/** Saves the file to the computer through the browser's download. */
export function downloadPigxel(name: string, contents: string) {
  downloadBlob(
    new Blob([contents], { type: PIGXEL_MIME_TYPE }),
    pigxelFileName(name),
  );
}
