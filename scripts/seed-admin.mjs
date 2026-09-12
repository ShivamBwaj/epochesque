import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) });

// Creates (or repairs) the admin auth user + public.admins row.
// Credentials come from E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD in .env.local
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

if (!url || !serviceKey || !email || !password) {
  console.error("Missing env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD)");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// find existing admin user
const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
let user = existing?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (user) {
  // ensure password matches env (idempotent re-run)
  const { error: pwdErr } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    ban_duration: "none",
  });
  if (pwdErr) {
    console.error("failed to update admin password:", pwdErr.message);
    process.exit(1);
  }
  console.log("admin user updated:", user.id);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "admin" },
  });
  if (error) {
    console.error("failed to create admin user:", error.message);
    process.exit(1);
  }
  user = data.user;
  console.log("admin user created:", user.id);
}

const { error: adminRowErr } = await admin.from("admins").upsert(
  { user_id: user.id, email: email.toLowerCase() },
  { onConflict: "user_id" }
);
if (adminRowErr) {
  console.error("failed to insert admins row:", adminRowErr.message);
  process.exit(1);
}
console.log("admins row ok ->", email);
