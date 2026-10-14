import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "My Contributions" };

export default function Page() {
  return <ComingSoon title="My Contributions" planned="step 3" />;
}
