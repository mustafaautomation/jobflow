import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { confirmPayFormAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { getCheckout, getSession } from "@/lib/repo";

export const metadata = { title: "Pay" };

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<p className="p-8 text-sm">Opening checkout…</p>}>
      <Pay params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Pay({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const { sessionId } = await params;
  const query = await searchParams;
  const found = await getCheckout(session, sessionId);
  if (!found) {
    return <main className="mx-auto max-w-md p-8"><p>This checkout is not available on your account.</p></main>;
  }
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-3xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Stripe test mode · mock</p>
        <h1 className="mt-2 font-display text-4xl">{found.job.tenantName}</h1>
        <p className="mt-2">{found.job.serviceName}</p>
        <p className="mt-4 text-3xl tabular-nums">{money(found.checkout.amountCents)}</p>
        <label className="mt-6 block text-sm">
          Card number
          <input className="mt-1 h-11 w-full rounded-lg border border-input bg-muted px-3" readOnly value="4242 4242 4242 4242" />
        </label>
        {query.error ? <p className="mt-3 text-sm text-destructive">{query.error}</p> : null}
        <form action={confirmPayFormAction} className="mt-6">
          <input name="sessionId" type="hidden" value={found.checkout.id} />
          <Button className="h-12 w-full" data-testid="mock-pay" disabled={session.demo} type="submit">
            Pay {money(found.checkout.amountCents)}
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">No card is charged. With STRIPE_SECRET_KEY this screen is replaced by Stripe Checkout.</p>
      </div>
    </main>
  );
}
