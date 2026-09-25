export type HighlightSegment = { text: string; hit: boolean };

/** Splits `text` into alternating plain / matched segments for every case-insensitive
 * occurrence of `query`, so the search box can wrap each match in a highlight bubble. An
 * empty (or whitespace-only) query returns the whole text as a single plain segment. */
export function splitHighlight(text: string, query: string): HighlightSegment[] {
  const q = query.trim().toLowerCase();
  if (!q || !text) return [{ text, hit: false }];

  const lower = text.toLowerCase();
  const segments: HighlightSegment[] = [];
  let pos = 0;
  let idx = lower.indexOf(q, pos);
  while (idx !== -1) {
    if (idx > pos) segments.push({ text: text.slice(pos, idx), hit: false });
    segments.push({ text: text.slice(idx, idx + q.length), hit: true });
    pos = idx + q.length;
    idx = lower.indexOf(q, pos);
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), hit: false });
  return segments;
}
