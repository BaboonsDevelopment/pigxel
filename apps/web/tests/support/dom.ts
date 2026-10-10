// Runs before every component test file (jsdom), ahead of setup.ts.
import "@testing-library/jest-dom/vitest";
import "@pigxel/vitest-config/polyfills";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
