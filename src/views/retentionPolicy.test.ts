import { describe, expect, it } from "vitest";
import { eligibleForPermanentDeletionAt, isEligibleForPermanentDeletion, RETENTION_DAYS } from "./retentionPolicy";

describe("retentionPolicy", () => {
  it("keeps the retention period at 30 days", () => {
    expect(RETENTION_DAYS).toBe(30);
  });

  it("computes the eligible-for-permanent-deletion date as 30 days after archivedAt", () => {
    expect(eligibleForPermanentDeletionAt("2026-08-01T00:00:00.000Z")).toBe("2026-08-31T00:00:00.000Z");
  });

  it("rolls over month/year boundaries correctly", () => {
    expect(eligibleForPermanentDeletionAt("2026-12-15T00:00:00.000Z")).toBe("2027-01-14T00:00:00.000Z");
  });

  it("reports not eligible before the 30-day mark", () => {
    const justBefore = new Date("2026-08-30T23:59:59.999Z");
    expect(isEligibleForPermanentDeletion("2026-08-01T00:00:00.000Z", justBefore)).toBe(false);
  });

  it("reports eligible exactly at the 30-day mark", () => {
    const exactlyAt = new Date("2026-08-31T00:00:00.000Z");
    expect(isEligibleForPermanentDeletion("2026-08-01T00:00:00.000Z", exactlyAt)).toBe(true);
  });

  it("reports eligible after the 30-day mark", () => {
    const wellAfter = new Date("2026-09-15T00:00:00.000Z");
    expect(isEligibleForPermanentDeletion("2026-08-01T00:00:00.000Z", wellAfter)).toBe(true);
  });
});
