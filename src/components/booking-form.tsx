"use client";

import { useActionState } from "react";
import Link from "next/link";
import { bookAction } from "@/lib/actions";
import { money } from "@/lib/format";
import type { Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BookingForm({
  slug,
  services,
  day,
  readOnly,
  shop,
}: {
  slug: string;
  services: Service[];
  day: string;
  readOnly: boolean;
  shop: string;
}) {
  const [state, action, pending] = useActionState(bookAction, null);
  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">Request received</p>
        <h1 className="mt-2 font-display text-4xl">{state.reference}</h1>
        <p className="mt-3 text-muted-foreground">
          {shop} has the visit. Sign in with the same email to watch it and pay when the work is done.
        </p>
        <Button className="mt-6 h-11" render={<Link href="/login" />}>
          Sign in to the portal
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input name="slug" type="hidden" value={slug} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Service</legend>
        <div className="grid gap-2">
          {services.map((service) => (
            <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 has-checked:border-primary" key={service.id}>
              <span className="flex gap-3">
                <input className="mt-1" name="serviceId" required type="radio" value={service.id} />
                <span>
                  <span className="block font-medium">{service.name}</span>
                  <span className="block text-sm text-muted-foreground">{service.durationMin} min · {service.description}</span>
                </span>
              </span>
              <span className="text-sm tabular-nums">{money(service.priceCents)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled id="name" label="Name" />
        <Labeled id="email" label="Email" type="email" />
        <Labeled id="phone" label="Phone" />
        <Labeled id="address" label="Street address" />
        <Labeled defaultValue={day} id="day" label="Date" type="date" />
        <div className="space-y-1.5">
          <Label htmlFor="window">Arrival window</Label>
          <select className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm" id="window" name="window">
            <option value="morning">Morning, from 8:00</option>
            <option value="afternoon">Afternoon, from 1:00</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">What is going on?</Label>
        <Textarea id="notes" name="notes" placeholder="Upstairs is hot, outdoor unit is humming." />
      </div>
      {readOnly ? <p className="text-sm text-destructive">Demo mode is read-only. Leave the demo to send a real request.</p> : null}
      <Button className="h-12 w-full" data-testid="book-submit" disabled={readOnly || pending} type="submit">
        Request visit
      </Button>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}

function Labeled({ id, label, type = "text", defaultValue }: { id: string; label: string; type?: string; defaultValue?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input className="h-11" defaultValue={defaultValue} id={id} name={id} required={id !== "notes"} type={type} />
    </div>
  );
}
