import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "node:path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

for (const table of ["submissions", "scores", "teams", "announcements", "people", "gallery_photos", "admin_audit"]) {
  const { error } = await admin.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000")
  console.log(`${table}: ${error?.message ?? "wiped"}`)
}

const { count } = await admin.from("admins").select("user_id", { count: "exact", head: true })
console.log("admins kept:", count)
console.log("PRISTINE DONE")
