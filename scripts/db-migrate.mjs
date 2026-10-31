#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const migrationDirectory = path.join(root, "database/migrations");
const command = process.argv[2] ?? "status";
const validCommands = new Set(["up", "down", "status"]);
if (!validCommands.has(command)) throw new Error(`unknown migration command: ${command}`);

function databaseEnvironment() {
  const environment = { ...process.env, PGCONNECT_TIMEOUT: process.env.PGCONNECT_TIMEOUT ?? "5" };
  const urlFile = process.env.HAFTSOO_DATABASE_URL_FILE ?? process.env.DATABASE_URL_FILE;
  const connection = process.env.DATABASE_URL ?? (urlFile && existsSync(urlFile) ? readFileSync(urlFile, "utf8").trim() : undefined);
  if (connection) environment.PGDATABASE = connection;
  return environment;
}

function psql(sql, tuplesOnly = false) {
  const args = ["--no-psqlrc", "--set", "ON_ERROR_STOP=1"];
  if (tuplesOnly) args.push("--tuples-only", "--no-align");
  const result = spawnSync("psql", args, { env: databaseEnvironment(), input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`psql exited with status ${result.status}`);
  return result.stdout.trim();
}

const trackingSql = `
CREATE TABLE IF NOT EXISTS public.haftsoo_schema_migrations (
  version text PRIMARY KEY,
  checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);`;
psql(trackingSql);

function migrations(direction) {
  return readdirSync(migrationDirectory)
    .filter((name) => name.endsWith(`.${direction}.sql`))
    .sort()
    .map((name) => {
      const sql = readFileSync(path.join(migrationDirectory, name), "utf8");
      return { name, version: name.split("_")[0], sql, checksum: createHash("sha256").update(sql).digest("hex") };
    });
}

function appliedMigrations() {
  const output = psql("SELECT version || E'\\t' || checksum FROM public.haftsoo_schema_migrations ORDER BY version;", true);
  return new Map(output ? output.split("\n").map((line) => line.trim().split("\t")) : []);
}

if (command === "status") {
  const applied = appliedMigrations();
  for (const migration of migrations("up")) {
    const state = applied.has(migration.version) ? (applied.get(migration.version) === migration.checksum ? "applied" : "drift") : "pending";
    console.log(`${migration.version}\t${state}\t${migration.name}`);
  }
  process.exitCode = [...appliedMigrations().entries()].some(([version, checksum]) => {
    const migration = migrations("up").find((entry) => entry.version === version);
    return !migration || migration.checksum !== checksum;
  }) ? 1 : 0;
} else if (command === "up") {
  const applied = appliedMigrations();
  for (const migration of migrations("up")) {
    if (applied.has(migration.version)) {
      if (applied.get(migration.version) !== migration.checksum) throw new Error(`migration drift: ${migration.name}`);
      continue;
    }
    const escapedVersion = migration.version.replaceAll("'", "''");
    psql(`BEGIN;\n${migration.sql}\nINSERT INTO public.haftsoo_schema_migrations (version, checksum) VALUES ('${escapedVersion}', '${migration.checksum}');\nCOMMIT;`);
    console.log(`applied ${migration.name}`);
  }
} else {
  const applied = appliedMigrations();
  const latest = [...applied.keys()].sort().at(-1);
  if (!latest) {
    console.log("no migration to roll back");
  } else {
    const migration = migrations("down").find((entry) => entry.version === latest);
    if (!migration) throw new Error(`missing down migration for ${latest}`);
    psql(`BEGIN;\n${migration.sql}\nDELETE FROM public.haftsoo_schema_migrations WHERE version = '${latest}';\nCOMMIT;`);
    console.log(`rolled back ${migration.name}`);
  }
}
