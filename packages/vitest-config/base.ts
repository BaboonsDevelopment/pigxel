/**
 * Options every Pigxel Vitest project shares: mocks, env and globals start
 * clean in each test, so tests can't leak state into one another.
 */
export const sharedTestOptions = {
  clearMocks: true,
  unstubEnvs: true,
  unstubGlobals: true,
  // Node's experimental localStorage warns whenever a library probes for it;
  // tests use jsdom's storage instead.
  execArgv: process.allowedNodeEnvironmentFlags.has("--experimental-webstorage")
    ? ["--no-experimental-webstorage"]
    : [],
};
