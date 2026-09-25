// One-off connectivity check: confirms the Supabase schema applied and is reachable with
// the anon key. Run with `npx tsx scripts/check-schema.ts`. Not part of the app build.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Minimal .env.local parser so this works without adding dotenv as a dependency.
const envText = readFileSync(".env.local", "utf-8");
const env: Record<string, string> = {};
for (const line of envText.split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2];
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY in .env.local");

const supabase = createClient(url, key);

const tables = [
  "projects",
  "checklist_items",
  "item_subchecks",
  "item_responsible",
  "milestones",
  "project_roles",
  "consultants",
  "pc_sums",
  "timeline_plan",
  "item_files",
  "template_files",
  "milestone_files",
];

async function main() {
  for (const table of tables) {
    const { error, count } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.error(`FAIL ${table}: ${error.message}`);
    } else {
      console.log(`OK   ${table} (${count ?? 0} rows)`);
    }
  }
}

main();
