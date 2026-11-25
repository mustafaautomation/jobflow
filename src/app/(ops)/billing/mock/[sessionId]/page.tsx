import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { confirmPlanFormAction } from "@/lib/actions";
import { money } from "@/lib/format";
import { getPlanCheckout, getSession } from "@/lib/repo";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Plan checkout" };

export default function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm">Opening checkout…</p>}>
      <MockPlan params={params} />
    </Suspense>
  );
}

async function MockPlan({ params }: { params: Promise<{ sessionId: string }> }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const { sessionId } = await params;
  const checkout = await getPlanCheckout(session, sessionId);
  if (!checkout) {
    return <p>This plan checkout is not on your account.</p>;
  }
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Stripe test mode · mock</p>
      <h1 className="mt-2 font-display text-4xl">{checkout.label}</h1>
      <p className="mt-2 text-2xl tabular-nums">{money(checkout.amountCents)}</p>
      <p className="mt-3 text-sm text-muted-foreground">Card 4242 4242 4242 4242 · any future date · any CVC. No charge is sent.</p>
      <form action={confirmPlanFormAction} className="mt-6">
        <input name="sessionId" type="hidden" value={checkout.id} />
        <Button className="h-12 w-full" disabled={session.demo} type="submit">Confirm plan</Button>
      </form>
    </div>
  );
}
