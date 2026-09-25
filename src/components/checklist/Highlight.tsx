import { splitHighlight } from "@/lib/checklist/highlight";

/** Renders `text` with every match of the checklist search query wrapped in a highlight
 * bubble, so a filtered step shows exactly where the searched words are. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const segments = splitHighlight(text, query);
  if (segments.length === 1 && !segments[0].hit) return <>{text}</>;
  return (
    <>
      {segments.map((seg, i) =>
        seg.hit ? (
          <mark key={i} className="search-hit">
            {seg.text}
          </mark>
        ) : (
          seg.text
        )
      )}
    </>
  );
}
