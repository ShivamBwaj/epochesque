// ============================================================
// process-person.mjs — ONE-TIME photo pipeline for people (OC / speakers)
//
//   1. sends the photo to remove.bg (background removed)
//   2. trims empty edges, pads to an exact 4:5 card canvas (person bottom-anchored)
//   3. exports webp, uploads to the Supabase `people` bucket
//   4. upserts the person row (by name + kind) and cleans the old photo
//
// Usage:
//   node scripts/process-person.mjs <photo> --kind oc --name "Aman" \
//        [--role "Ops Lead"] [--tagline "..."] [--tags "a,b"] [--order 5] [--hidden]
//
// Requires REMOVE_BG_API_KEY in .env.local (one-time job; key never deploys).
// ============================================================
import { openAsBlob } from "node:fs"
import path from "node:path"
import sharp from "sharp"
import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) })
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) })

const args = process.argv.slice(2)
const image = args[0]
if (!image) {
  console.error("usage: node scripts/process-person.mjs <photo> --kind oc|speaker --name \"Full Name\" [--role] [--tagline] [--tags] [--order] [--hidden]")
  process.exit(1)
}

const flag = (name, fallback = "") => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const kind = flag("kind", "oc")
const name = flag("name")
if (!["oc", "speaker"].includes(kind)) { console.error("--kind must be oc or speaker"); process.exit(1) }
if (!name) { console.error("--name is required"); process.exit(1) }
const role = flag("role")
const tagline = flag("tagline")
const tags = flag("tags").split(",").map((t) => t.trim()).filter(Boolean)
const order = Number(flag("order", "0")) || 0
const hidden = args.includes("--hidden")

const API_KEY = process.env.REMOVE_BG_API_KEY
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!API_KEY || !SUPA_URL || !SERVICE_KEY) {
  console.error("Missing REMOVE_BG_API_KEY / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const CARD_W = 800
const CARD_H = 1000 // 4:5 — matches the public card aspect

console.log(`→ remove.bg: ${path.basename(image)} (${kind} / ${name})`)
const blob = await openAsBlob(image)
const form = new FormData()
form.append("size", "auto")
form.append("type", "person")
form.append("format", "png")
form.append("image_file", blob, path.basename(image))

const res = await fetch("https://api.remove.bg/v1.0/removebg", {
  method: "POST",
  headers: { "X-Api-Key": API_KEY },
  body: form,
})
if (!res.ok) {
  console.error(`remove.bg failed: ${res.status} ${res.statusText} — ${await res.text()}`)
  process.exit(1)
}
console.log(`  ✓ background removed (credits charged: ${res.headers.get("x-credits-charged") ?? "?"})`)

// Trim transparent margins → fit inside 4:5 → pad centered-left / bottom-anchored
const trimmed = await sharp(Buffer.from(await res.arrayBuffer())).trim().toBuffer()
const fitted = await sharp(trimmed).resize(CARD_W, CARD_H, { fit: "inside" }).toBuffer()
const m = await sharp(fitted).metadata()
const left = Math.max(0, Math.round((CARD_W - (m.width ?? CARD_W)) / 2))
const top = Math.max(0, CARD_H - (m.height ?? CARD_H))
const out = await sharp({ create: { width: CARD_W, height: CARD_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: fitted, left, top }])
  .webp({ quality: 88 })
  .toBuffer()
console.log(`  ✓ cutout cropped to ${CARD_W}x${CARD_H} (4:5), ${(out.length / 1024).toFixed(0)} KB webp`)

const supabase = createClient(SUPA_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const storagePath = `people/${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-cutout.webp`
const { error: upErr } = await supabase.storage.from("people").upload(storagePath, out, { contentType: "image/webp" })
if (upErr) { console.error(`upload failed: ${upErr.message}`); process.exit(1) }
console.log(`  ✓ uploaded to people bucket: ${storagePath}`)

const { data: existing } = await supabase.from("people").select("id, photo_path").eq("kind", kind).eq("name", name).maybeSingle()

const payload = {
  kind,
  name,
  role,
  tagline,
  tags,
  sort_order: order,
  is_published: !hidden,
  photo_path: storagePath,
}

let rowErr
if (existing) {
  ;({ error: rowErr } = await supabase.from("people").update(payload).eq("id", existing.id))
  if (!rowErr && existing.photo_path && existing.photo_path !== storagePath) {
    await supabase.storage.from("people").remove([existing.photo_path]).catch(() => {})
  }
} else {
  ;({ error: rowErr } = await supabase.from("people").insert(payload))
}
if (rowErr) { console.error(`person upsert failed: ${rowErr.message}`); process.exit(1) }

console.log(`✓ ${existing ? "updated" : "added"} ${name} (${kind}) — live on /${kind === "oc" ? "oc" : "speakers"}`)
