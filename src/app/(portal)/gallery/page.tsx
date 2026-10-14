import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Gallery" };

export default function Page() {
  return <ComingSoon title="Gallery" planned="Phase 2" />;
}
