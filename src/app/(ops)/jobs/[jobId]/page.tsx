import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { NoteForm, PhotoForm, StatusSelect } from "@/components/forms";
import { summarizeFormAction } from "@/lib/actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatWhen, money } from "@/lib/format";
import { getJob, getSession } from "@/lib/repo";

export const metadata = { title: "Job" };

export default function Page({ params, searchParams }: { params: Promise<{ jobId: string }>; searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the visit…</p>}>
      <JobScreen params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function JobScreen({ params, searchParams }: { params: Promise<{ jobId: string }>; searchParams: Promise<{ error?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const { jobId } = await params;
  const query = await searchParams;
  const job = await getJob(session, jobId);
  if (!job) notFound();
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl">{job.customerName}</h1>
          <StatusBadge status={job.status} />
        </div>
        <p className="text-muted-foreground">{job.reference} · {job.serviceName} · {money(job.priceCents)}</p>
        {query.error ? <p className="text-sm text-destructive">{query.error}</p> : null}
        <p>{job.title}. {job.description}</p>
        <p className="text-sm">{formatWhen(job.windowStart)} – {formatWhen(job.windowEnd)}</p>
        <p className="text-sm">{job.address}</p>
        <p className="text-sm">Technician: {job.technicianName ?? "Unassigned"}</p>
        <a className="text-sm underline" href={`https://maps.google.com/?q=${job.lat},${job.lng}`}>Open in maps</a>
        <div className="max-w-xs">
          <StatusSelect disabled={session.demo} jobId={job.id} status={job.status} />
        </div>
        {job.summary ? (
          <blockquote className="rounded-2xl bg-muted p-4 text-sm">
            {job.summary}
            <footer className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{job.summaryProvider === "mock" ? "Local draft" : job.summaryProvider}</footer>
          </blockquote>
        ) : null}
        <form action={summarizeFormAction}>
          <input name="jobId" type="hidden" value={job.id} />
          <input name="returnTo" type="hidden" value={`/jobs/${job.id}`} />
          <Button disabled={session.demo} type="submit" variant="outline">Summarize notes</Button>
        </form>
      </section>
      <aside className="space-y-6">
        <section>
          <h2 className="font-medium">Notes</h2>
          <ul className="mt-2 space-y-2">
            {job.notes.length === 0 ? <li className="text-sm text-muted-foreground">No notes yet.</li> : job.notes.map((note) => (
              <li className="rounded-xl bg-card p-3 text-sm" key={note.id}>
                <p className="font-medium">{note.authorName}</p>
                <p>{note.body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <NoteForm disabled={session.demo} jobId={job.id} />
          </div>
        </section>
        <section>
          <h2 className="font-medium">Photos</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {job.photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Job photo" className="h-28 w-full rounded-xl object-cover" key={photo.id} src={photo.url} />
            ))}
          </div>
          <div className="mt-3">
            <PhotoForm disabled={session.demo} jobId={job.id} />
          </div>
        </section>
      </aside>
    </div>
  );
}
