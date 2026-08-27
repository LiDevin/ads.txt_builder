import { describe, expect, it } from "vitest";
import { diffLines } from "./diffLines";

describe("diffLines", () => {
  it("marks every line unchanged when content is identical", () => {
    const content = "a.com, 1, DIRECT\nb.com, 2, RESELLER";

    expect(diffLines(content, content)).toEqual([
      { type: "unchanged", text: "a.com, 1, DIRECT" },
      { type: "unchanged", text: "b.com, 2, RESELLER" },
    ]);
  });

  it("marks an appended line as added, leaving earlier lines unchanged", () => {
    const before = "a.com, 1, DIRECT";
    const after = "a.com, 1, DIRECT\nb.com, 2, RESELLER";

    expect(diffLines(before, after)).toEqual([
      { type: "unchanged", text: "a.com, 1, DIRECT" },
      { type: "added", text: "b.com, 2, RESELLER" },
    ]);
  });

  it("marks a line inserted in the middle as added, without disturbing surrounding lines", () => {
    const before = "a.com, 1, DIRECT\nc.com, 3, DIRECT";
    const after = "a.com, 1, DIRECT\nb.com, 2, RESELLER\nc.com, 3, DIRECT";

    expect(diffLines(before, after)).toEqual([
      { type: "unchanged", text: "a.com, 1, DIRECT" },
      { type: "added", text: "b.com, 2, RESELLER" },
      { type: "unchanged", text: "c.com, 3, DIRECT" },
    ]);
  });

  it("marks a removed line as removed, leaving the rest unchanged", () => {
    const before = "a.com, 1, DIRECT\nb.com, 2, RESELLER\nc.com, 3, DIRECT";
    const after = "a.com, 1, DIRECT\nc.com, 3, DIRECT";

    expect(diffLines(before, after)).toEqual([
      { type: "unchanged", text: "a.com, 1, DIRECT" },
      { type: "removed", text: "b.com, 2, RESELLER" },
      { type: "unchanged", text: "c.com, 3, DIRECT" },
    ]);
  });

  it("shows an in-place edit as a removal of the old line and an addition of the new one", () => {
    const before = "a.com, 1, DIRECT\nb.com, 2, RESELLER";
    const after = "a.com, 1, DIRECT\nb.com, 999, RESELLER";

    expect(diffLines(before, after)).toEqual([
      { type: "unchanged", text: "a.com, 1, DIRECT" },
      { type: "removed", text: "b.com, 2, RESELLER" },
      { type: "added", text: "b.com, 999, RESELLER" },
    ]);
  });

  it("treats entirely new content as all added when starting from empty", () => {
    expect(diffLines("", "a.com, 1, DIRECT")).toEqual([{ type: "added", text: "a.com, 1, DIRECT" }]);
  });

  it("treats fully cleared content as all removed", () => {
    expect(diffLines("a.com, 1, DIRECT", "")).toEqual([{ type: "removed", text: "a.com, 1, DIRECT" }]);
  });
});
