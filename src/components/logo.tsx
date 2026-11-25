import Link from "next/link";
import { cn } from "cn";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#c4622d" />
      <path d="M7 21c3.2-7 6.2-10 9-10s5.8 3 9 10" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11 16.5h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/", tone = "dark" }: { href?: string; tone?: "dark" | "light" }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <Mark />
      <span className={tone === "light" ? "text-white" : "text-foreground"}>Jobflow</span>
    </Link>
  );
}
