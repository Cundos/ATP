/**
 * Mock for 'server-only' package in Vitest test environment.
 *
 * In production Next.js builds, importing 'server-only' causes a build error
 * if the module is included in the client bundle. In tests, this guard is
 * meaningless (tests run in Node.js, not a browser), so we export a no-op.
 *
 * This file is referenced by vitest.config.mts as a module alias.
 */
export {};
