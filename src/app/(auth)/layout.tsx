import { site, classLabel } from "@/config/site";
import { Emblem } from "@/components/shell/Emblem";

/*
  Sign-in, 2FA and set-password pages.
  White-to-cream gradient with two faint glows (navy and crest red) so the
  frosted card has something to blur; on a flat color glass reads as a
  plain grey box. Everything sits inside one card so it reads as a single
  unit on phones.
*/
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-linear-to-b from-white via-[#fbf8f1] to-[#f1e9d8] px-4 py-8 sm:py-12">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -top-32 -left-24 size-105nded-full bg-[#1e3a5f]/10 blur-3xl" />
        <div className="absolute -right-24 -bottom-32 size-105 rounded-full bg-[#9b2226]/10 blur-3xl" />
      </div>

      <main className="theme-glass w-full max-w-105 rounded-[22px] border border-white/80 bg-white/60 p-6 shadow-[0_20px_50px_-20px_rgb(60_45_20/0.25)] ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Emblem size={64} />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{site.schoolName}</p>
          <p className="mt-0.5 font-serif text-[28px] leading-tight font-semibold text-ink">{site.className}</p>
          <p className="font-serif text-[17px] italic text-[#9b2226]">{classLabel}</p>
        </div>
        <div className="border-t border-black/10 pt-6">{children}</div>
      </main>

      <p className="mt-5 max-w-105 text-center text-[12px] text-[#5d5442]">
        Private portal. Accounts are created by the reunion organizers.
      </p>
    </div>
  );
}
