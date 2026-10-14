import type { Metadata } from "next";
import { SetupForm } from "./SetupForm";

export const metadata: Metadata = {
  title: "Set your password",
  referrer: "no-referrer",
};

export default function SetupPage() {
  return <SetupForm />;
}
