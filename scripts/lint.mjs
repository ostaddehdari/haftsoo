import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignored = new Set([".git", "node_modules", ".nuxt", ".output", "dist", "coverage"]);
const extensions = new Set([".js", ".mjs", ".ts", ".vue", ".json", ".go", ".yml", ".yaml"]);
const failures = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    if (ignored.has(name)) continue;
    const file = path.join(directory, name);
    if (statSync(file).isDirectory()) walk(file);
    else if (extensions.has(path.extname(file))) inspect(file);
  }
}

function inspect(file) {
  const relative = path.relative(root, file);
  const content = readFileSync(file, "utf8");
  if (content.includes("\r\n")) failures.push(`${relative}: CRLF line endings`);
  if (/\t/.test(content) && path.extname(file) !== ".go") failures.push(`${relative}: tab indentation`);
  if (path.extname(file) === ".json") {
    try { JSON.parse(content); } catch (error) { failures.push(`${relative}: ${error.message}`); }
  }
  const unresolvedMarkers = new RegExp(`\\b(${["TO", "DO"].join("")}|${["FIX", "ME"].join("")})\\b`);
  if (unresolvedMarkers.test(content)) failures.push(`${relative}: unresolved work marker`);
}

walk(root);
if (failures.length) {
  console.error("Lint failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Lint passed: source conventions and JSON syntax are valid.");
