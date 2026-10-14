import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserOrNull } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

async function AlreadySignedIn() {
  if (await getCurrentUserOrNull()) redirect("/");
  return null;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <Suspense fallback={null}>
        <AlreadySignedIn />
      </Suspense>
      <Suspense fallback={<LoginForm notice={null} />}>
        <LoginWithNotice searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LoginWithNotice({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const notice = params.done === "setup" ? "Password set. Sign in to continue." : params.done === "reset" ? "Password changed. Sign in with your new password." : null;
  return <LoginForm notice={notice} />;
}
