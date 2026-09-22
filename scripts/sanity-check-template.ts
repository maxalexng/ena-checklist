// One-off sanity check: confirms the ported TS template (src/template/*) produces the
// same step count / item count as the legacy HTML prototype's state-data (183 items,
// 39 steps, per legacy-prototype/submissions-register-2-astrid-hill.html). Run with
// `npx tsx scripts/sanity-check-template.ts`. Not part of the app build.
import { STEPS } from "../src/template/keys";

const totalItems = STEPS.reduce((sum, s) => sum + s.items.length, 0);

console.log(`Steps: ${STEPS.length}`);
console.log(`Total items: ${totalItems}`);
console.log("");
console.log("Per-step item counts:");
for (const s of STEPS) {
  console.log(`  ${s.id.padEnd(20)} ${s.items.length}`);
}

const expectedSteps = 39;
const expectedItems = 183;
if (STEPS.length !== expectedSteps) {
  console.error(`MISMATCH: expected ${expectedSteps} steps, got ${STEPS.length}`);
  process.exitCode = 1;
}
if (totalItems !== expectedItems) {
  console.error(`MISMATCH: expected ${expectedItems} items, got ${totalItems}`);
  process.exitCode = 1;
}
if (!process.exitCode) {
  console.log("\nOK: matches legacy prototype counts.");
}
