import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, "..", "supabase", "migrations", "0001_schema.sql");

const sql = readFileSync(migrationPath, "utf8");
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("connected:", process.env.DATABASE_URL.replace(/:[^:@/]+@/, ":****@"));
  await client.query(sql);
  console.log("migration applied:", migrationPath);
} catch (err) {
  console.error("MIGRATION FAILED:", err.message);
  for (const k of ["detail", "hint", "where", "severity", "code", "routine"]) {
    if (err[k]) console.error(`  ${k}:`, err[k]);
  }
  process.exitCode = 1;
} finally {
  await client.end();
}
