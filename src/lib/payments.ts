import "server-only";

import Stripe from "stripe";
import { PLANS } from "@/lib/format";
import type { PlanId } from "@/lib/types";

export function paymentsMode(): "stripe" | "mock" {
  return process.env.STRIPE_SECRET_KEY ? "stripe" : "mock";
}

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function createStripeJobCheckout(input: {
  origin: string;
  jobId: string;
  tenantId: string;
  amountCents: number;
  title: string;
  email: string;
}) {
  const client = stripe();
  if (!client) return null;
  const session = await client.checkout.sessions.create({
    mode: "payment",
    customer_email: input.email || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.amountCents,
          product_data: { name: input.title },
        },
      },
    ],
    success_url: `${input.origin}/portal/${input.jobId}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/portal/${input.jobId}?canceled=1`,
    metadata: { jobId: input.jobId, tenantId: input.tenantId, kind: "job" },
  });
  return session.url;
}

export async function createStripePlanCheckout(input: { origin: string; plan: PlanId; tenantId: string; email: string }) {
  const client = stripe();
  if (!client) return null;
  const price = input.plan === "starter" ? process.env.STRIPE_PRICE_STARTER : process.env.STRIPE_PRICE_PRO;
  const session = await client.checkout.sessions.create({
    mode: "subscription",
    customer_email: input.email || undefined,
    line_items: [
      price
        ? { price, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: PLANS[input.plan].priceCents,
              recurring: { interval: "month" },
              product_data: { name: `Jobflow ${PLANS[input.plan].name}` },
            },
          },
    ],
    success_url: `${input.origin}/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/billing?canceled=1`,
    metadata: { plan: input.plan, tenantId: input.tenantId, kind: "plan" },
  });
  return session.url;
}

export async function paidStripeSession(sessionId: string) {
  const client = stripe();
  if (!client) return null;
  const session = await client.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid" && session.status !== "complete") return null;
  return session;
}
