"use client"

import { useRef, useState } from "react"
import { beginGalleryUploadAction, galleryUploadAction } from "@/lib/actions/admin"
import type { ActionResult } from "@/lib/actions/admin"
import { Alert, Card, Input, Label } from "@/components/ui"

export function GalleryUpload() {
  const [state, setState] = useState<ActionResult>({ ok: false })
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const filesRef = useRef<HTMLInputElement>(null)
  const captionRef = useRef<HTMLInputElement>(null)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy) return
    const files = Array.from(filesRef.current?.files ?? []).filter((f) => f.size > 0)
    if (files.length === 0) {
      setState({ ok: false, error: "Choose at least one image." })
      return
    }
    if (files.length > 20) {
      setState({ ok: false, error: "Max 20 images per upload." })
      return
    }

    setBusy(true)
    setState({ ok: false })
    try {
      const paths: string[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProgress(`Uploading ${i + 1}/${files.length} (${(file.size / 1048576).toFixed(1)} MB)…`)
        const begin = await beginGalleryUploadAction(file.name, file.size)
        if (!begin.ok || !begin.signedUrl || !begin.path) {
          setState({ ok: false, error: begin.error ?? "Could not start an upload." })
          return
        }
        const up = await fetch(begin.signedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "image/jpeg" },
        })
        if (!up.ok) {
          setState({ ok: false, error: `Upload of ${file.name} failed. Try again.` })
          return
        }
        paths.push(begin.path)
      }
      setProgress("Saving…")
      const fd = new FormData()
      fd.set("paths", JSON.stringify(paths))
      fd.set("caption", captionRef.current?.value ?? "")
      const result = await galleryUploadAction({ ok: false }, fd)
      setState(result)
      if (result.ok) {
        if (filesRef.current) filesRef.current.value = ""
        if (captionRef.current) captionRef.current.value = ""
      }
    } catch {
      setState({ ok: false, error: "Something went wrong during the upload. Try again." })
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <Card className="p-5 md:p-6">
      <p className="hud-label mb-4">UPLOAD</p>
      <form onSubmit={onSubmit} className="space-y-4">
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
        {progress ? <Alert tone="info">{progress}</Alert> : null}
        <div>
          <Label htmlFor="files">Images (up to 20 at a time, 10 MB each)</Label>
          <Input id="files" name="files" type="file" accept="image/*" multiple required disabled={busy} ref={filesRef} />
        </div>
        <div>
          <Label htmlFor="caption">Caption (optional, applies to all in this batch)</Label>
          <Input id="caption" name="caption" ref={captionRef} maxLength={200} placeholder="Day 1 kickoff" disabled={busy} />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-hover hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
        >
          {busy ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Uploading…
            </>
          ) : (
            "Upload photos"
          )}
        </button>
      </form>
    </Card>
  )
}
