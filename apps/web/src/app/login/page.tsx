import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthPageShell } from "@/components/AuthPageShell";

function AuthLoading() {
  return (
    <AuthPageShell>
      <p className="text-muted text-sm">…</p>
    </AuthPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
