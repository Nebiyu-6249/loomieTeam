"use client";

import React, { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createUploadTicket, discardUpload, registerMedia } from "@/app/admin/media/actions";
import { ALLOWED_TYPES, MAX_BYTES, isAllowedType, megabytes, typeNames } from "@/lib/media";

/**
 * One file at a time, uploaded straight to Storage.
 *
 * The bytes do not pass through a Server Action, and that is the whole point:
 * a serverless function cannot carry 8MB, so sending the file through one meant
 * the generic server-error page instead of an upload. Three steps now — ask the
 * server for a ticket, PUT the file to Storage, then record the row — and the
 * only thing that crosses a function is a few hundred bytes of metadata.
 *
 * Everything that can go wrong is caught and shown in this form. A failed
 * upload leaves the page exactly where it was, with a sentence saying what
 * happened and the file still selected.
 *
 * Alt text is asked for here rather than afterwards, because "afterwards" is
 * where descriptions go to not get written.
 */

const ACCEPT = ALLOWED_TYPES.join(",");

type Phase = "idle" | "preparing" | "uploading" | "recording" | "done";

interface Progress {
  loaded: number;
  total: number;
}

/**
 * PUTs the file to the signed URL, reporting progress.
 *
 * XHR rather than fetch, because fetch still cannot report upload progress in
 * any browser this site supports, and an 8MB upload with no feedback reads as a
 * hang. The body shape is the one Supabase Storage expects from a signed
 * upload: multipart, with the file under an empty field name.
 */
function putToStorage(
  signedUrl: string,
  file: File,
  onProgress: (progress: Progress) => void,
  register: (abort: () => void) => void
): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);

    const request = new XMLHttpRequest();
    register(() => request.abort());

    request.open("PUT", signedUrl, true);
    request.setRequestHeader("x-upsert", "false");

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress({ loaded: event.loaded, total: event.total });
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve({ ok: true });
        return;
      }
      // Storage answers with JSON when it can; fall back to the status line.
      let message = `Storage refused the file (${request.status}).`;
      try {
        const parsed = JSON.parse(request.responseText) as { message?: string; error?: string };
        if (parsed.message || parsed.error) message = String(parsed.message ?? parsed.error);
      } catch {
        /* not JSON, keep the status */
      }
      resolve({ ok: false, error: message });
    };

    request.onerror = () =>
      resolve({
        ok: false,
        error: "The connection to Storage failed. Check your network and try again.",
      });
    request.onabort = () => resolve({ ok: false, error: "Upload cancelled." });
    request.ontimeout = () => resolve({ ok: false, error: "The upload timed out." });

    request.send(body);
  });
}

