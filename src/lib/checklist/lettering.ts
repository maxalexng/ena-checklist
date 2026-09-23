/** Bijective base-26 letters for an item's position within its step (0 -> "a", 25 -> "z",
 * 26 -> "aa", ...) — so an item can be referred to as "3a" (step 3, item a) instead of the
 * decimal "3.1", which read as a sub-version number rather than a plain list position. */
export function letterForIndex(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(97 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}
