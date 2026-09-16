import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) });

const [, , filePath] = process.argv;
if (!filePath) {
  console.error("Usage: node scripts/upload-certificate-template.mjs <path-to-template.png>");
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const file = readFileSync(filePath);
const { error } = await admin.storage.from("certificates").upload("participation-template.png", file, {
  contentType: "image/png",
  upsert: true,
});
if (error) {
  console.error("upload failed:", error.message);
  process.exit(1);
}
console.log("uploaded participation-template.png");
