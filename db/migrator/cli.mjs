#!/usr/bin/env node
/**
 * SQL migration CLI (ESM). Requires DATABASE_URL.
 * Commands: run | status | create <name> | help
 */
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import postgres from "postgres";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "migrations");

function checksum(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

async function ensureMigrationsTable(sql) {
  await sql.unsafe(`
    CREATE SCHEMA IF NOT EXISTS public;
    CREATE TABLE IF NOT EXISTS public._migrations (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function getApplied(sql) {
  const rows = await sql`
    SELECT name, checksum FROM public._migrations ORDER BY name
  `;
  return new Map(rows.map((r) => [r.name, r.checksum]));
}

function listMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql") && !f.endsWith(".down.sql"))
    .sort();
}

function printHelp() {
  console.log(`exact-woo SQL migrations

Usage:
  npm run migrate:run           Apply pending migrations (DATABASE_URL)
  npm run migrate:status        List applied vs pending
  npm run migrate:create <name> Scaffold db/migrations/<timestamp>_<name>.sql (+ .down.sql)
  npm run migrate:help          Show this help

Environment:
  DATABASE_URL   Postgres connection string (Supabase pooler or direct)
`);
}

async function cmdStatus() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const sql = postgres(url, { max: 1 });
  try {
    await ensureMigrationsTable(sql);
    const applied = await getApplied(sql);
    const files = listMigrationFiles();
    console.log("Applied:");
    for (const name of files) {
      if (applied.has(name)) console.log(`  ✓ ${name}`);
    }
    console.log("\nPending:");
    let any = false;
    for (const name of files) {
      if (!applied.has(name)) {
        console.log(`  ○ ${name}`);
        any = true;
      }
    }
    if (!any) console.log("  (none)");
    console.log("\nUnknown applied (not on disk):");
    let unk = false;
    for (const [name] of applied) {
      if (!files.includes(name)) {
        console.log(`  ? ${name}`);
        unk = true;
      }
    }
    if (!unk) console.log("  (none)");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function cmdRun() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const sql = postgres(url, { max: 1 });
  try {
    await ensureMigrationsTable(sql);
    const applied = await getApplied(sql);
    const files = listMigrationFiles();
    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      const content = fs.readFileSync(fullPath, "utf8");
      const cs = checksum(content);
      if (applied.has(file)) {
        if (applied.get(file) !== cs) {
          throw new Error(
            `Checksum mismatch for ${file}: stored ${applied.get(file)} vs file ${cs}`,
          );
        }
        continue;
      }
      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`
          INSERT INTO public._migrations (name, checksum)
          VALUES (${file}, ${cs})
        `;
      });
      console.log("Applied:", file);
    }
    if (files.length === 0) console.log("No migration files found.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function cmdCreate(name) {
  if (!name || String(name).trim() === "") {
    console.error("Usage: migrate:create <name>");
    process.exit(1);
  }
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  const slug = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_|_$/g, "");
  const ts = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const base = `${ts}_${slug}`;
  const up = path.join(migrationsDir, `${base}.sql`);
  const down = path.join(migrationsDir, `${base}.down.sql`);
  if (fs.existsSync(up)) {
    console.error("File already exists:", up);
    process.exit(1);
  }
  fs.writeFileSync(
    up,
    `-- Migration: ${base}\n-- Add your SQL here\n`,
    "utf8",
  );
  fs.writeFileSync(
    down,
    `-- Rollback for ${base} (local dev only)\n`,
    "utf8",
  );
  console.log("Created:", up);
  console.log("Created:", down);
}

const [, , cmd, arg] = process.argv;

switch (cmd) {
  case "run":
    await cmdRun();
    break;
  case "status":
    await cmdStatus();
    break;
  case "create":
    cmdCreate(arg);
    break;
  case "help":
  case undefined:
    printHelp();
    break;
  default:
    console.error("Unknown command:", cmd);
    printHelp();
    process.exit(1);
}
