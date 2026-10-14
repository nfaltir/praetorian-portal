import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-content-center gap-3 p-6 text-center">
      <p className="font-serif text-[40px] font-semibold">Page not found</p>
      <p className="text-muted">That page does not exist in the portal.</p>
      <Link href="/" className="font-medium text-brand hover:underline">Back to Home</Link>
    </main>
  );
}
