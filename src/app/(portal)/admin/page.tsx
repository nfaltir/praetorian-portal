import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Staff Admin" };

export default function Page() {
  return <ComingSoon title="Staff Admin" planned="steps 2 and 3" />;
}
