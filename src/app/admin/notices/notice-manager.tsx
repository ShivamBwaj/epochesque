"use client"

import { useActionState, useState } from "react"
import {
  saveNoticeAction,
  setNoticePublishedAction,
  deleteNoticeAction,
} from "@/lib/actions/admin"
import type { ActionResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Alert, Badge, Button, Card, Input, Label, Textarea } from "@/components/ui"

type Notice = {
  id: string
  title: string
  text: string
  is_published: boolean
}

export function NoticeManager({ initial }: { initial: Notice[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [state, formAction] = useActionState<ActionResult, FormData>(saveNoticeAction, { ok: false })

  const notices = initial
  const editing = notices.find((n) => n.id === editingId) ?? null
  const formOpen = creating || editing !== null

  const closeForm = () => {
    setCreating(false)
    setEditingId(null)
  }

  return (
    <div className="space-y-6">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}

      {formOpen ? (
        <Card className="p-5">
          <form
            action={async (fd) => {
              await formAction(fd)
              closeForm()
            }}
            className="space-y-4"
          >
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div>
              <Label htmlFor="notice-title">Title</Label>
              <Input id="notice-title" name="title" maxLength={200} defaultValue={editing?.title ?? ""} placeholder="Round 1 deadline extended by 30 minutes" required />
            </div>
            <div>
              <Label htmlFor="notice-text">Text</Label>
              <Textarea id="notice-text" name="text" maxLength={2000} defaultValue={editing?.text ?? ""} placeholder="What teams need to know…" required />
            </div>
            <div className="flex items-center gap-3">
              <SubmitButton pendingText="Saving…">{editing ? "Update notice" : "Create notice"}</SubmitButton>
              <Button type="button" variant="ghost" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button variant="secondary" onClick={() => setCreating(true)}>
          + New notice
        </Button>
      )}

      {notices.length > 0 ? (
        <div className="space-y-3">
          {notices.map((n) => (
            <Card key={n.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{n.title}</p>
                    {n.is_published ? <Badge tone="green">live</Badge> : <Badge tone="slate">draft</Badge>}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">{n.text}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCreating(false)
                      setEditingId(n.id)
                    }}
                  >
                    Edit
                  </Button>
                  <form action={setNoticePublishedAction}>
                    <input type="hidden" name="id" value={n.id} />
                    <input type="hidden" name="published" value={n.is_published ? "false" : "true"} />
                    <SubmitButton variant={n.is_published ? "secondary" : "primary"} size="sm" pendingText="Working…">
                      {n.is_published ? "Unpublish" : "Publish"}
                    </SubmitButton>
                  </form>
                  <form action={deleteNoticeAction}>
                    <input type="hidden" name="id" value={n.id} />
                    <SubmitButton variant="danger" size="sm" confirm="Delete this notice?" pendingText="Deleting…">
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}
