import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Treasury" };

export default function Page() {
  return <ComingSoon title="Treasury" planned="step 3" />;
}
