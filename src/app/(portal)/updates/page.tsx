import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Updates" };

export default function Page() {
  return <ComingSoon title="Updates" planned="step 5" />;
}
