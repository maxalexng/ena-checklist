import { describe, expect, it } from "vitest";
import { nextTodoKey } from "./nextTodo";

const keys = ["a", "b", "c", "d", "e"];
const todos = (...ks: string[]) => (k: string) => ks.includes(k);

describe("nextTodoKey", () => {
  it("starts from the first to-do when nothing has been jumped to yet", () => {
    expect(nextTodoKey(keys, todos("b", "d"), null)).toBe("b");
  });

  it("moves on to the to-do after the last one jumped to", () => {
    expect(nextTodoKey(keys, todos("b", "d"), "b")).toBe("d");
  });

  it("carries on from an item that is no longer a to-do", () => {
    expect(nextTodoKey(keys, todos("d"), "b")).toBe("d");
  });

  it("returns null after the last to-do", () => {
    expect(nextTodoKey(keys, todos("b", "d"), "d")).toBeNull();
  });

  it("starts over when the last item jumped to is no longer listed", () => {
    expect(nextTodoKey(keys, todos("b", "d"), "gone")).toBe("b");
  });

  it("returns null when there are no to-dos", () => {
    expect(nextTodoKey(keys, todos(), null)).toBeNull();
  });
});
