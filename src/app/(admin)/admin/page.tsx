import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { money } from "@/lib/format";
import { getSession, listTenantSummaries } from "@/lib/repo";

export const metadata = { title: "Platform" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm">Loading shops…</p>}>
      <Admin />
    </Suspense>
  );
}

async function Admin() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const tenants = await listTenantSummaries(session);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Shops</h1>
      <p className="text-muted-foreground">Platform view. This account cannot open another tenant&apos;s dispatch board.</p>
      {tenants.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-sm">No shops yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Shop</th>
                <th className="px-4 py-3 font-medium">Trade</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Technicians</th>
                <th className="px-4 py-3 font-medium">Jobs</th>
                <th className="px-4 py-3 font-medium">Open invoices</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr className="border-b border-border last:border-0" key={tenant.id}>
                  <td className="px-4 py-3 font-medium">{tenant.name}</td>
                  <td className="px-4 py-3">{tenant.trade}</td>
                  <td className="px-4 py-3 capitalize">{tenant.plan}</td>
                  <td className="px-4 py-3">{tenant.technicians}</td>
                  <td className="px-4 py-3">{tenant.jobs}</td>
                  <td className="px-4 py-3">{money(tenant.openInvoicesCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
