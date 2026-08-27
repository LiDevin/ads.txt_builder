import { describe, expect, it } from "vitest";
import { FakeVersionStore } from "./fakeVersionStore";
import { PropertyNotFoundError } from "./types";

describe("FakeVersionStore", () => {
  it("lists properties without their content", async () => {
    const store = new FakeVersionStore([
      { id: "oo-1", name: "Main Site", type: "OO", content: "example.com, 1, DIRECT" },
    ]);

    await expect(store.listProperties()).resolves.toEqual([{ id: "oo-1", name: "Main Site", type: "OO" }]);
  });

  it("gets a single property including its content", async () => {
    const store = new FakeVersionStore([
      { id: "oo-1", name: "Main Site", type: "OO", content: "example.com, 1, DIRECT" },
    ]);

    await expect(store.getProperty("oo-1")).resolves.toEqual({
      id: "oo-1",
      name: "Main Site",
      type: "OO",
      content: "example.com, 1, DIRECT",
    });
  });

  it("throws PropertyNotFoundError for an unknown id", async () => {
    const store = new FakeVersionStore([]);

    await expect(store.getProperty("missing")).rejects.toBeInstanceOf(PropertyNotFoundError);
  });
});
