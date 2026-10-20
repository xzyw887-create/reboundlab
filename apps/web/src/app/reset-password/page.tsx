import { Suspense } from "react";
import { AuthPageShell } from "@/components/AuthPageShell";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthPageShell>
          <p className="text-muted text-sm">…</p>
        </AuthPageShell>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
