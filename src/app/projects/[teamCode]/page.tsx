import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getViewer } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventFlags } from "@/lib/settings"
import { Card, EmptyState, LinkButton, Prose, SectionHeading } from "@/components/ui"
import { formatIST as fmt } from "@/lib/format-date"

export const dynamic = "force-dynamic"

async function isAuthorized(teamCode: string): Promise<boolean> {
  const flags = await getEventFlags()
  if (flags.projectsPublished) return true
  const viewer = await getViewer()
  if (!viewer) return false
  if (viewer.role === "admin") return true
  return viewer.role === "team" && viewer.team?.team_code.toUpperCase() === teamCode.toUpperCase()
}

async function getProject(teamCode: string) {
  const admin = createAdminClient()
  const { data } = await admin.from("project_pages_public").select("*").eq("team_code", teamCode.toUpperCase()).maybeSingle()
  return data
}

export async function generateMetadata({ params }: { params: Promise<{ teamCode: string }> }): Promise<Metadata> {
  const { teamCode } = await params
  if (!(await isAuthorized(teamCode))) return { title: "Project" }
  const project = await getProject(teamCode)
  if (!project) return { title: "Project" }
  return {
    title: project.project_title ?? project.team_name,
    description: project.project_description?.slice(0, 160) ?? undefined,
  }
}

export default async function ProjectPage({ params }: { params: Promise<{ teamCode: string }> }) {
  const { teamCode } = await params
  if (!(await isAuthorized(teamCode))) redirect("/login")
  const project = await getProject(teamCode)

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-28 py-12">
        <SectionHeading kicker="PROJECT" title="Not found" description="" />
        <EmptyState icon="◇" title="No project here yet" description="This team hasn't submitted a project page, or the team code is wrong." />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-28 py-12">
      <SectionHeading kicker={project.team_name ?? project.team_code ?? "TEAM"} title={project.project_title ?? "Untitled project"} description="" />
      <Card className="p-6 md:p-8">
        <Prose>
          <p className="whitespace-pre-line">{project.project_description}</p>
        </Prose>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {project.repo_url ? (
            <LinkButton href={project.repo_url} size="sm">
              View repository →
            </LinkButton>
          ) : null}
          <span className="text-xs text-muted/60">Submitted {fmt(project.submitted_at)}</span>
        </div>
      </Card>
    </div>
  )
}
