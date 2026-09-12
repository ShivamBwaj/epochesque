import { getViewer } from "@/lib/auth"
import { SiteNav } from "@/components/site-nav"

export async function SiteHeader() {
  const viewer = await getViewer()

  return (
    <SiteNav
      role={viewer?.role ?? null}
      links={[
        { href: "/speakers", label: "Speakers" },
        { href: "/oc", label: "OC" },
        { href: "/gallery", label: "Gallery" },
        { href: "/leaderboard", label: "Leaderboard" },
      ]}
    />
  )
}
