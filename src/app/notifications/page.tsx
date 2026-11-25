import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readNotificationsAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { formatWhen, homeFor } from "@/lib/format";
import { getSession, listNotifications } from "@/lib/repo";

export const metadata = { title: "Alerts" };

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-sm">Loading alerts…</p>}>
      <Alerts />
    </Suspense>
  );
}

async function Alerts() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const items = await listNotifications(session);
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link className="text-sm underline" href={homeFor(session.user.role)}>Back</Link>
          <h1 className="mt-2 font-display text-4xl">Alerts</h1>
        </div>
        <form action={readNotificationsAction}>
          <Button disabled={session.demo} type="submit" variant="outline">Mark all read</Button>
        </form>
      </div>
      {items.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">You are caught up.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((item) => (
            <li className="rounded-2xl border border-border bg-card p-4" key={item.id}>
              <Link className="font-medium hover:underline" href={item.href}>{item.title}</Link>
              <p className="text-sm text-muted-foreground">{item.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatWhen(item.createdAt)}{item.read ? " · Read" : " · New"}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
