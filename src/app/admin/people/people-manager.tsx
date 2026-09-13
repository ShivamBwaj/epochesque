"use client"

import { useActionState, useState } from "react"
import type { Person } from "@/lib/database.types"
import { deletePersonAction, upsertPersonAction } from "@/lib/actions/admin"
import type { ActionResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Alert, Badge, Button, Card, EmptyState, Input, Label, Textarea } from "@/components/ui"

function tagsToString(tags: Person["tags"]): string {
  return Array.isArray(tags) ? tags.filter((t) => typeof t === "string").join(", ") : ""
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function personPhotoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/people/${path}`
}

const fileInputClass =
  "block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-accent-hover"

function PersonSection({
  kind,
  label,
  addLabel,
  people,
}: {
  kind: "speaker" | "oc"
  label: string
  addLabel: string
  people: Person[]
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(upsertPersonAction, { ok: false })
  const [editing, setEditing] = useState<Person | null>(null)
  const rows = people.filter((p) => p.kind === kind)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="hud-label">{label}</p>
        <Badge tone="slate">{rows.length} listed</Badge>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        {rows.length === 0 ? (
          <EmptyState
            icon="◇"
            title={`No ${kind === "oc" ? "committee members" : "speakers"} yet`}
            description={`Add them on the right — they appear on the public ${kind === "oc" ? "Organizing Committee" : "Speakers"} page the moment you save.`}
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="hud-label px-3 py-3">NAME</th>
                    <th className="hud-label px-3 py-3">ROLE</th>
                    <th className="hud-label px-3 py-3">TAGLINE</th>
                    <th className="hud-label px-3 py-3">STATE</th>
                    <th className="hud-label px-3 py-3">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {rows.map((p) => (
                    <tr key={p.id} className="transition hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {p.photo_path ? (
                            <img
                              src={personPhotoUrl(p.photo_path)}
                              alt={p.name}
                              className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                            />
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] font-mono text-[10px] text-muted-foreground">
                              {initials(p.name)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <span className="block max-w-36 truncate font-medium text-foreground" title={p.name}>
                              {p.name}
                            </span>
                            <span className="font-mono text-[11px] text-muted/60">#{p.sort_order}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="block max-w-32 truncate text-xs text-muted-foreground" title={p.role}>
                          {p.role || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="block max-w-44 truncate text-xs text-muted-foreground" title={p.tagline}>
                          {p.tagline || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {p.is_published ? <Badge tone="green">live</Badge> : <Badge tone="slate">hidden</Badge>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" size="sm" onClick={() => setEditing(p)}>
                            Edit
                          </Button>
                          <form action={deletePersonAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <SubmitButton variant="danger" size="sm" confirm={`Delete ${p.name}?`}>
                              Delete
                            </SubmitButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="hud-label">{editing ? `EDIT ${editing.name.toUpperCase()}` : addLabel.toUpperCase()}</p>
            {editing ? (
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            ) : null}
          </div>
          <form key={editing?.id ?? `new-${kind}`} action={formAction} className="space-y-4">
            <input type="hidden" name="kind" value={kind} />
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            {state.error ? <Alert tone="error">{state.error}</Alert> : null}
            {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
            <div>
              <Label htmlFor={`${kind}-photo`}>Photo (shown as a circular pfp — optional)</Label>
              <div className="flex items-center gap-3">
                {editing?.photo_path ? (
                  <img
                    src={personPhotoUrl(editing.photo_path)}
                    alt={editing.name}
                    className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-dashed border-white/[0.12] text-xl text-muted/50">
                    ◇
                  </span>
                )}
                <input
                  id={`${kind}-photo`}
                  type="file"
                  name="photo"
                  accept="image/*"
                  className={fileInputClass}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted/70">.jpg / .png / .webp, max 5 MB. Uploading replaces the current photo.</p>
            </div>
            <div>
              <Label htmlFor={`${kind}-name`}>Name</Label>
              <Input id={`${kind}-name`} name="name" defaultValue={editing?.name ?? ""} required maxLength={120} placeholder="Full name" />
            </div>
            <div>
              <Label htmlFor={`${kind}-role`}>Role</Label>
              <Input
                id={`${kind}-role`}
                name="role"
                defaultValue={editing?.role ?? ""}
                maxLength={120}
                placeholder={kind === "speaker" ? "Staff Engineer · Bengaluru fintech" : "Tech Lead / Convener / Design"}
              />
            </div>
            <div>
              <Label htmlFor={`${kind}-tagline`}>Tagline</Label>
              <Textarea
                id={`${kind}-tagline`}
                name="tagline"
                defaultValue={editing?.tagline ?? ""}
                maxLength={400}
                className="min-h-20"
                placeholder={kind === "speaker" ? "One-liner bio shown on the card." : "Short one-liner shown under the role."}
              />
            </div>
            {kind === "speaker" ? (
              <div>
                <Label htmlFor="speaker-tags">Tags (comma-separated)</Label>
                <Input id="speaker-tags" name="tags" defaultValue={editing ? tagsToString(editing.tags) : ""} maxLength={200} placeholder="ML, LLMs, Open Source" />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`${kind}-order`}>Order</Label>
                <Input id={`${kind}-order`} name="sort_order" type="number" min={0} max={9999} defaultValue={editing?.sort_order ?? rows.length + 1} />
              </div>
              <label className="mt-6 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  name="is_published"
                  defaultChecked={editing ? editing.is_published : true}
                  className="h-4 w-4 rounded border-white/20 bg-surface accent-[#c2703e]"
                />
                Visible on site
              </label>
            </div>
            <SubmitButton pendingText="Saving…">{editing ? "Save changes" : addLabel}</SubmitButton>
          </form>
        </Card>
      </div>
    </section>
  )
}

export function PeopleManager({ people }: { people: Person[] }) {
  return (
    <div className="space-y-12">
      <PersonSection kind="speaker" label="SPEAKERS — /SPEAKERS PAGE" addLabel="Add speaker" people={people} />
      <PersonSection kind="oc" label="ORGANIZING COMMITTEE — /OC PAGE" addLabel="Add OC member" people={people} />
    </div>
  )
}
