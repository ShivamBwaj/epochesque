import { NextResponse } from "next/server"
import { getSessionUser, isAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateParticipationCertificatesBatch } from "@/lib/certificate"

export const maxDuration = 60

// One combined multi-page PDF (page N = registrations[N], alphabetical by
// name) rather than a zip of per-person files — embedding the template image
// once and reusing it across every page is what keeps ~350 certificates
// under a few seconds; generating 350 separate single-file PDFs (each
// re-embedding the image) took over two minutes and would time out.
export async function GET() {
  const user = await getSessionUser()
  if (!user || !(await isAdmin(user.id))) {
    return new NextResponse("Admins only.", { status: 403 })
  }

  const admin = createAdminClient()
  const { data: regs } = await admin.from("registrations").select("reg_no, name").order("name")
  if (!regs || regs.length === 0) {
    return new NextResponse("No registrations found.", { status: 404 })
  }

  const bytes = await generateParticipationCertificatesBatch(regs.map((r) => r.name))

  await admin
    .from("admin_audit")
    .insert({ actor_user_id: user.id, actor_email: user.email ?? "", action: "certificates.download_all", target: `${regs.length} certs`, details: {} as never })
    .then(() => undefined, () => undefined)

  return new NextResponse(Buffer.from(bytes) as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="epochesque-certificates-all.pdf"`,
    },
  })
}
