import { logoutAction } from "@/lib/actions/auth"
import { Card, SectionHeading } from "@/components/ui"

export function TeamSetup({ registrationName }: { registrationName: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 pt-28 pb-16">
      <div className="w-full max-w-lg">
        <div className="liquid-glass-strong fade-up rounded-2xl p-8">
          <SectionHeading
            kicker="WAITING ROOM"
            title={`Welcome, ${registrationName}`}
            description="You're registered, but not on a team yet. The organizers form teams — check back soon, or ask at the help desk."
          />

          <Card className="mt-6 p-4">
            <p className="hud-label">WHAT HAPPENS NEXT</p>
            <p className="mt-1.5 text-sm text-slate-300">
              An organizer will add you to a team shortly. Once that happens, this page turns into your team
              dashboard automatically — just refresh or log back in.
            </p>
          </Card>

          <form action={logoutAction} className="mt-6">
            <button type="submit" className="block w-full text-center text-xs text-muted-foreground hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
