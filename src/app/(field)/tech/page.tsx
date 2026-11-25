import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatTime } from "@/lib/format";
import { getSession, listJobs } from "@/lib/repo";
import { sameZonedDay } from "@/lib/format";

export const metadata = { title: "Today" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm">Loading jobs…</p>}>
      <Today />
    </Suspense>
  );
}

async function Today() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const now = new Date();
  const jobs = (await listJobs(session)).filter((job) => sameZonedDay(job.windowStart, now));
  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6">
        <h2 className="font-display text-3xl">Nothing on today&apos;s run.</h2>
        <p className="mt-2 text-sm text-muted-foreground">Tomorrow&apos;s work stays on the office board until it lands on this date.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {jobs.map((job) => (
        <li key={job.id}>
          <Link className="block rounded-2xl border border-border bg-card p-4" href={`/tech/${job.id}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{formatTime(job.windowStart)}</p>
              <StatusBadge status={job.status} />
            </div>
            <p className="mt-2 text-lg font-medium">{job.customerName}</p>
            <p className="text-sm text-muted-foreground">{job.title}</p>
            <p className="mt-1 text-sm">{job.address}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
