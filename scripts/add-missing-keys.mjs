import fs from "fs";
import path from "path";

const enPath = "locales/en.default.json";
const missingPath = "/tmp/liquid_keys.txt";

if (!fs.existsSync(enPath)) throw new Error("Missing en.default.json");
if (!fs.existsSync(missingPath)) throw new Error("Missing /tmp/liquid_keys.txt");

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const missing = fs
  .readFileSync(missingPath, "utf8")
  .split("\n")
  .map(l => l.trim().replace(/^'+|'+$/g, ""))
  .filter(Boolean);

function setDeep(obj, keys, val) {
  let o = obj;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) o[k] = o[k] ?? val;
    else o[k] = o[k] || {};
    o = o[k];
  });
}

for (const key of missing) setDeep(en, key.split("."), "");

fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
console.log(`✅ Added ${missing.length} missing keys to ${enPath}`);
