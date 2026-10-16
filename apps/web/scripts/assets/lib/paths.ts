import { join } from "node:path";

export const ASSETS_DIR = import.meta.dirname
  ? join(import.meta.dirname, "..")
  : join(process.cwd(), "scripts", "assets");
