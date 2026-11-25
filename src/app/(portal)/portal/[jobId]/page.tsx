import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { applyStripeJobPayment, checkoutFormAction } from "@/lib/actions";
import { formatWhen, money } from "@/lib/format";
import { getJob, getSession } from "@/lib/repo";

export const metadata = { title: "Visit" };

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ session_id?: string; paid?: string; canceled?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-sm">Loading the visit…</p>}>
      <Visit params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Visit({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ session_id?: string; paid?: string; canceled?: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const { jobId } = await params;
  const query = await searchParams;
  if (query.session_id) await applyStripeJobPayment(jobId, query.session_id);
  const job = await getJob(session, jobId);
  if (!job) notFound();
  return (
    <article className="space-y-4">
      <Link className="text-sm underline" href="/portal">All visits</Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-4xl">{job.title}</h1>
        <StatusBadge status={job.status} />
      </div>
      <p>{formatWhen(job.windowStart)}</p>
      <p>{job.address}</p>
      <p>Technician: {job.technicianName ?? "We will assign someone shortly."}</p>
      <p className="text-2xl tabular-nums">{money(job.priceCents)}</p>
      {query.canceled ? <p className="text-sm text-muted-foreground">Checkout canceled. The invoice is still open.</p> : null}
      {job.invoiceStatus === "paid" ? <p className="text-emerald-800" data-testid="payment-status">Paid</p> : null}
      {job.invoiceStatus === "open" ? (
        <form action={checkoutFormAction}>
          <input name="jobId" type="hidden" value={job.id} />
          <Button className="h-12" type="submit">Pay now</Button>
        </form>
      ) : null}
      {job.status === "complete" && job.invoiceStatus === "none" ? <p className="text-sm">Waiting on payment.</p> : null}
    </article>
  );
}
