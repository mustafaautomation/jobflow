import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ServiceForm } from "@/components/forms";
import { money } from "@/lib/format";
import { getSession, listServices } from "@/lib/repo";

export const metadata = { title: "Catalog" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the catalog…</p>}>
      <Catalog />
    </Suspense>
  );
}

async function Catalog() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const services = await listServices(session);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Service catalog</h1>
        <p className="text-muted-foreground">Duration and price travel with every booking request.</p>
      </div>
      {services.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">No active services yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {services.map((service) => (
            <article className="rounded-2xl border border-border bg-card p-4" key={service.id}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-medium">{service.name}</h2>
                <p className="tabular-nums">{money(service.priceCents)}</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{service.category} · {service.durationMin} min</p>
              <p className="mt-2 text-sm">{service.description}</p>
            </article>
          ))}
        </div>
      )}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">Add a service</h2>
        <div className="mt-4">
          <ServiceForm disabled={session.demo} />
        </div>
      </section>
    </div>
  );
}
