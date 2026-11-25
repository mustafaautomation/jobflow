export default function Loading() {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="h-28 animate-pulse rounded-2xl bg-muted" key={index} />
      ))}
    </div>
  );
}
