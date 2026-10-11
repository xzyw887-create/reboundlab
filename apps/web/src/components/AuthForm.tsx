"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { AuthPageShell } from "@/components/AuthPageShell";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { useLocale } from "@/lib/i18n";

interface Props {
  mode: "login" | "register";
}

export function AuthForm({ mode }: Props) {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";
  const nextQuery = `?next=${encodeURIComponent(next)}`;
  const plan = searchParams.get("plan");
  const planQuery = plan ? `&plan=${encodeURIComponent(plan)}` : "";
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";

  return (
    <AuthPageShell>
      <div className="card-pro w-full max-w-md">
        <div className="card-pro-body space-y-5">
          <div className="text-center space-y-2">
            <BrandLogo size="lg" className="mx-auto" />
            <h1 className="title-gradient text-xl">
              {isRegister ? t.auth.registerTitle : t.auth.loginTitle}
            </h1>
          </div>

          {error && (
            <p className="text-sm text-red-300 bg-red-950/40 border border-red-800/50 rounded-xl p-2">
              {error}
            </p>
          )}

          <TelegramLoginButton next={next} onError={setError} />

          <p className="text-center text-sm text-muted">
            {isRegister ? (
              <>
                {t.auth.haveAccount}{" "}
                <Link
                  href={`/login${nextQuery}${planQuery}`}
                  className="text-accent hover:underline"
                >
                  {t.auth.signIn}
                </Link>
              </>
            ) : (
              <>
                {t.auth.noAccount}{" "}
                <Link
                  href={`/register${nextQuery}${planQuery}`}
                  className="text-accent hover:underline"
                >
                  {t.auth.signupCta}
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </AuthPageShell>
  );
}
