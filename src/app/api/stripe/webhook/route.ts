import { markJobPaidFromWebhook } from "@/lib/repo";
import { paymentsMode } from "@/lib/payments";
import Stripe from "stripe";

export async function POST(request: Request) {
  if (paymentsMode() === "mock" || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ received: true, mode: "mock" });
  }
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature || !process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const jobId = session.metadata?.jobId;
    if (jobId && (session.payment_status === "paid" || session.status === "complete")) {
      await markJobPaidFromWebhook(jobId);
    }
  }
  return Response.json({ received: true });
}
