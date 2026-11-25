"use client";

export default function OpsError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h1 className="font-display text-3xl">The board did not load.</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button className="mt-4 text-sm underline" onClick={reset} type="button">
        Try again
      </button>
    </div>
  );
}
