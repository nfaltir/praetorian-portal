import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Classmates" };

export default function Page() {
  return <ComingSoon title="Classmates" planned="Phase 2" />;
}
