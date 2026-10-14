import { site, classLabel } from "@/config/site";
import { Emblem } from "@/components/shell/Emblem";
import { SchoolSketch } from "@/components/shell/SchoolSketch";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-brand-ink px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(110%_90%_at_80%_0%,var(--brand)_0%,var(--brand-ink)_62%)]" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 -z-10 mx-auto max-w-3xl opacity-60" aria-hidden="true">
        <SchoolSketch />
      </div>

      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <Emblem size={48} />
          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-on-dark-muted">{site.schoolName}</p>
          <p className="mt-1 font-serif text-[28px] leading-tight font-semibold text-on-dark">{site.className}</p>
          <p className="font-serif text-[17px] italic text-accent">{classLabel}</p>
        </div>
        <main className="rounded-panel bg-panel p-6 shadow-2xl shadow-black/30 sm:p-8">{children}</main>
        <p className="mt-6 text-center text-[12px] text-on-dark-muted">
          Private portal. Accounts are created by the reunion organizers.
        </p>
      </div>
    </div>
  );
}
