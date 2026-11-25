import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking-form";
import { Logo } from "@/components/logo";
import { zonedYmd } from "@/lib/format";
import { getSession, publicCatalog } from "@/lib/repo";
import { TIME_ZONE } from "@/lib/types";

export const metadata = { title: "Request a visit" };

export default function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<p className="p-8 text-sm">Loading services…</p>}>
      <BookScreen params={params} />
    </Suspense>
  );
}

async function BookScreen({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const session = await getSession();
  const catalog = await publicCatalog(slug, session);
  if (!catalog) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Logo />
      <p className="mt-8 text-sm uppercase tracking-[0.16em] text-muted-foreground">{catalog.tenant.trade}</p>
      <h1 className="mt-2 font-display text-5xl">Request {catalog.tenant.name}</h1>
      <p className="mt-3 text-muted-foreground">
        {catalog.tenant.address}. You will get a reference number. In mock mode the confirmation email is logged, not sent.
      </p>
      <div className="mt-8">
        <BookingForm
          day={zonedYmd(new Date(), catalog.tenant.timezone || TIME_ZONE)}
          readOnly={Boolean(session?.demo)}
          services={catalog.services}
          shop={catalog.tenant.name}
          slug={catalog.tenant.slug}
        />
      </div>
      <p className="mt-6 text-sm">
        <Link className="underline" href="/login">Already have a visit? Sign in</Link>
      </p>
    </main>
  );
}
