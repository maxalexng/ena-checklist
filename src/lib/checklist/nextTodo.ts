/**
 * The item the "Next to-do" button should jump to, in on-screen order (`orderedKeys`).
 *
 * - While the item the button last landed on (`lastKey`) is still on screen, it carries on
 *   to the next to-do after that one, so repeated clicks walk through every to-do in turn.
 *   `lastKey` is looked up among every item, not just the to-dos, so the walk carries on from
 *   the right place even after that item has been marked done.
 * - Once the user has scrolled away from it (including with the Top button), it follows the
 *   page instead: the first to-do from the top of the screen down (`isBelowScreenTop`).
 * - `fromStart` jumps to the very first to-do, for the click after "no more to-dos".
 *
 * Returns null when there is no to-do left from that point on.
 */
export function nextTodoKey({
  orderedKeys,
  isTodo,
  lastKey,
  lastOnScreen,
  isBelowScreenTop,
  fromStart = false,
}: {
  orderedKeys: string[];
  isTodo: (key: string) => boolean;
  lastKey: string | null;
  lastOnScreen: boolean;
  isBelowScreenTop: (key: string) => boolean;
  fromStart?: boolean;
}): string | null {
  if (fromStart) return orderedKeys.find(isTodo) ?? null;
  if (lastKey !== null && lastOnScreen) {
    const start = orderedKeys.indexOf(lastKey) + 1;
    if (start > 0) return orderedKeys.slice(start).find(isTodo) ?? null;
  }
  return orderedKeys.find((key) => isTodo(key) && isBelowScreenTop(key)) ?? null;
}
