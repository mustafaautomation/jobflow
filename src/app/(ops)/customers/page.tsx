import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession, listCustomers, listJobs } from "@/lib/repo";

export const metadata = { title: "Customers" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading customers…</p>}>
      <Customers />
    </Suspense>
  );
}

async function Customers() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const [customers, jobs] = await Promise.all([listCustomers(session), listJobs(session)]);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Customers</h1>
      {customers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">No customers on this shop yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Visits</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr className="border-b border-border last:border-0" key={customer.id}>
                  <td className="px-4 py-3 font-medium">{customer.name}</td>
                  <td className="px-4 py-3">{customer.phone}<br />{customer.email}</td>
                  <td className="px-4 py-3">{customer.address}</td>
                  <td className="px-4 py-3">{jobs.filter((job) => job.customerId === customer.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
