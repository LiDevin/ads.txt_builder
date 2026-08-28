import { describe, expect, it, vi } from "vitest";
import { appendButton, appendLink } from "./domHelpers";

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

describe("appendButton", () => {
  it("appends a button styled with the shared .btn class, defaulting to type=button", () => {
    const parent = document.createElement("div");

    const button = appendButton(parent, "Save");

    expect(button.type).toBe("button");
    expect(button.className).toBe("btn");
    expect(button.textContent).toBe("Save");
    expect(parent.querySelector("button")).toBe(button);
  });

  it("sets the type when given, e.g. for a form's submit button", () => {
    const parent = document.createElement("div");

    const button = appendButton(parent, "Create", { type: "submit" });

    expect(button.type).toBe("submit");
  });

  it("wires the onClick handler when given", () => {
    const parent = document.createElement("div");
    const onClick = vi.fn();

    const button = appendButton(parent, "Cancel", { onClick });
    button.click();

    expect(onClick).toHaveBeenCalledOnce();
  });
});
