import type { VersionStore } from "./types";

// Every method rejects by default; pass overrides for the one(s) a test cares about.
export function createFailingVersionStore(overrides: Partial<VersionStore> = {}): VersionStore {
  const notUsed = () => Promise.reject(new Error("not used"));
  return {
    listProperties: notUsed,
    getProperty: notUsed,
    listVersions: notUsed,
    getVersion: notUsed,
    setToken: () => {},
    checkAccess: notUsed,
    saveVersion: notUsed,
    createProperty: notUsed,
    renameProperty: notUsed,
    ...overrides,
  };
}
