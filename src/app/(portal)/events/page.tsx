import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Events" };

export default function Page() {
  return <ComingSoon title="Events" planned="step 5" />;
}
