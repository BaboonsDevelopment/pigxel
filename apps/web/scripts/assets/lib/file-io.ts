import { readFileSync, writeFileSync } from "node:fs";

const TRANSIENT = new Set(["UNKNOWN", "EBUSY", "EACCES", "EPERM"]);

/** Windows may briefly deny an asset file while another process scans it. */
export function retryFileOperation<T>(operation: () => T): T {
  for (let attempt = 0; ; attempt++) {
    try {
      return operation();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt >= 3 || !code || !TRANSIENT.has(code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10 * (attempt + 1));
    }
  }
}

export const readAssetText = (file: string) =>
  retryFileOperation(() => readFileSync(file, "utf8"));

export const writeAssetText = (file: string, text: string) =>
  retryFileOperation(() => writeFileSync(file, text));
