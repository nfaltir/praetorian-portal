import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return <ComingSoon title="Messages" planned="step 6" />;
}
