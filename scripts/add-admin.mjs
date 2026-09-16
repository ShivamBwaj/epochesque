import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) });

// Creates (or repairs) an additional named admin account. Every admin login
// works concurrently from as many devices/browsers as needed (Supabase Auth
// allows multiple simultaneous sessions per user by default) — this script
// exists so each organizer gets their OWN login instead of sharing one,
// which keeps admin_audit meaningful (it records actor_email).
//
// Usage: node scripts/add-admin.mjs someone@epoch.local "a strong password"

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/add-admin.mjs <email> "<password>"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
let user = existing?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (user) {
  const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true, ban_duration: "none" });
  if (error) {
    console.error("failed to update password:", error.message);
    process.exit(1);
  }
  console.log("existing user updated:", user.id);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "admin" },
  });
  if (error) {
    console.error("failed to create user:", error.message);
    process.exit(1);
  }
  user = data.user;
  console.log("user created:", user.id);
}

const { error: rowErr } = await admin.from("admins").upsert({ user_id: user.id, email: email.toLowerCase() }, { onConflict: "user_id" });
if (rowErr) {
  console.error("failed to insert admins row:", rowErr.message);
  process.exit(1);
}

console.log(`admin ready: ${email}`);
