import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ignored = new Set([".git", "node_modules", ".nuxt", ".output", "dist", "coverage"]);
const checked = new Set([".css", ".go", ".html", ".js", ".json", ".md", ".mjs", ".ts", ".vue", ".yaml", ".yml"]);
const failures = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    if (ignored.has(name)) continue;
    const file = path.join(directory, name);
    if (statSync(file).isDirectory()) walk(file);
    else if (checked.has(path.extname(file))) {
      const content = readFileSync(file, "utf8");
      if (!content.endsWith("\n")) failures.push(`${file}: missing final newline`);
      if (/[ \t]+$/m.test(content)) failures.push(`${file}: trailing whitespace`);
    }
  }
}

walk(process.cwd());
if (failures.length) {
  console.error("Format check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Format check passed.");
