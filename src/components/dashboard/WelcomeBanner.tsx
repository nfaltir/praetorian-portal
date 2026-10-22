import Image from "next/image";
import { site, classLabel } from "@/config/site";
import { longDate } from "@/lib/format";
import { SchoolSketch } from "@/components/shell/SchoolSketch";
import { Countdown } from "./Countdown";

export function WelcomeBanner() {
  return (
    <section
      aria-labelledby="welcome-heading"
      className="relative isolate overflow-hidden rounded-panel bg-gray-900 text-on-dark"
    >
      {site.bannerImage ? (
        <>
            <Image src={site.bannerImage} alt="" fill priority sizes="(min-width: 1024px) 75vw, 100vw" className="-z-20 object-cover object-[50%_55%]" />
            {/* Darken where the text sits (left and bottom) and let the photo show on the right */}
            <div className="absolute inset-0 -z-10 bg-linear-to-r from-gray-950/85 via-gray-950/50 to-gray-950/5" aria-hidden="true" />
            <div className="absolute inset-0 -z-10 bg-linear-to-t from-gray-950/55 via-transparent to-transparent" aria-hidden="true" />
        </>
      ) : (
        /* Drawn fallback when no photo is configured */
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-linear-to-b from-gray-900 to-gray-600" />
          <div className="absolute inset-0 opacity-[0.06] bg-[repeating-linear-gradient(135deg,var(--on-dark)_0_1px,transparent_1px_14px)]" />
          <div className="absolute right-[-4%] bottom-[-6%] w-[62%] max-w-140 opacity-70">
            <SchoolSketch />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8 p-6 sm:p-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl [text-shadow:0_1px_14px_rgb(0_0_0/0.45)]">
          <p className="font-serif text-[26px] italic leading-none text-on-dark-muted sm:text-[32px]">Welcome back,</p>
          <h1 id="welcome-heading" className="mt-2 font-serif text-[42px] leading-[1.02] font-medium sm:text-[56px]">
            {classLabel}
          </h1>
          <p className="mt-3 font-serif text-[18px] italic text-on-dark-muted sm:text-[20px]">{site.tagline}</p>
        </div>

        <div className="rounded-control border border-white/10 bg-black/30 px-5 py-4 backdrop-blur-sm md:min-w-72.5">
          <p className="font-serif text-[19px] text-on-dark">Reunion {site.reunionYear}</p>
          {site.reunionDate ? (
            <div className="mt-3">
              <Countdown targetIso={site.reunionDate} />
              <p className="mt-3 text-[12px] text-on-dark-muted">{longDate(site.reunionDate)}</p>
            </div>
          ) : (
            <p className="mt-1.5 text-[14px] text-on-dark-muted">Date to be announced</p>
          )}
        </div>
      </div>
    </section>
  );
}
