import Image from "next/image";
import { site, classLabel } from "@/config/site";
import { longDate } from "@/lib/format";
import { SEASON } from "@/lib/season";
import { SchoolSketch } from "@/components/shell/SchoolSketch";

export function WelcomeBanner({ name }: { name?: string }) {
  // Christmas uses a light illustration, so the banner gets a white wash and
  // dark text. Otherwise the photo gets a dark wash and light text.
  const light = SEASON === "christmas";
  const greeting = SEASON === "christmas" ? "Merry Christmas," : "Welcome back,";
  const reunion = site.reunionDate
    ? `Reunion ${site.reunionYear} · ${longDate(site.reunionDate)}`
    : `Reunion ${site.reunionYear}`;

  return (
    <section
      aria-labelledby="welcome-heading"
      className={`relative isolate overflow-hidden rounded-panel text-on-dark ${light ? "bg-[#eef2f3] [--on-dark:#1f2a2e] [--on-dark-muted:#3f4d52]" : "bg-gray-900"}`}
    >
      {site.bannerImage ? (
        <>
            <Image
              src={site.bannerImage}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 75vw, 100vw"
              className={`-z-20 object-cover ${light ? "object-[65%_58%]" : "object-[50%_55%]"}`}
            />
            {light ? (
              /* Lighten where the text sits: the top on phones, the left from tablet up */
              <div
                className="absolute inset-0 -z-10 bg-linear-to-b from-white/80 via-white/45 to-transparent md:bg-linear-to-r md:from-white/85 md:via-white/50 md:to-transparent"
                aria-hidden="true"
              />
            ) : (
              <>
                {/* Darken where the text sits (left and bottom) and let the photo show on the right */}
                <div className="absolute inset-0 -z-10 bg-linear-to-r from-gray-950/85 via-gray-950/50 to-gray-950/5" aria-hidden="true" />
                <div className="absolute inset-0 -z-10 bg-linear-to-t from-gray-950/55 via-transparent to-transparent" aria-hidden="true" />
              </>
            )}
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

      <div className="p-6 sm:p-10">
        <div
          className={`max-w-xl ${light ? "[text-shadow:0_1px_10px_rgb(255_255_255/0.7)]" : "[text-shadow:0_1px_14px_rgb(0_0_0/0.45)]"}`}
        >
          <p className="text-[12px] font-medium tracking-[0.2em] text-on-dark-muted uppercase">{reunion}</p>
          <p className="mt-3 font-serif text-[26px] italic leading-none text-on-dark-muted sm:text-[32px]">{greeting}</p>
          <h1 id="welcome-heading" className="mt-2 font-serif text-[42px] leading-[1.02] font-medium wrap-break-word sm:text-[56px]">
            {name?.trim() || classLabel}
          </h1>
          <p className="mt-3 font-serif text-[18px] italic text-on-dark-muted sm:text-[20px]">{site.tagline}</p>
        </div>
      </div>
    </section>
  );
}
