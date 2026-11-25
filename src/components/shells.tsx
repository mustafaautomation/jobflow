"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { logoutAction } from "@/lib/actions";
import type { Session } from "@/lib/types";
import { cn } from "cn";

const officeLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/board", label: "Board" },
  { href: "/calendar", label: "Calendar" },
  { href: "/map", label: "Map" },
  { href: "/catalog", label: "Catalog" },
  { href: "/customers", label: "Customers" },
  { href: "/messages", label: "Messages" },
  { href: "/billing", label: "Billing" },
];

export function OpsShell({
  session,
  today,
  unread,
  shop,
  children,
}: {
  session: Session;
  today: string;
  unread: number;
  shop: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {session.demo ? <DemoBanner /> : null}
      <div className="lg:grid lg:grid-cols-[232px_1fr]">
        <aside className="hidden min-h-dvh flex-col bg-[oklch(0.24_0.035_250)] text-white lg:flex">
          <div className="px-4 py-5">
            <Logo href="/dashboard" tone="light" />
            <p className="mt-4 text-sm text-white/70">{shop}</p>
          </div>
          <Nav links={officeLinks} className="flex-1 px-3" />
          <Account session={session} />
        </aside>
        <div className="min-w-0 pb-24 lg:pb-0">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 lg:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{shop}</p>
              <p className="font-medium">{today}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/notifications" className="rounded-full border border-border px-3 py-1.5 text-sm">
                Alerts{unread ? ` ${unread}` : ""}
              </Link>
              <form action={logoutAction} className="lg:hidden">
                <button className="text-sm underline" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          </header>
          <main className="px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-border bg-card px-2 py-2 lg:hidden">
        {officeLinks.slice(0, 5).map((link) => (
          <MobileLink key={link.href} href={link.href} label={link.label} />
        ))}
      </nav>
    </div>
  );
}

export function FieldShell({
  session,
  today,
  shop,
  children,
}: {
  session: Session;
  today: string;
  shop: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[oklch(0.93_0.02_75)]">
      {session.demo ? <DemoBanner /> : null}
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background shadow-xl">
        <header className="flex items-start justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{shop}</p>
            <h1 className="font-display text-2xl">Today</h1>
            <p className="text-sm text-muted-foreground">{today}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{session.user.name}</p>
            <form action={logoutAction}>
              <button className="text-sm text-muted-foreground underline" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-4 pb-8">{children}</main>
      </div>
    </div>
  );
}

export function PortalShell({
  shop,
  name,
  children,
}: {
  shop: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <Logo href="/portal" />
            <p className="mt-1 text-sm text-muted-foreground">{shop}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{name}</p>
            <form action={logoutAction}>
              <button className="text-sm text-muted-foreground underline" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}

export function DemoBanner() {
  return (
    <div data-testid="demo-banner" className="bg-[oklch(0.24_0.035_250)] px-4 py-2 text-center text-sm text-white">
      Public demo of Cedar HVAC. This workspace is read-only, so assignments, notes, and payments stay put.{" "}
      <Link href="/login" className="underline">
        Enter a working workspace
      </Link>
    </div>
  );
}

function Account({ session }: { session: Session }) {
  return (
    <div className="border-t border-white/10 px-4 py-4">
      <p className="text-sm font-medium">{session.user.name}</p>
      <p className="text-xs capitalize text-white/60">{session.user.role}</p>
      <form action={logoutAction} className="mt-3">
        <button className="text-sm text-white/80 underline" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}

function Nav({ links, className }: { links: { href: string; label: string }[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white",
              active && "bg-white/15 text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "min-w-16 flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
      )}
    >
      {label}
    </Link>
  );
}
