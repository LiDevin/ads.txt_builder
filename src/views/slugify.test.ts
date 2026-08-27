import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Example Ad Partner")).toBe("example-ad-partner");
  });

  it("collapses punctuation into single hyphens and trims leading/trailing ones", () => {
    expect(slugify("Acme Ads, Inc.")).toBe("acme-ads-inc");
  });

  it("returns an empty string for content with no letters or digits", () => {
    expect(slugify("!!!")).toBe("");
  });
});
