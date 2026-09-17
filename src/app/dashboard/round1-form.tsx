"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { beginRound1UploadAction, submitRound1Action, type SubmitState } from "@/lib/actions/team"
import { deckFileError } from "@/lib/validate"
import { Alert, Input, Label } from "@/components/ui"

export function Round1Form() {
  const [state, setState] = useState<SubmitState>({})
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy) return
    const file = fileRef.current?.files?.[0]
    if (!file || file.size === 0) {
      setState({ error: "Choose a file to upload." })
      return
    }
    const fileError = deckFileError(file.name, file.size)
    if (fileError) {
      setState({ error: fileError })
      return
    }

    setBusy(true)
    setState({})
    try {
      setProgress("Starting upload…")
      const begin = await beginRound1UploadAction(file.name, file.size)
      if (!begin.ok) {
        setState({ error: begin.error ?? "Could not start the upload." })
        return
      }

      setProgress(`Uploading ${(file.size / 1048576).toFixed(1)} MB…`)
      const fd = new FormData()
      fd.set("file_name", file.name)
      fd.set("file_size", String(file.size))

      if (begin.signedUrl && begin.path) {
        const up = await fetch(begin.signedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        })
        if (!up.ok) {
          setState({ error: "Upload failed. Check your connection and try again." })
          return
        }
        fd.set("path", begin.path)
      } else {
        setState({ error: "Could not start the upload." })
        return
      }

      setProgress("Verifying file…")
      const result = await submitRound1Action({}, fd)
      setState(result)
      if (result.ok) {
        if (fileRef.current) fileRef.current.value = ""
        router.refresh()
      }
    } catch {
      setState({ error: "Something went wrong during the upload. Try again." })
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {progress ? <Alert tone="info">{progress}</Alert> : null}
      <div>
        <Label htmlFor="file">Pitch deck (.ppt, .pptx or .pdf — max 5 MB)</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".ppt,.pptx,.pdf"
          disabled={busy}
          ref={fileRef}
        />
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
          "Upload deck"
        )}
      </button>
    </form>
  )
}
