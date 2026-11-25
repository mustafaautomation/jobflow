import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { planFormAction, applyStripePlanPayment } from "@/lib/actions";
import { PLANS, money } from "@/lib/format";
import { getSession } from "@/lib/repo";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Billing" };

export default function Page({ searchParams }: { searchParams: Promise<{ error?: string; session_id?: string; upgraded?: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading billing…</p>}>
      <Billing searchParams={searchParams} />
    </Suspense>
  );
}

async function Billing({ searchParams }: { searchParams: Promise<{ error?: string; session_id?: string; upgraded?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const query = await searchParams;
  if (query.session_id) await applyStripePlanPayment(query.session_id);
  const current = session.user.tenantId ? (await import("@/lib/store")).getStore().tenants.find((tenant) => tenant.id === session.user.tenantId) : null;
  const plan = current?.plan ?? "starter";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Shop plan</h1>
        <p className="text-muted-foreground">Current plan: {PLANS[plan].name}. Stripe test mode is used when STRIPE_SECRET_KEY is set. Otherwise checkout is mocked.</p>
      </div>
      {query.error ? <p className="text-sm text-destructive">{query.error}</p> : null}
      {query.upgraded ? <p className="text-sm text-emerald-800">Plan updated.</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((id) => (
          <article className="rounded-2xl border border-border bg-card p-5" key={id}>
            <h2 className="text-xl font-medium">{PLANS[id].name}</h2>
            <p className="mt-2 font-display text-4xl">{money(PLANS[id].priceCents)}<span className="text-base text-muted-foreground">/mo</span></p>
            <p className="mt-3 text-sm text-muted-foreground">{PLANS[id].detail}</p>
            <form action={planFormAction} className="mt-4">
              <input name="plan" type="hidden" value={id} />
              <Button disabled={session.demo || session.user.role !== "owner" || plan === id} type="submit">
                {plan === id ? "Current plan" : `Choose ${PLANS[id].name}`}
              </Button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
