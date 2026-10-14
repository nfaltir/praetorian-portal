import { redirect } from "next/navigation";

/* Only security settings exist for now. Profile settings arrive with the directory (Phase 2). */
export default function SettingsPage() {
  redirect("/settings/security");
}
