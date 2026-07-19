import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted">Загрузка…</div>}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
