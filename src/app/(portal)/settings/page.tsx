import { redirect } from "next/navigation";

/* Only security settings exist for now. Profile settings arrive with the directory (Phase 2). */
export default function SettingsPage() {
  redirect("/settings/security");
}

export const instant = false; // reads the session; blocks on the server by design (see (portal)/layout.tsx)
