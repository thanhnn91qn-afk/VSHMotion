/**
 * Every script in scenes/ must still pass the director and the scene checks.
 * A change to director.mjs, art.mjs or scene-check.mjs that breaks an old clip
 * shows up here in a second, instead of at the next rebuild of that clip.
 *
 *   node tools/test-scenes.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { direct } from "../director.mjs";
import { checkScenes } from "../scene-check.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Both builders register the same 13 style names.
const STYLES = ["cinematic", "shot", "kinetic", "chart", "stat", "lines", "glass",
  "caption", "split", "wipe", "card", "logo", "plain"];

let bad = 0;
for (const f of readdirSync(join(ROOT, "scenes")).filter((n) => n.endsWith(".json")).sort()) {
  const cfg = JSON.parse(readFileSync(join(ROOT, "scenes", f), "utf8"));
  direct(cfg, { portrait: !/16x9|duthi|zona/.test(f) });
  const { errors, warns } = checkScenes(cfg, { styles: STYLES, root: ROOT });
  if (errors.length) bad++;
  console.log(`${errors.length ? "LOI " : "dat "} ${f}${warns.length ? `  (${warns.length} canh bao)` : ""}`);
  for (const e of errors) console.log(`       - ${e}`);
}
console.log(bad ? `\n${bad} kich ban loi` : "\nTat ca kich ban hop le");
process.exit(bad ? 1 : 0);
