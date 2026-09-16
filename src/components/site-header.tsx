import { getViewer } from "@/lib/auth"
import { SiteNav } from "@/components/site-nav"

export async function SiteHeader() {
  const viewer = await getViewer()
  const role = viewer?.role === "unassigned" ? "team" : (viewer?.role ?? null)

  return (
    <SiteNav
      role={role}
      links={[
        { href: "/speakers", label: "Speakers" },
        { href: "/oc", label: "OC" },
        { href: "/gallery", label: "Gallery" },
      ]}
    />
  )
}
