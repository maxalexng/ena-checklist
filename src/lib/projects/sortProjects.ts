// Dashboard order: alphabetical by road name, ignoring the house number in
// front ("2 Astrid Hill" sorts under A, "12A Dyson Road" under D).

const LEADING_NUMBER = /^\s*(?:no\.?\s*)?\d+[a-z]?(?:\s*[-/&,]\s*\d+[a-z]?)*\s+/i;

export function roadName(name: string): string {
  return name.replace(LEADING_NUMBER, "").trim();
}

type Sortable = { title: string | null; address: string | null };

export function sortProjectsByRoad<T extends Sortable>(projects: T[]): T[] {
  // Address first: titles are full project descriptions ("PROPOSED ERECTION OF ...").
  const label = (p: T) => p.address || p.title || "";
  return [...projects].sort((a, b) => {
    const byRoad = roadName(label(a)).localeCompare(roadName(label(b)), "en", { sensitivity: "base" });
    if (byRoad !== 0) return byRoad;
    // Same road: fall back to the full name so house numbers run 2, 10, 12A.
    return label(a).localeCompare(label(b), "en", { numeric: true, sensitivity: "base" });
  });
}
