import { reconcileOrder, STEPS } from "@/template";
import type { TemplateItem, TemplateStep } from "@/template";

/** All item ids across every step, in template order — the fallback when a project has no
 * saved item_order (or a step whose items were never touched). */
export function defaultItemOrder(): string[] {
  return STEPS.flatMap((s) => s.items.map((i) => i.id));
}

/** Effective order of items for a project: its own saved order (if any), reconciled against
 * the current template (drops stale ids, appends new template items at the end) — mirrors
 * effectiveStepOrder in grouping.ts. One flat array covering every step's items, since items
 * only ever reorder within their own step, never across steps. */
export function effectiveItemOrder(savedOrder: string[] | null): string[] {
  const valid = defaultItemOrder();
  if (!savedOrder || savedOrder.length === 0) return valid;
  return reconcileOrder(savedOrder, valid);
}

/** A step's own items, sorted by their position in the (already effective) flat item order. */
export function orderedStepItems(step: TemplateStep, order: string[]): TemplateItem[] {
  const byId = new Map(step.items.map((i) => [i.id, i] as const));
  return order.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
}

/** Moves an item one place up/down within its own step, returning the new full flat
 * item_order array to persist (or null if there's no valid move — already at the edge of
 * its step, or the item/neighbor isn't in `order`). `stepItems` must already be in the
 * step's effective (sorted) order — see orderedStepItems. Mirrors moveStepInOrder. */
export function moveItemInOrder(
  order: string[],
  stepItems: TemplateItem[],
  itemId: string,
  direction: -1 | 1
): string[] | null {
  const idx = stepItems.findIndex((it) => it.id === itemId);
  if (idx === -1) return null;
  const neighborIdx = idx + direction;
  if (neighborIdx < 0 || neighborIdx >= stepItems.length) return null;
  const neighborId = stepItems[neighborIdx].id;

  const a = order.indexOf(itemId);
  const b = order.indexOf(neighborId);
  if (a === -1 || b === -1) return null;

  const next = [...order];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
