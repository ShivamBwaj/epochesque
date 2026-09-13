import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

const files = process.argv[2]
  ? [path.resolve(process.argv[2])]
  : readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => path.join(migrationsDir, f));

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("connected:", process.env.DATABASE_URL.replace(/:[^:@/]+@/, ":****@"));
  for (const migrationPath of files) {
    const sql = readFileSync(migrationPath, "utf8");
    try {
      await client.query(sql);
      console.log("migration applied:", path.basename(migrationPath));
    } catch (err) {
      console.error("MIGRATION FAILED:", path.basename(migrationPath), "-", err.message);
      for (const k of ["detail", "hint", "where", "severity", "code", "routine"]) {
        if (err[k]) console.error(`  ${k}:`, err[k]);
      }
      process.exitCode = 1;
      break;
    }
  }
} catch (err) {
  console.error("CONNECT FAILED:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
