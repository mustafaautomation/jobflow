import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-20">
      <h1 className="font-display text-4xl">That page is not on this workspace.</h1>
      <p className="mt-3 text-muted-foreground">The link may belong to another shop, or it never existed.</p>
      <Link className="mt-6 inline-block underline" href="/">Back to Jobflow</Link>
    </main>
  );
}
