import { describe, expect, it } from "vitest";
import { nextTodoKey } from "./nextTodo";

const orderedKeys = ["a", "b", "c", "d", "e"];
const todos = (...ks: string[]) => (k: string) => ks.includes(k);
const everythingBelow = () => true;
const below = (...ks: string[]) => (k: string) => ks.includes(k);

describe("nextTodoKey", () => {
  it("starts from the first to-do on screen when nothing has been jumped to yet", () => {
    const next = nextTodoKey({
      orderedKeys,
      isTodo: todos("b", "d"),
      lastKey: null,
      lastOnScreen: false,
      isBelowScreenTop: everythingBelow,
    });
    expect(next).toBe("b");
  });

  it("moves on to the to-do after the last one jumped to while it's still on screen", () => {
    const next = nextTodoKey({
      orderedKeys,
      isTodo: todos("b", "d"),
      lastKey: "b",
      lastOnScreen: true,
      isBelowScreenTop: everythingBelow,
    });
    expect(next).toBe("d");
  });

  it("carries on from an item that is no longer a to-do", () => {
    const next = nextTodoKey({
      orderedKeys,
      isTodo: todos("d"),
      lastKey: "b",
      lastOnScreen: true,
      isBelowScreenTop: everythingBelow,
    });
    expect(next).toBe("d");
  });

  it("follows the page once the last item has scrolled off screen, e.g. after Top", () => {
    const next = nextTodoKey({
      orderedKeys,
      isTodo: todos("b", "d"),
      lastKey: "d",
      lastOnScreen: false,
      isBelowScreenTop: everythingBelow,
    });
    expect(next).toBe("b");
  });

  it("skips to-dos above the screen after scrolling down past them", () => {
    const next = nextTodoKey({
      orderedKeys,
      isTodo: todos("a", "b", "d"),
      lastKey: "a",
      lastOnScreen: false,
      isBelowScreenTop: below("c", "d", "e"),
    });
    expect(next).toBe("d");
  });

  it("returns null after the last to-do", () => {
    const next = nextTodoKey({
      orderedKeys,
      isTodo: todos("b", "d"),
      lastKey: "d",
      lastOnScreen: true,
      isBelowScreenTop: everythingBelow,
    });
    expect(next).toBeNull();
  });

  it("starts over from the very first to-do when asked to", () => {
    const next = nextTodoKey({
      orderedKeys,
      isTodo: todos("b", "d"),
      lastKey: "d",
      lastOnScreen: true,
      isBelowScreenTop: below("e"),
      fromStart: true,
    });
    expect(next).toBe("b");
  });

  it("follows the page when the last item jumped to is no longer listed", () => {
    const next = nextTodoKey({
      orderedKeys,
      isTodo: todos("b", "d"),
      lastKey: "gone",
      lastOnScreen: true,
      isBelowScreenTop: everythingBelow,
    });
    expect(next).toBe("b");
  });

  it("returns null when there are no to-dos", () => {
    const next = nextTodoKey({
      orderedKeys,
      isTodo: todos(),
      lastKey: null,
      lastOnScreen: false,
      isBelowScreenTop: everythingBelow,
    });
    expect(next).toBeNull();
  });
});