export function MediaUpload() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>({ loaded: 0, total: 0 });
  const [alt, setAlt] = useState("");
  const [chosen, setChosen] = useState<File | null>(null);

  const busy = phase === "preparing" || phase === "uploading" || phase === "recording";

  /** Browser-side checks, so an impossible upload never starts. */
  const inspect = useCallback((file: File): string | null => {
    if (!isAllowedType(file.type)) {
      return `${file.name} is a ${file.type || "file of unknown type"}. Use ${typeNames()}.`;
    }
    if (file.size === 0) return "That file is empty.";
    if (file.size > MAX_BYTES) {
      return `That file is ${megabytes(file.size)}. The limit is ${megabytes(
        MAX_BYTES
      )} — resize it first.`;
    }
    return null;
  }, []);

  const onChoose = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      setChosen(file);
      setPhase("idle");
      setProgress({ loaded: 0, total: 0 });

      if (!file) {
        setError(null);
        setField(null);
        return;
      }

      const complaint = inspect(file);
      setError(complaint);
      setField(complaint ? "file" : null);
    },
    [inspect]
  );

  const onSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (busy) return;

      const file = fileRef.current?.files?.[0];
      if (!file) {
        setError("Choose a file to upload.");
        setField("file");
        return;
      }

      const complaint = inspect(file);
      if (complaint) {
        setError(complaint);
        setField("file");
        return;
      }

      setError(null);
      setField(null);
      setPhase("preparing");

      // 1. A ticket for one path, issued only to an administrator.
      let ticket;
      try {
        ticket = await createUploadTicket({ name: file.name, type: file.type, size: file.size });
      } catch {
        setPhase("idle");
        setError("The server could not be reached. Nothing was uploaded.");
        return;
      }

      if (!ticket.ok) {
        setPhase("idle");
        setError(ticket.error);
        setField(ticket.field ?? null);
        return;
      }

      // 2. The bytes, browser to Storage, never through a function.
      setPhase("uploading");
      setProgress({ loaded: 0, total: file.size });

      const sent = await putToStorage(
        ticket.signedUrl,
        file,
        setProgress,
        (abort) => {
          abortRef.current = abort;
        }
      );
      abortRef.current = null;

      if (!sent.ok) {
        setPhase("idle");
        setError(sent.error);
        return;
      }

      // 3. The row. If this fails the object is removed, so a refusal here
      //    leaves nothing behind.
      setPhase("recording");

      let recorded;
      try {
        recorded = await registerMedia({ path: ticket.path, alt });
      } catch {
        // The bytes are up but we never learned whether the row landed.
        // Discarding is the safe direction: the library shows what it knows
        // about, and an object it does not know about is invisible anyway.
        await discardUpload(ticket.path).catch(() => {});
        setPhase("idle");
        setError("The file uploaded but could not be recorded. It has been removed again.");
        return;
      }

      if (!recorded.ok) {
        setPhase("idle");
        setError(recorded.error);
        return;
      }

      // Both halves are done. Only now is it safe to refresh.
      setPhase("done");
      setAlt("");
      setChosen(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    },
    [alt, busy, inspect, router]
  );

  const percent =
    progress.total > 0 ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : 0;

  const label =
    phase === "preparing"
      ? "Preparing…"
      : phase === "uploading"
        ? `Uploading ${percent}%`
        : phase === "recording"
          ? "Recording…"
          : "Upload";

  return (
    <form onSubmit={onSubmit} className="max-w-2xl border border-border-custom p-6">
      <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary">
        Upload
      </h2>

      <label className="mt-6 block">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
          File
        </span>
        <input
          ref={fileRef}
          type="file"
          name="file"
          required
          disabled={busy}
          accept={ACCEPT}
          onChange={onChoose}
          aria-invalid={field === "file" || undefined}
          aria-describedby="upload-limits"
          className="mt-2 block w-full text-sm text-foreground file:mr-4 file:border file:border-border-custom file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-60"
        />
        <span id="upload-limits" className="mt-2 block text-sm text-foreground-secondary">
          JPEG, PNG, WebP, AVIF or SVG, up to 8MB. The file goes straight from
          this browser to Storage, so a large one is slow rather than refused —
          but resize photographs anyway: the site serves them at a fraction of
          the size and an 8MB original helps nobody.
        </span>
        {/* Said here rather than in a policy document, because this is the
            moment somebody decides what to upload. Row level security governs
            the media *row*; the file itself is served straight from a public
            bucket and stays reachable by URL even after the row is
            unpublished. */}
        <span className="mt-2 block text-sm text-foreground-secondary">
          The bucket is public: once uploaded, the file is readable by anyone
          with its address, and stays readable if you later unpublish or detach
          it. Do not upload anything that should not be.
        </span>
      </label>

      <label className="mt-7 block">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
          Description
        </span>
        <input
          type="text"
          name="alt"
          value={alt}
          disabled={busy}
          maxLength={300}
          onChange={(event) => setAlt(event.target.value)}
          className="mt-2 w-full bg-transparent border border-border-custom px-3 py-2 text-foreground focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-60"
        />
        <span className="mt-2 block text-sm text-foreground-secondary">
          What is in the picture, for anybody who cannot see it. Describe the
          subject, not the file.
        </span>
      </label>

      {/* Progress. A determinate bar while the bytes move, because that is the
          part that takes time and the part somebody will otherwise assume has
          frozen. */}
      {busy ? (
        <div className="mt-7" data-upload-progress={phase}>
          <div
            role="progressbar"
            aria-label="Upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={phase === "uploading" ? percent : undefined}
            className="h-px w-full bg-border-custom"
          >
            <div
              className="h-px bg-foreground transition-[width] duration-200 ease-out"
              style={{ width: phase === "uploading" ? `${percent}%` : "100%" }}
            />
          </div>
          <p className="mt-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
            {phase === "uploading"
              ? `${megabytes(progress.loaded)} of ${megabytes(progress.total)}`
              : phase === "preparing"
                ? "Asking for an upload ticket"
                : "Adding it to the library"}
          </p>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          data-upload-error
          className="mt-6 text-sm leading-snug text-foreground"
        >
          {error}
        </p>
      ) : null}

      {phase === "done" ? (
        <p role="status" data-upload-done className="mt-6 text-sm leading-snug text-foreground">
          Uploaded and added to the library.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || Boolean(field)}
        className="mt-7 text-base text-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
      >
        <span className="border-b border-foreground/40 pb-1 transition-colors duration-300 hover:border-foreground">
          {label}
        </span>
      </button>

      {chosen && !busy && !error ? (
        <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
          {chosen.name} · {megabytes(chosen.size)}
        </p>
      ) : null}
    </form>
  );
}
