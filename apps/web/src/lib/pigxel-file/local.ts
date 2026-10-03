import { downloadBlob } from "@/lib/download";
import { PIGXEL_MIME_TYPE, pigxelFileName } from "./format";

export function downloadPigxel(name: string, contents: string) {
  downloadBlob(
    new Blob([contents], { type: PIGXEL_MIME_TYPE }),
    pigxelFileName(name),
  );
}
