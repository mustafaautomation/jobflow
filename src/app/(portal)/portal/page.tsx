import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { checkoutFormAction } from "@/lib/actions";
import { formatWhen, money } from "@/lib/format";
import { getSession, listJobs } from "@/lib/repo";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Your visits" };

export default function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm">Loading visits…</p>}>
      <Visits searchParams={searchParams} />
    </Suspense>
  );
}

async function Visits({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const query = await searchParams;
  const jobs = await listJobs(session);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Your visits</h1>
      {query.error ? <p className="text-sm text-destructive">{query.error}</p> : null}
      {jobs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">No visits on this account yet.</p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li className="rounded-2xl border border-border bg-card p-4" key={job.id}>
              <div className="flex items-center justify-between gap-3">
                <Link className="font-medium hover:underline" href={`/portal/${job.id}`}>{job.title}</Link>
                <StatusBadge status={job.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{formatWhen(job.windowStart)} · {job.technicianName ?? "Awaiting a technician"}</p>
              <p className="mt-2 tabular-nums">{money(job.priceCents)}</p>
              {job.invoiceStatus === "open" ? (
                <form action={checkoutFormAction} className="mt-3">
                  <input name="jobId" type="hidden" value={job.id} />
                  <Button type="submit">Pay now</Button>
                </form>
              ) : null}
              {job.invoiceStatus === "paid" ? <p className="mt-3 text-sm text-emerald-800" data-testid="payment-status">Paid</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
