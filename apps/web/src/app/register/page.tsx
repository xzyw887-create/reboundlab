import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthPageShell } from "@/components/AuthPageShell";
import { emailPasswordAuthEnabled } from "@/lib/emailPasswordAuth";

function AuthLoading() {
  return (
    <AuthPageShell>
      <p className="text-muted text-sm">…</p>
    </AuthPageShell>
  );
}

export default function RegisterPage() {
  if (!emailPasswordAuthEnabled()) {
    redirect("/login");
  }

  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
