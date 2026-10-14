import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <ComingSoon title="Settings" planned="step 2" />;
}
