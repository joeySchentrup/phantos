import { useEffect, useState } from "react";
import { errorMessage, fileUrl, listCardArtJobs, saveCardArt, type CardArtJob } from "~/backend/api";
import { makeCardArt } from "~/lib/cardArt";

type Status =
  | { kind: "checking" }
  | { kind: "working"; done: number; total: number; current: string }
  | { kind: "finished"; made: number; failed: { label: string; reason: string }[] }
  | { kind: "error"; message: string };

/** Fetches the original, makes its card art and stores it. */
async function runJob(job: CardArtJob): Promise<void> {
  const response = await fetch(fileUrl(job.record, job.image));
  if (!response.ok) throw new Error(`the image could not be downloaded (HTTP ${response.status})`);
  const art = await makeCardArt(await response.blob());
  await saveCardArt(job.collection, job.record.id, art);
}

/**
 * Runs by itself whenever a DM opens the desk: every image without a WebP
 * card copy — older uploads, the upgrade migration's PNG and JPEG copies,
 * anything uploaded through the admin UI — gets one, one image at a time.
 */
export default function CardArtPanel() {
  const [status, setStatus] = useState<Status>({ kind: "checking" });
  const [round, setRound] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStatus({ kind: "checking" });
      let jobs: CardArtJob[];
      try {
        jobs = await listCardArtJobs();
      } catch (err) {
        if (!cancelled) setStatus({ kind: "error", message: errorMessage(err, "The images could not be checked.") });
        return;
      }

      const failed: { label: string; reason: string }[] = [];
      for (let i = 0; i < jobs.length; i++) {
        // Leaving the desk stops the work between images; the rest waits for next time.
        if (cancelled) return;
        setStatus({ kind: "working", done: i, total: jobs.length, current: jobs[i].label });
        try {
          await runJob(jobs[i]);
        } catch (err) {
          failed.push({ label: jobs[i].label, reason: errorMessage(err, "unknown error") });
        }
      }
      if (!cancelled) setStatus({ kind: "finished", made: jobs.length - failed.length, failed });
    })();

    return () => {
      cancelled = true;
    };
  }, [round]);

  return (
    <section aria-labelledby="card-art-heading" className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="card-art-heading" className="font-heading text-xl font-bold text-[#f4e6c3]">
          Card Art
        </h2>
        <p className="text-sm text-[#c9b78f]" role="status" aria-live="polite">
          {status.kind === "checking" && "Checking the images…"}
          {status.kind === "working" && `Making card copies: ${status.done + 1} of ${status.total}`}
          {status.kind === "finished" &&
            (status.made || status.failed.length
              ? `Made ${status.made} card ${status.made === 1 ? "copy" : "copies"}.`
              : "Every image has its card copy.")}
          {status.kind === "error" && status.message}
        </p>
      </div>
      <p className="mt-1 text-sm text-[#c9b78f]">
        Cards load a small copy of each image, so the lists stay quick; the full image is kept for its own page. New
        images get their copy when you save them. Any image still without one gets it here, automatically.
      </p>

      {status.kind === "working" && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-black/50" aria-hidden="true">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#b9781a] to-[#f2c14e] transition-[width] duration-300"
              style={{ width: `${Math.round((status.done / status.total) * 100)}%` }}
            />
          </div>
          <p className="mt-2 truncate text-sm text-[#e9dbb8]">{status.current}</p>
        </div>
      )}

      {status.kind === "finished" && status.failed.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-[#ffb3a1]">
            {status.failed.length} {status.failed.length === 1 ? "image" : "images"} couldn't be copied; their cards use a
            thumbnail instead.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[#c9b78f]">
            {status.failed.map((failure) => (
              <li key={failure.label}>
                <span className="text-[#f4e6c3]">{failure.label}</span> — {failure.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(status.kind === "error" || (status.kind === "finished" && status.failed.length > 0)) && (
        <button type="button" onClick={() => setRound((n) => n + 1)} className="btn btn-ghost mt-4">
          Try again
        </button>
      )}
    </section>
  );
}
