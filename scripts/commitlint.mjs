const message = process.argv.slice(2).join(" ").trim() || process.env.COMMIT_MESSAGE || "";
const conventional = /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9-]+\))?!?: .{3,72}$/;

if (!message) {
  console.error("Usage: npm run commitlint -- \"feat(scope): summary\"");
  process.exit(2);
}
if (!conventional.test(message)) {
  console.error("Commit message must follow Conventional Commits and keep the summary between 3 and 72 characters.");
  process.exit(1);
}
console.log("Commit message is valid.");
