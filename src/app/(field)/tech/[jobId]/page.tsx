import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { NoteForm, PhotoForm } from "@/components/forms";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { statusFormAction } from "@/lib/actions";
import { formatTime } from "@/lib/format";
import { getJob, getSession } from "@/lib/repo";
import type { JobStatus } from "@/lib/types";

export const metadata = { title: "Visit" };

const nextStep: Partial<Record<JobStatus, { status: JobStatus; label: string }>> = {
  scheduled: { status: "en_route", label: "Mark en route" },
  en_route: { status: "on_site", label: "Mark on site" },
  on_site: { status: "complete", label: "Complete job" },
};

export default function Page({ params }: { params: Promise<{ jobId: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm">Loading the visit…</p>}>
      <Visit params={params} />
    </Suspense>
  );
}

async function Visit({ params }: { params: Promise<{ jobId: string }> }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const { jobId } = await params;
  const job = await getJob(session, jobId);
  if (!job) notFound();
  const step = nextStep[job.status];
  return (
    <div className="space-y-5">
      <Link className="text-sm underline" href="/tech">Today</Link>
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-4xl">{job.customerName}</h1>
        <StatusBadge status={job.status} />
      </div>
      <p className="text-lg">{formatTime(job.windowStart)} · {job.title}</p>
      <p>{job.address}</p>
      <a className="inline-flex h-12 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium" href={`https://maps.google.com/?q=${job.lat},${job.lng}`}>
        Navigate
      </a>
      {job.status === "complete" || job.invoiceStatus === "open" ? (
        <p className="rounded-2xl bg-muted p-4 text-sm">Waiting on payment.</p>
      ) : null}
      {job.status === "invoiced" ? <p className="rounded-2xl bg-emerald-50 p-4 text-sm">Paid and invoiced.</p> : null}
      {step ? (
        <form action={statusFormAction}>
          <input name="jobId" type="hidden" value={job.id} />
          <input name="status" type="hidden" value={step.status} />
          <input name="returnTo" type="hidden" value={`/tech/${job.id}`} />
          <Button className="h-14 w-full text-base" disabled={session.demo} type="submit">{step.label}</Button>
        </form>
      ) : null}
      <section className="space-y-2">
        <h2 className="font-medium">Notes</h2>
        {job.notes.map((note) => (
          <p className="rounded-xl bg-muted p-3 text-sm" key={note.id}><span className="font-medium">{note.authorName}. </span>{note.body}</p>
        ))}
        <NoteForm disabled={session.demo} jobId={job.id} />
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">Photos</h2>
        <div className="grid grid-cols-2 gap-2">
          {job.photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="Job photo" className="h-32 w-full rounded-xl object-cover" key={photo.id} src={photo.url} />
          ))}
        </div>
        <PhotoForm disabled={session.demo} jobId={job.id} />
      </section>
    </div>
  );
}
