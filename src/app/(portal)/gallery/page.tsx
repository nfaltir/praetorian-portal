import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Gallery" };

export default function Page() {
  return <ComingSoon title="Gallery" planned="Phase 2" />;
}

export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)
