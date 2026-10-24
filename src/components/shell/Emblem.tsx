import Image from "next/image";

/*
  School crest from /public/images. Used in the sidebar, the mobile top bar
  and the sign-in page; each place passes its own size.
  Decorative (alt=""): the school and class name are always written next to it.
  width/height reserve space while it loads; the inline style fixes the
  width and lets height follow the image's real aspect ratio (Tailwind's
  base styles already set height: auto, which triggered Next's warning).
*/
export function Emblem({ size = 44 }: { size?: number }) {
  return (
    <Image
      src="/images/xhs_logo.avif"
      alt=""
      width={size}
      height={Math.round(size * 1.15)}
      style={{ width: size, height: "auto" }}
      className="shrink-0 object-contain"
      priority
    />
  );
}
