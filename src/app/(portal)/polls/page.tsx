import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Voting & Polls" };

export default function Page() {
  return <ComingSoon title="Voting & Polls" planned="Phase 2" />;
}
