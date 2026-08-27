import { describe, expect, it } from "vitest";
import { downloadFilename, toDownloadHref } from "./download";

describe("downloadFilename", () => {
  it("returns ads.txt for O&O properties regardless of name", () => {
    expect(downloadFilename({ name: "example.com", type: "OO" })).toBe("ads.txt");
    expect(downloadFilename({ name: "Anything Else", type: "OO" })).toBe("ads.txt");
  });

  it("returns a slugified partner filename for Partner properties", () => {
    expect(downloadFilename({ name: "Example Ad Partner", type: "PARTNER" })).toBe(
      "example-ad-partner-ads.txt-lines.txt",
    );
  });

  it("slugifies punctuation and mixed case in the partner name", () => {
    expect(downloadFilename({ name: "Acme Ads, Inc.", type: "PARTNER" })).toBe("acme-ads-inc-ads.txt-lines.txt");
  });
});

describe("toDownloadHref", () => {
  it("round-trips the exact content through the data URL", () => {
    const content = "example.com, 1, DIRECT\nreseller.com, 2, RESELLER\n";
    const href = toDownloadHref(content);

    expect(href.startsWith("data:text/plain;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(href.slice(href.indexOf(",") + 1))).toBe(content);
  });
});
