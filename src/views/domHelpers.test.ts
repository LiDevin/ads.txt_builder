import { describe, expect, it } from "vitest";
import { appendLink } from "./domHelpers";

describe("appendLink", () => {
  it("appends an anchor with the given href and text", () => {
    const parent = document.createElement("div");

    appendLink(parent, "#/somewhere", "Go somewhere");

    const link = parent.querySelector("a");
    expect(link?.getAttribute("href")).toBe("#/somewhere");
    expect(link?.textContent).toBe("Go somewhere");
    expect(link?.className).toBe("");
  });

  it("sets the download attribute when given", () => {
    const parent = document.createElement("div");

    appendLink(parent, "data:text/plain,x", "Download", { download: "file.txt" });

    expect(parent.querySelector("a")?.getAttribute("download")).toBe("file.txt");
  });

  it("sets the className when given, so it can be styled like a button", () => {
    const parent = document.createElement("div");

    appendLink(parent, "#/edit", "Edit", { className: "btn" });

    expect(parent.querySelector("a")?.className).toBe("btn");
  });
});
