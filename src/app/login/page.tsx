import { Suspense } from "react";
import { connection } from "next/server";
import { Logo } from "@/components/logo";
import { LoginPanel } from "@/components/forms";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { loginDirectory } from "@/lib/repo";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Loading workspaces…</p>}>
      <LoginScreen />
    </Suspense>
  );
}

async function LoginScreen() {
  await connection();
  const users = loginDirectory();
  const supabase = isSupabaseConfigured();
  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
      <div>
        <Logo />
        <h1 className="mt-6 font-display text-5xl">Pick up the board.</h1>
        <p className="mt-4 text-muted-foreground">
          {supabase
            ? "This workspace is connected to Supabase. Sign in with the email and password created for that project."
            : "Mock mode signs you in by work email. No password is stored. Cedar HVAC, Summit Plumbing, and the platform admin are ready."}
        </p>
      </div>
      <div className="rounded-3xl border border-border bg-card p-5">
        <LoginPanel supabase={supabase} users={users} />
      </div>
    </main>
  );
}
