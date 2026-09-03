import { describe, expect, it } from "vitest";
import { formatTimestamp } from "./formatTimestamp";

describe("formatTimestamp", () => {
  it("formats an ISO timestamp as a human-readable date and time", () => {
    expect(formatTimestamp("2026-08-28T09:00:00Z", { locale: "en-US", timeZone: "UTC" })).toBe(
      "Aug 28, 2026, 9:00 AM",
    );
  });

  it("formats a different timestamp correctly, so it's not just echoing a fixture", () => {
    expect(formatTimestamp("2026-08-27T10:00:00Z", { locale: "en-US", timeZone: "UTC" })).toBe(
      "Aug 27, 2026, 10:00 AM",
    );
  });
});
