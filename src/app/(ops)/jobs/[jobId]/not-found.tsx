export default function JobMissing() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8">
      <h1 className="font-display text-3xl">This job is not on this workspace.</h1>
      <p className="mt-2 text-sm text-muted-foreground">It belongs to another shop, or the reference is wrong.</p>
    </div>
  );
}
