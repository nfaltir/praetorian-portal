/*
  Class identity and portal settings.
  Every school name, class name and date shown in the UI comes from here.
*/

export const site = {
  schoolName: "Xavier High School",
  className: "Praetorianz",
  graduationYear: 2010,

  /* 1 to 3 letters shown inside the sidebar emblem */
  monogram: "XHS",

  reunionYear: 2030,
  /* Shown publicly on the landing page. Update when the venue is confirmed. */
  reunionPlace: "Chuuk",
  /*
    Exact reunion start, as an ISO string with UTC offset,
    e.g. "2030-08-14T18:00:00+10:00" (Chuuk time).
    Leave null until the date is confirmed: the banner then shows
    "Reunion 2030" with no countdown.
    (Moves to an organizer-editable setting once the database is in.)
  */
  reunionDate: null as string | null,

  /* Time zone used to display every date and time in the portal */
  timeZone: "Pacific/Chuuk", /* UTC+10, no daylight saving */

  tagline: "Competent. Conscientious. Compassionate.",
  sidebarQuote: ["Once a Praetorian.", "Always a Praetorian."],
  footerQuote: [
    "Not just a reunion, but a reconnection",
    "with the people who made our journey special.",
  ],

  /* Optional banner photo in /public, e.g. "/images/banner.jpg". null uses the drawn fallback. */
  bannerImage: "/images/banner.jpg" as string | null,

  /* Credit line in the footer */
  builtBy: "the Praetorianz Tech Team",

  currency: "USD",
  /* Default contribution target per member, in cents */
  defaultTargetCents: 40_000,
} as const;

export const classLabel = `Class of ${site.graduationYear}`;
