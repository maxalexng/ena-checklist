/**
 * The item the "Next to-do" button should jump to: the first to-do after `afterKey` in
 * on-screen order, or the first to-do overall when `afterKey` is null or no longer listed.
 * `afterKey` is looked up among every item, not just the to-dos, so the walk carries on from
 * the right place even after the item it last jumped to has been marked done. Returns null
 * when there is no to-do left after that point.
 */
export function nextTodoKey(
  orderedKeys: string[],
  isTodo: (key: string) => boolean,
  afterKey: string | null
): string | null {
  const start = afterKey === null ? 0 : orderedKeys.indexOf(afterKey) + 1;
  for (let i = start; i < orderedKeys.length; i++) {
    if (isTodo(orderedKeys[i])) return orderedKeys[i];
  }
  return null;
}
