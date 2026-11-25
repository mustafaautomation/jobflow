import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatWhen } from "@/lib/format";
import { getSession, listMessages } from "@/lib/repo";

export const metadata = { title: "Messages" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the log…</p>}>
      <Messages />
    </Suspense>
  );
}

async function Messages() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const messages = await listMessages(session);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl">Email and SMS log</h1>
        <p className="text-muted-foreground">Nothing leaves the building. Assignment, booking, reminder, and receipt messages are mocked.</p>
      </div>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
        </TabsList>
        {(["all", "email", "sms"] as const).map((channel) => {
          const rows = messages.filter((item) => channel === "all" || item.channel === channel);
          return (
            <TabsContent className="mt-4" key={channel} value={channel}>
              {rows.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">No {channel} messages yet.</p>
              ) : (
                <ul className="space-y-3">
                  {rows.map((item) => (
                    <li className="rounded-2xl border border-border bg-card p-4" key={item.id}>
                      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                        <span>{item.channel} · {item.kind}</span>
                        <span>{formatWhen(item.createdAt)}</span>
                      </div>
                      <p className="mt-2 font-medium">{item.subject}</p>
                      <p className="text-sm text-muted-foreground">To {item.to}</p>
                      <p className="mt-2 text-sm">{item.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
