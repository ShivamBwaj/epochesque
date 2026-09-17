// ============================================================
// create-logins-no-email.mjs — some registrations came in with
// no email on file (walk-ins / bad sheet rows), so they can't
// complete the normal /signup flow (reg_no + email match). This
// creates a real Supabase auth account for each of them directly:
// synthetic email `<reg_no>@epochesque.local` + a random password,
// linked via registrations.auth_user_id like a normal signup.
//
// Usage: node scripts/create-logins-no-email.mjs [--apply]
// Without --apply it just lists who would get a login (dry run).
// Prints reg_no / email / password for the desk to hand out.
// ============================================================
import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"
import crypto from "node:crypto"

dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)), quiet: true })

const APPLY = process.argv.includes("--apply")

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function randomPassword() {
  return crypto.randomBytes(6).toString("base64url") // 8 chars, url-safe
}

async function main() {
  const { data: regs, error } = await admin
    .from("registrations")
    .select("id, reg_no, name, email, auth_user_id")
    .is("auth_user_id", null)
    .or("email.is.null,email.eq.")
  if (error) throw error

  if (regs.length === 0) {
    console.log("Nobody needs a login created — everyone without an account has an email on file.")
    return
  }

  console.log(`${regs.length} registration(s) with no email and no account:`)
  const rows = []
  for (const r of regs) {
    const email = `${r.reg_no.toLowerCase()}@epochesque.local`
    const password = randomPassword()
    rows.push({ reg_no: r.reg_no, name: r.name, email, password })
  }

  console.table(rows)

  if (!APPLY) {
    console.log("\nDry run — nothing created. Re-run with --apply to actually create these accounts.")
    return
  }

  console.log("\nCreating accounts...")
  for (const row of rows) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: row.email,
      password: row.password,
      email_confirm: true,
    })
    if (createErr) {
      console.error(`FAILED ${row.reg_no}: ${createErr.message}`)
      continue
    }
    const { error: updateErr } = await admin
      .from("registrations")
      .update({ email: row.email, auth_user_id: created.user.id })
      .eq("reg_no", row.reg_no)
    if (updateErr) {
      console.error(`FAILED to link ${row.reg_no}: ${updateErr.message}`)
      continue
    }
    console.log(`OK ${row.reg_no} -> ${row.email}`)
  }

  console.log("\nDone. Hand each person their reg_no's row (email + password) from the table above.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
