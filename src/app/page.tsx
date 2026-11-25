import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const rows = [
  ["8:00", "Elena Vasquez", "No-cool", "Luis", "En route"],
  ["9:30", "Northloop Dental", "Tune-up", "Priya", "Scheduled"],
  ["10:00", "Chris Patel", "Furnace", "Jonah", "On site"],
  ["1:00", "Helen Cho", "Capacitor", "Unassigned", "Requested"],
];

export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo />
        <nav className="flex items-center gap-4 text-sm">
          <a className="hidden sm:inline" href="#dispatch">Dispatch</a>
          <a className="hidden sm:inline" href="#pricing">Pricing</a>
          <Link href="/login">Sign in</Link>
          <Button className="h-10" render={<Link href="/demo" />}>Open Cedar demo</Button>
        </nav>
      </header>
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-primary">HVAC dispatch, without the group text</p>
            <h1 className="mt-3 font-display text-5xl leading-[1.05] sm:text-6xl">The board your crew actually finishes the day on.</h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Jobflow is field service software for shops that sell time in a truck. Cedar HVAC in Austin is loaded and ready:
              four technicians, a week of calls, and a customer who can pay when the condenser stops screaming.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button className="h-12 px-5" render={<Link href="/demo" />}>Tour Cedar HVAC</Button>
              <Button className="h-12 px-5" render={<Link href="/book/cedar-hvac" />} variant="outline">Request a sample visit</Button>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between px-2 py-2">
              <p className="text-sm font-medium">Cedar HVAC · today</p>
              <p className="text-xs text-muted-foreground">Read-only demo</p>
            </div>
            <ul className="divide-y divide-border">
              {rows.map(([time, name, title, tech, status]) => (
                <li className="grid grid-cols-[64px_1fr_auto] gap-3 px-2 py-3 text-sm" key={name}>
                  <span className="tabular-nums text-muted-foreground">{time}</span>
                  <span>
                    <span className="block font-medium">{name}</span>
                    <span className="text-muted-foreground">{title} · {tech}</span>
                  </span>
                  <span className="text-xs">{status}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="border-y border-border bg-card/60" id="dispatch">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
            {[
              ["Request", "A public page lists duration and price. The customer picks a morning or afternoon window and the job lands unassigned."],
              ["Dispatch", "Drag the card onto Luis, Priya, Jonah, or Amina. They get an in-app alert, and the shop log shows the mocked text and email."],
              ["Collect", "The phone view moves the visit from en route to complete, with a note and a photo. The customer pays a test-mode invoice."],
            ].map(([title, body]) => (
              <article key={title}>
                <h2 className="font-display text-3xl">{title}</h2>
                <p className="mt-3 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 lg:grid-cols-2">
          <article className="rounded-3xl bg-[oklch(0.24_0.035_250)] p-6 text-white">
            <p className="text-sm text-white/70">Technician phone</p>
            <h2 className="mt-2 font-display text-4xl">Today&apos;s run, one thumb.</h2>
            <p className="mt-3 max-w-md text-white/75">Large status buttons, the address, a note, and a camera. No dispatcher chrome on a 390-wide screen.</p>
          </article>
          <article className="rounded-3xl border border-border p-6">
            <p className="text-sm text-muted-foreground">Tenant wall</p>
            <h2 className="mt-2 font-display text-4xl">Summit never sees Cedar.</h2>
            <p className="mt-3 text-muted-foreground">Every job, customer, and photo is scoped to the shop. A Summit Plumbing dispatcher can open the board all day and still not find Elena Vasquez.</p>
          </article>
        </section>
        <section className="mx-auto max-w-6xl px-4 pb-16" id="pricing">
          <h2 className="font-display text-4xl">Starter and Pro, test mode until you say otherwise.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-border p-6">
              <h3 className="text-xl font-medium">Starter</h3>
              <p className="mt-2 font-display text-4xl">$49<span className="text-lg text-muted-foreground">/mo</span></p>
              <p className="mt-3 text-muted-foreground">Booking page, dispatch board, and customer portal for a crew of three.</p>
            </article>
            <article className="rounded-3xl border border-primary bg-card p-6">
              <h3 className="text-xl font-medium">Pro</h3>
              <p className="mt-2 font-display text-4xl">$149<span className="text-lg text-muted-foreground">/mo</span></p>
              <p className="mt-3 text-muted-foreground">Unlimited technicians, reminder queue, map, and AI job summaries. Cedar HVAC is on Pro.</p>
            </article>
          </div>
        </section>
      </main>
      <footer className="border-t border-border px-4 py-8 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 sm:flex-row">
          <p>Jobflow · field service for trades. HVAC is the demo vertical.</p>
          <p>Runs with zero environment variables. Keys turn on Supabase, Stripe, and maps.</p>
        </div>
      </footer>
    </div>
  );
}
