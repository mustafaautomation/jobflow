import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { logoutAction } from "@/lib/actions";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/repo";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-8 text-sm">Loading tenants…</p>}>
      <Frame>{children}</Frame>
    </Suspense>
  );
}

async function Frame({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "superadmin") redirect("/dashboard");
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-border px-4 py-4">
        <Logo href="/admin" />
        <form action={logoutAction}>
          <button className="text-sm underline" type="submit">Sign out</button>
        </form>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
